import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { hashPassword } from "../utils/password.js";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

// Configure storage for custom logos
const customUploadDir = path.join(process.cwd(), "uploads", "custom");
fs.mkdirSync(customUploadDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, customUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `logo_${Date.now()}_${randomUUID().slice(0, 8)}${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("invalid_file_type"));
  }
});

const adInput = z.object({
  title: z.string().min(2),
  imageUrl: z.string().url(),
  linkUrl: z.string().url(),
  position: z.string().min(1),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  status: z.enum(["active", "inactive"]).optional()
});

const adUpdateInput = adInput.partial();

const musicInput = z.object({
  title: z.string().min(2),
  url: z.string().min(1), // Relaxed validation to support <iframe> codes
  status: z.enum(["active", "inactive"]).optional()
});

const musicUpdateInput = musicInput.partial();

const announcementInput = z.object({
  title: z.string().min(2),
  content: z.string().min(2),
  status: z.enum(["active", "inactive"]).optional()
});

const announcementUpdateInput = announcementInput.partial();

const userCreateInput = z.object({
  username: z.string().min(2),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MOD", "USER"]),
  status: z.enum(["active", "disabled"]).optional()
});

const userUpdateInput = z.object({
  role: z.enum(["ADMIN", "MOD", "USER"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  password: z.string().min(6).optional()
});

const configInput = z.object({
  key: z.string().min(1),
  value: z.string()
});

const reorderInput = z.object({
  items: z.array(z.object({
    id: z.string(),
    sortOrder: z.number()
  }))
});

const complaintUpdateInput = z.object({
  status: z.enum(["pending", "processing", "resolved"]),
  result: z.string().optional()
});

const router = Router();
const requireAdminRole = requireRole(["ADMIN"]);
const requireModerationRole = requireRole(["ADMIN", "MOD"]);

async function logOperation(req: any, action: string, details: any) {
  try {
    const userId = req.user?.id;
    const username = req.user?.username;
    let ip = req.ip ?? "unknown";
    ip = ip.replace(/^::ffff:/, ""); // Normalize IPv4
    
    if (!userId || !username) return;
    await prisma.operationLog.create({
      data: {
        userId,
        username,
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ip
      }
    });
  } catch (e) {
    console.error("Failed to log operation:", e);
  }
}

router.get("/logs", requireAdminRole, async (req, res) => {
  const { admin, action, startDate, endDate } = req.query;
  const where: any = {};
  
  if (admin) where.username = { contains: String(admin) };
  if (action) where.action = { contains: String(action) };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) where.createdAt.lte = new Date(String(endDate));
  }

  const items = await prisma.operationLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json({ items });
});

router.get("/user-logs", requireAdminRole, async (req, res) => {
  const { username, action, ip, startDate, endDate } = req.query;
  const where: any = {};

  if (username) where.username = { contains: String(username) };
  if (action) where.action = { contains: String(action) };
  if (ip) where.ip = { contains: String(ip) };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) where.createdAt.lte = new Date(String(endDate));
  }

  const items = await prisma.userLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json({ items });
});

router.get("/config", requireAdminRole, async (_req, res) => {
  const items = await prisma.systemConfig.findMany();
  res.json({ items });
});

router.put("/config/:key", requireAdminRole, async (req, res) => {
  const parsed = configInput.safeParse({ key: req.params.key, value: req.body.value });
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const config = await prisma.systemConfig.upsert({
    where: { key: parsed.data.key },
    update: { value: parsed.data.value },
    create: { key: parsed.data.key, value: parsed.data.value }
  });
  await logOperation(req, "update_config", { key: parsed.data.key, value: parsed.data.value });
  return res.json(config);
});

router.post("/brand/logo", requireAdminRole, logoUpload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "no_file" });
    
    const type = req.body.type || "main"; // main, inverse, mobile
    const url = `/uploads/custom/${req.file.filename}`;
    
    // Save to SystemConfig
    await prisma.systemConfig.upsert({
        where: { key: `logo_${type}` },
        update: { value: url },
        create: { key: `logo_${type}`, value: url }
    });
    
    await logOperation(req, "update_logo", { type, url });
    res.json({ url });
});

router.post("/users/:id/punish", requireAdminRole, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: "user_not_found" });

    const newCount = user.violationCount + 1;
    let status = user.status;
    let banExpires = user.banExpires;

    if (newCount === 2) {
        status = "banned";
        banExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    } else if (newCount >= 3) {
        status = "banned";
        banExpires = null; // Permanent
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            violationCount: newCount,
            status,
            banExpires
        }
    });

    await logOperation(req, "punish_user", { userId: user.id, level: newCount, status });
    res.json({ message: "punished", level: newCount, status, user: updatedUser });
});

router.get("/promotions", requireAdminRole, async (_req, res) => {
  const items = await prisma.ad.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ items });
});

router.post("/promotions", requireAdminRole, async (req, res) => {
  const parsed = adInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const ad = await prisma.ad.create({
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "active"
    }
  });
  await logOperation(req, "create_promotion", ad);
  return res.status(201).json(ad);
});

router.patch("/promotions/:id", requireAdminRole, async (req, res) => {
  const parsed = adUpdateInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const ad = await prisma.ad.update({ where: { id: req.params.id }, data: parsed.data });
  await logOperation(req, "update_promotion", { id: req.params.id, ...parsed.data });
  return res.json(ad);
});

router.delete("/promotions/:id", requireAdminRole, async (req, res) => {
  await prisma.ad.delete({ where: { id: req.params.id } });
  await logOperation(req, "delete_promotion", { id: req.params.id });
  res.status(204).end();
});

router.get("/music-links", requireAdminRole, async (_req, res) => {
  const items = await prisma.musicLink.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ items });
});

router.post("/music-links", requireAdminRole, async (req, res) => {
  const parsed = musicInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const item = await prisma.musicLink.create({
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "active"
    }
  });
  await logOperation(req, "create_music", item);
  return res.status(201).json(item);
});

router.patch("/music-links/:id", requireAdminRole, async (req, res) => {
  const parsed = musicUpdateInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const item = await prisma.musicLink.update({
    where: { id: req.params.id },
    data: parsed.data
  });
  await logOperation(req, "update_music", { id: req.params.id, ...parsed.data });
  return res.json(item);
});

router.delete("/music-links/:id", requireAdminRole, async (req, res) => {
  await prisma.musicLink.delete({ where: { id: req.params.id } });
  await logOperation(req, "delete_music", { id: req.params.id });
  res.status(204).end();
});

router.get("/reports", requireModerationRole, async (_req, res) => {
  const items = await prisma.report.findMany({ 
    orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
    include: { evidences: true }
  });
  res.json({ items });
});

router.patch("/reports/reorder", requireAdminRole, async (req, res) => {
  const parsed = reorderInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  
  try {
    await prisma.$transaction(
      parsed.data.items.map(item => 
        prisma.report.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder }
        })
      )
    );
    await logOperation(req, "reorder_reports", { count: parsed.data.items.length });
    res.json({ message: "ok" });
  } catch (e) {
    res.status(500).json({ message: "server_error" });
  }
});

router.patch("/reports/:id/approve", requireModerationRole, async (req, res) => {
  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { status: "approved" }
  });
  await logOperation(req, "approve_report", { id: req.params.id });
  return res.json(report);
});

router.patch("/reports/:id/reject", requireModerationRole, async (req, res) => {
  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { status: "rejected" }
  });
  await logOperation(req, "reject_report", { id: req.params.id });
  return res.json(report);
});

router.patch("/reports/:id/hide", requireModerationRole, async (req, res) => {
  const { hidden } = req.body;
  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { isHidden: !!hidden }
  });
  await logOperation(req, hidden ? "hide_report" : "show_report", { id: req.params.id });
  return res.json(report);
});

router.delete("/reports/:id", requireAdminRole, async (req, res) => {
  await prisma.report.delete({ where: { id: req.params.id } });
  await logOperation(req, "delete_report", { id: req.params.id });
  res.status(204).end();
});

router.get("/announcements", requireAdminRole, async (_req, res) => {
  const items = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ items });
});

router.post("/announcements", requireAdminRole, async (req, res) => {
  const parsed = announcementInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const item = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      status: parsed.data.status ?? "active"
    }
  });
  await logOperation(req, "create_announcement", item);
  return res.status(201).json(item);
});

router.patch("/announcements/:id", requireAdminRole, async (req, res) => {
  const parsed = announcementUpdateInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const item = await prisma.announcement.update({
    where: { id: req.params.id },
    data: parsed.data
  });
  await logOperation(req, "update_announcement", { id: req.params.id, ...parsed.data });
  return res.json(item);
});

router.delete("/announcements/:id", requireAdminRole, async (req, res) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  await logOperation(req, "delete_announcement", { id: req.params.id });
  res.status(204).end();
});

router.get("/users", requireAdminRole, async (_req, res) => {
  const items = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, role: true, status: true, createdAt: true }
  });
  res.json({ items });
});

router.post("/users", requireAdminRole, async (req, res) => {
  const parsed = userCreateInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      role: parsed.data.role,
      status: parsed.data.status ?? "active",
      passwordHash: hashPassword(parsed.data.password)
    }
  });
  await logOperation(req, "create_user", { id: user.id, username: user.username });
  return res.status(201).json({
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt
  });
});

router.patch("/users/:id", requireAdminRole, async (req, res) => {
  const parsed = userUpdateInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const data: { role?: Role; status?: string; passwordHash?: string } = {};
  if (parsed.data.role) {
    data.role = parsed.data.role as Role;
  }
  if (parsed.data.status) {
    data.status = parsed.data.status;
  }
  if (parsed.data.password) {
    data.passwordHash = hashPassword(parsed.data.password);
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  await logOperation(req, "update_user", { id: req.params.id, changes: parsed.data });
  return res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt
  });
});

// Visit Logs
router.get("/visit-logs", requireAdminRole, async (req, res) => {
  const { reportId, ip, startDate, endDate, deviceType, exportCsv } = req.query;
  const where: any = {};
  
  if (reportId) where.reportId = String(reportId);
  if (ip) where.viewerIp = { contains: String(ip) };
  if (deviceType) where.deviceType = String(deviceType);
  if (startDate || endDate) {
    where.viewTime = {};
    if (startDate) where.viewTime.gte = new Date(String(startDate));
    if (endDate) where.viewTime.lte = new Date(String(endDate));
  }

  if (exportCsv === 'true') {
     const items = await prisma.exposureViewLog.findMany({
       where,
       orderBy: { viewTime: "desc" },
       take: 100000,
       include: { report: { select: { title: true } } }
     });
     
     const csvHeader = "ID,Exposure Title,Viewer IP,View Time,User Agent,Device Type,OS,Browser\n";
     const csvRows = items.map(item => {
        const title = item.report.title.replace(/"/g, '""');
        return `"${item.id}","${title}","${item.viewerIp}","${item.viewTime.toISOString()}","${item.userAgent}","${item.deviceType}","${item.os}","${item.browser}"`;
     }).join("\n");
     
     res.header("Content-Type", "text/csv");
     res.attachment("visit_logs.csv");
     return res.send(csvHeader + csvRows);
  }

  const items = await prisma.exposureViewLog.findMany({
    where,
    orderBy: { viewTime: "desc" },
    take: 100,
    include: { report: { select: { title: true } } }
  });
  res.json({ items });
});

// Complaints Management
router.get("/complaints", requireModerationRole, async (req, res) => {
    const { status, reportId, startDate, endDate, keyword } = req.query;
    const where: any = {};
    
    if (status) where.status = String(status);
    if (reportId) where.reportId = String(reportId);
    if (keyword) {
        where.OR = [
            { title: { contains: String(keyword) } },
            { description: { contains: String(keyword) } }
        ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const items = await prisma.exposureComplaint.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { report: { select: { title: true } } }
    });
    res.json({ items });
});

router.patch("/complaints/:id", requireModerationRole, async (req, res) => {
    const parsed = complaintUpdateInput.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "invalid_payload" });
    }
    
    const complaint = await prisma.exposureComplaint.update({
        where: { id: req.params.id },
        data: {
            status: parsed.data.status,
            result: parsed.data.result,
            handledBy: req.user?.username,
            handledAt: new Date()
        }
    });
    await logOperation(req, "handle_complaint", { id: req.params.id, status: parsed.data.status });
    res.json(complaint);
});

export default router;
