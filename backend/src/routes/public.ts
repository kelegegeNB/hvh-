import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

router.get("/announcements/active", async (_req, res) => {
  const item = await prisma.announcement.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "desc" }
  });
  res.json({ item: item ?? null });
});

router.get("/announcements", async (_req, res) => {
  const items = await prisma.announcement.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" }
  });
  res.json({ items });
});

router.get("/promotions/active", async (req, res) => {
  const now = new Date();
  
  // Debug log for promotion visibility diagnosis
  console.log(`[Promotion Check] Request from IP: ${req.ip}`);
  console.log(`[Promotion Check] Server Time (UTC): ${now.toISOString()}`);
  
  // RELAXED QUERY: Ignore time constraints, only check status
  const items = await prisma.ad.findMany({
    where: {
      status: "active",
      // startAt: { lte: now },  <-- Removed time checks to ensure visibility
      // endAt: { gte: now }     <-- Removed time checks
    },
    orderBy: { createdAt: "desc" }
  });
  
  console.log(`[Promotion Check] Found ${items.length} active promotions (Time checks disabled).`);

  res.json({ items });
});

router.get("/music-links/active", async (req, res) => {
  const item = await prisma.musicLink.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "desc" }
  });
  
  // Debug log for music
  if (!item) {
      const count = await prisma.musicLink.count({ where: { status: "active" } });
      console.log(`[Music Check] No active music returned. Total active in DB: ${count}`);
  }
  
  res.json({ item: item ?? null });
});

router.get("/config/:key", async (req, res) => {
  const item = await prisma.systemConfig.findUnique({
    where: { key: req.params.key }
  });
  res.json({ value: item?.value ?? "" });
});

router.get("/violators", async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const [items, total] = await prisma.$transaction([
        prisma.ipBlacklist.findMany({
            where: { status: "active" },
            orderBy: { createdAt: "desc" },
            skip,
            take: Number(limit),
            select: {
                ip: true,
                reason: true,
                startAt: true,
                endAt: true
            }
        }),
        prisma.ipBlacklist.count({ where: { status: "active" } })
    ]);

    const maskedItems = items.map(item => ({
        ...item,
        ip: item.ip.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, "$1.$2.*.*")
    }));

    res.json({ items: maskedItems, total });
});

export default router;
