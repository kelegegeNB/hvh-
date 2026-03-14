
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { updateBlacklistCache } from "../middleware/ipCheck.js";

const router = Router();
const requireAdminRole = requireRole(["ADMIN"]);

const blacklistInput = z.object({
  ip: z.string().ip(),
  reason: z.string().min(1),
  duration: z.string(), // "1h", "1d", "1w", "1m", "permanent"
  message: z.string().optional()
});

const calculateEndDate = (duration: string): Date | null => {
    const now = new Date();
    switch (duration) {
        case "1h": return new Date(now.getTime() + 60 * 60 * 1000);
        case "1d": return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case "1w": return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case "1m": return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        case "permanent": return null;
        default: return null;
    }
};

// Get Blacklist
router.get("/", requireAdminRole, async (req, res) => {
    const { ip, status } = req.query;
    const where: any = {};
    if (ip) where.ip = { contains: String(ip) };
    if (status) where.status = String(status);

    const items = await prisma.ipBlacklist.findMany({
        where,
        orderBy: { createdAt: "desc" }
    });
    res.json({ items });
});

// Add to Blacklist
router.post("/", requireAdminRole, async (req, res) => {
    const parsed = blacklistInput.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
    }

    const endAt = calculateEndDate(parsed.data.duration);

    const entry = await prisma.ipBlacklist.upsert({
        where: { ip: parsed.data.ip },
        update: {
            reason: parsed.data.reason,
            startAt: new Date(),
            endAt,
            message: parsed.data.message,
            status: "active",
            adminId: req.user?.id
        },
        create: {
            ip: parsed.data.ip,
            reason: parsed.data.reason,
            endAt,
            message: parsed.data.message,
            adminId: req.user?.id
        }
    });

    await updateBlacklistCache(parsed.data.ip);
    
    // Log operation
    await prisma.operationLog.create({
        data: {
            userId: req.user!.id,
            username: req.user!.username,
            action: "ban_ip",
            details: JSON.stringify({ ip: parsed.data.ip, reason: parsed.data.reason, duration: parsed.data.duration }),
            ip: req.ip
        }
    });

    res.json(entry);
});

// Remove from Blacklist (Unban)
router.delete("/:id", requireAdminRole, async (req, res) => {
    const entry = await prisma.ipBlacklist.update({
        where: { id: req.params.id },
        data: { status: "inactive" }
    });
    
    await updateBlacklistCache(entry.ip);

    await prisma.operationLog.create({
        data: {
            userId: req.user!.id,
            username: req.user!.username,
            action: "unban_ip",
            details: JSON.stringify({ ip: entry.ip }),
            ip: req.ip
        }
    });

    res.json(entry);
});

export default router;
