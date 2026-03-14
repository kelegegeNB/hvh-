import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();
const requireAdminRole = requireRole(["ADMIN"]);

const platformInput = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().url().optional().or(z.literal("")),
  sortOrder: z.number().int().optional()
});

async function logOperation(req: any, action: string, details: any) {
  try {
    const userId = req.user?.id;
    const username = req.user?.username;
    let ip = req.ip ?? "unknown";
    ip = ip.replace(/^::ffff:/, "");
    
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

// Public: Get all platforms
router.get("/", async (_req, res) => {
  const items = await prisma.platform.findMany({
    orderBy: [
        { sortOrder: "desc" },
        { createdAt: "desc" }
    ]
  });
  res.json({ items });
});

// Admin: Create platform
router.post("/", requireAdminRole, async (req, res) => {
  const parsed = platformInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  if (!parsed.data.name) {
      return res.status(400).json({ message: "name_required" });
  }

  // Check uniqueness
  const existing = await prisma.platform.findUnique({
    where: { name: parsed.data.name }
  });
  if (existing) {
    return res.status(409).json({ message: "platform_exists" });
  }

  const platform = await prisma.platform.create({
    data: {
      name: parsed.data.name,
      icon: parsed.data.icon || null,
      sortOrder: parsed.data.sortOrder ?? 0
    }
  });

  await logOperation(req, "create_platform", platform);
  res.status(201).json(platform);
});

// Admin: Update platform
router.patch("/:id", requireAdminRole, async (req, res) => {
    const parsed = platformInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
    }
  
    const platform = await prisma.platform.update({
        where: { id: req.params.id },
        data: parsed.data
    });
  
    await logOperation(req, "update_platform", { id: req.params.id, ...parsed.data });
    res.json(platform);
});

// Admin: Delete platform
router.delete("/:id", requireAdminRole, async (req, res) => {
  const platform = await prisma.platform.findUnique({
    where: { id: req.params.id }
  });

  if (!platform) {
    return res.status(404).json({ message: "not_found" });
  }

  // Check usage in Reports (basic check)
  // Since platform is stored as string "Steam, QQ", we check if the name appears
  const usageCount = await prisma.report.count({
    where: {
      platform: {
        contains: platform.name
      }
    }
  });

  if (usageCount > 0) {
    return res.status(400).json({ 
      message: "platform_in_use", 
      count: usageCount,
      detail: `Cannot delete platform "${platform.name}" because it is used in ${usageCount} reports.` 
    });
  }

  await prisma.platform.delete({ where: { id: req.params.id } });
  await logOperation(req, "delete_platform", { id: req.params.id, name: platform.name });
  res.status(204).end();
});

export default router;
