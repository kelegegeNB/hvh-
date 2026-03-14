import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { UAParser } from "ua-parser-js";
import { prisma } from "../db.js";
import { checkRateLimit } from "../utils/rateLimit.js";
import { logger } from "../utils/logger.js";

const reportInput = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  targetName: z.string().min(2),
  targetId: z.string().optional(),
  platform: z.string().min(2),
  publisher: z.string().min(2)
});

const complaintInput = z.object({
  title: z.string().min(1).max(30),
  description: z.string().min(1).max(1000),
  contact: z.string().min(1),
  captchaAnswer: z.string().optional() // Handled in frontend, backend verifies if needed or trust simple logic for now
});

const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const complaintDir = path.join(uploadDir, "complaints", new Date().toISOString().slice(0, 7)); // YYYY-MM
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(complaintDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "complaintImages") {
      cb(null, complaintDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 16) || ".bin";
    cb(null, `${randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("invalid_file_type"));
  }
});

function normalizeIp(ip: string): string {
  return ip.replace(/^::ffff:/, "");
}

function maskIp(ip: string): string {
  if (!ip) return "";
  const cleanIp = normalizeIp(ip);
  if (cleanIp.includes(":")) {
     // IPv6
     const parts = cleanIp.split(":");
     return parts.length > 3 ? parts.slice(0, 3).join(":") + ":*:*:*" : cleanIp;
  }
  // IPv4
  const parts = cleanIp.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return "hidden";
}

const router = Router();

router.get("/", async (req, res) => {
  const sort = req.query.sort as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const query = req.query.q as string | undefined;
  const skip = (page - 1) * limit;

  let orderBy: any = [{ sortOrder: "desc" }, { createdAt: "desc" }];
  
  if (sort === "hot") {
    orderBy = { comments: { _count: "desc" } };
  } else if (sort === "traffic") {
    orderBy = { trafficVolume: "desc" };
  } else if (sort === "combined_hot") {
    orderBy = { hotScore: "desc" };
  }

  const where: any = { 
    status: "approved",
    isHidden: false
  };

  if (query) {
    where.OR = [
      { title: { contains: query } }, // Case-insensitive handled by DB usually if configured, or Prisma default mode needed
      { targetName: { contains: query } },
      { targetId: { contains: query } }
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        _count: { select: { comments: true } }
      }
    })
  ]);

  const maskedItems = items.map(item => ({
    ...item,
    publisherIp: item.publisherIp ? maskIp(item.publisherIp) : null,
  }));

  res.json({ 
    items: maskedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

router.get("/:id", async (req, res) => {
  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: { evidences: true }
  });
  if (!report) {
    return res.status(404).json({ message: "not_found" });
  }
  return res.json({
    ...report,
    publisherIp: report.publisherIp ? maskIp(report.publisherIp) : null
  });
});

router.post("/", upload.array("images", 3), async (req, res) => {
  try {
    const parsed = reportInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
    }

    const ip = req.ip ?? "unknown";

    const rateCheck = await checkRateLimit(ip, 'exposure');
    if (!rateCheck.allowed) {
      return res.status(429).json({ message: rateCheck.message });
    }

    const files = (req.files ?? []) as Express.Multer.File[];
    const evidences = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      type: file.mimetype
    }));
    
    const finalTargetId = parsed.data.targetId && parsed.data.targetId.trim() !== "" 
        ? parsed.data.targetId 
        : null;

    const { publisher, ...reportData } = parsed.data;

    const newReport = await prisma.report.create({
      data: {
        ...reportData,
        targetId: finalTargetId,
        publisherIp: ip,
        status: "pending",
        scoreAvg: 0,
        sortOrder: 0,
        isHidden: false,
        createdBy: {
          connectOrCreate: {
            where: { username: publisher },
            create: { username: publisher }
          }
        },
        evidences: evidences.length ? { create: evidences } : undefined
      }
    });

    try {
      const userAgent = req.headers["user-agent"] ?? "unknown";
      await prisma.userLog.create({
        data: {
          userId: null,
          username: parsed.data.publisher,
          action: "publish_report",
          details: JSON.stringify({ title: parsed.data.title, target: parsed.data.targetName }),
          ip: ip,
          device: userAgent,
          reportId: newReport.id
        }
      });
      logger.info(`Report published: ${newReport.id} by ${ip}`);
    } catch(e) { logger.error("Log error", e); }

    return res.status(201).json(newReport);
  } catch (e) {
    logger.error("Submit report error:", e);
    return res.status(500).json({ message: "server_error", error: String(e) });
  }
});

router.get("/:id/comments", async (req, res) => {
  const items = await prisma.comment.findMany({
    where: { reportId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { user: true, attachments: true }
  });
  res.json({
    items: items.map((item) => ({
      id: item.id,
      content: item.content,
      createdAt: item.createdAt,
      userId: item.userId,
      username: item.user.username,
      attachments: item.attachments.map((att) => ({
        id: att.id,
        url: att.url,
        type: att.type
      }))
    }))
  });
});

router.post("/:id/comments", upload.array("images", 3), async (req, res) => {
  const ip = req.ip ?? "unknown";
  
  const rateCheck = await checkRateLimit(ip, 'comment');
  if (!rateCheck.allowed) {
    return res.status(429).json({ message: rateCheck.message });
  }

  const parsed = z
    .object({
      content: z.string().min(2).max(300),
      username: z.string().min(2).optional()
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const username = parsed.data.username ?? req.header("x-username") ?? "anonymous";
  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username }
  });
  const files = (req.files ?? []) as Express.Multer.File[];
  const attachments = files.map((file) => ({
    url: `/uploads/${file.filename}`,
    type: file.mimetype
  }));
  const comment = await prisma.comment.create({
    data: {
      content: parsed.data.content,
      reportId: req.params.id,
      userId: user.id,
      attachments: attachments.length ? { create: attachments } : undefined
    },
    include: { user: true, attachments: true }
  });

  // Update Hot Score: Comment weight 0.4
  await prisma.report.update({
    where: { id: req.params.id },
    data: { hotScore: { increment: 0.4 } }
  }).catch(e => logger.error("Failed to update hot score for comment", e));

  return res.status(201).json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    userId: comment.userId,
    username: comment.user.username,
    attachments: comment.attachments.map((att) => ({
      id: att.id,
      url: att.url,
      type: att.type
    }))
  });
});

// View Logging Endpoint
router.post("/:id/view", async (req, res) => {
  const ip = req.ip ?? "unknown";
  const uaString = req.headers["user-agent"] ?? "";
  const parser = new UAParser(uaString);
  const result = parser.getResult();

  // Async logging - don't await strictly if performance is key, but for reliability await is fine
  try {
    await prisma.$transaction([
      prisma.report.update({
        where: { id: req.params.id },
        data: { 
            trafficVolume: { increment: 1 },
            hotScore: { increment: 0.6 } // View weight 0.6
        }
      }),
      prisma.exposureViewLog.create({
        data: {
          reportId: req.params.id,
          viewerIp: ip,
          userAgent: uaString,
          deviceType: result.device.type ?? "desktop",
          os: result.os.name,
          browser: result.browser.name
        }
      })
    ]);
    res.json({ ok: true });
  } catch (e) {
    logger.error("View log error", e);
    res.status(500).json({ error: "failed" });
  }
});

// Complaint Endpoint
router.post("/:id/complaints", upload.array("complaintImages", 3), async (req, res) => {
  const ip = req.ip ?? "unknown";

  const rateCheck = await checkRateLimit(ip, 'complaint');
  if (!rateCheck.allowed) {
    return res.status(429).json({ message: rateCheck.message });
  }

  try {
    const parsed = complaintInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
    }

    const files = (req.files ?? []) as Express.Multer.File[];
    // Generate relative path like /uploads/complaints/2024-02/filename
    const month = new Date().toISOString().slice(0, 7);
    const images = files.map((file) => `/uploads/complaints/${month}/${file.filename}`);

    const complaint = await prisma.exposureComplaint.create({
      data: {
        reportId: req.params.id,
        title: parsed.data.title,
        description: parsed.data.description,
        contact: parsed.data.contact,
        images: JSON.stringify(images),
        complainantIp: ip,
        status: "pending"
      }
    });

    logger.info(`Complaint filed for report ${req.params.id}`);
    res.status(201).json(complaint);
  } catch (e) {
    logger.error("Complaint error", e);
    res.status(500).json({ message: "server_error" });
  }
});

export default router;
