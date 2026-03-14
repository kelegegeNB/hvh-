
import { Request, Response, NextFunction } from "express";
import { createClient } from "redis";
import { prisma } from "../db.js";

let redisClient: any;

if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on("error", (err: any) => console.error("Redis Client Error", err));
  redisClient.connect().catch(console.error);
}

// Helper to get normalized IP
const getIp = (req: Request) => {
  let ip = req.ip ?? "unknown";
  return ip.replace(/^::ffff:/, "");
};

export const checkIpBlacklist = async (req: Request, res: Response, next: NextFunction) => {
  const ip = getIp(req);
  
  // Skip check for static files, uploads, and health check
  if (req.path.startsWith("/uploads") || req.path.startsWith("/health") || req.method === "OPTIONS") {
    return next();
  }

  // Skip check for Appeal submission (otherwise they can't appeal)
  if (req.path.startsWith("/api/appeals")) {
    return next();
  }
  
  // Skip for admin login/bootstrap to prevent lockout (optional, but safer)
  // Also allow getting system config which might be needed for the appeal page
  if (req.path.startsWith("/api/auth") || req.path.startsWith("/api/system")) {
      return next();
  }

  try {
    // 1. Check Redis First
    if (redisClient && redisClient.isOpen) {
      const cached = await redisClient.get(`blacklist:${ip}`);
      if (cached) {
        const info = JSON.parse(cached);
        return res.status(403).json({
          message: "ip_banned",
          detail: info.message || "您由于多次违反平台规则，已被拉黑",
          reason: info.reason,
          endAt: info.endAt
        });
      }
    }

    // 2. Check Database
    const blacklistEntry = await prisma.ipBlacklist.findUnique({
      where: { ip }
    });

    if (blacklistEntry && blacklistEntry.status === "active") {
      // Check if expired
      if (blacklistEntry.endAt && new Date() > blacklistEntry.endAt) {
        // Expired, update status
        await prisma.ipBlacklist.update({
          where: { id: blacklistEntry.id },
          data: { status: "expired" }
        });
        // Remove from Redis if exists (lazy)
        if (redisClient && redisClient.isOpen) await redisClient.del(`blacklist:${ip}`);
      } else {
        // Active Ban
        // Cache to Redis (TTL = remaining time or 1 hour)
        if (redisClient && redisClient.isOpen) {
            let ttl = 3600;
            if (blacklistEntry.endAt) {
                const diff = Math.floor((blacklistEntry.endAt.getTime() - Date.now()) / 1000);
                if (diff > 0) ttl = Math.min(diff, 3600); // Cache for at most 1 hour to allow updates
            }
            await redisClient.setEx(`blacklist:${ip}`, ttl, JSON.stringify({
                reason: blacklistEntry.reason,
                message: blacklistEntry.message,
                endAt: blacklistEntry.endAt
            }));
        }

        return res.status(403).json({
          message: "ip_banned",
          detail: blacklistEntry.message || "您由于多次违反平台规则，已被拉黑",
          reason: blacklistEntry.reason,
          endAt: blacklistEntry.endAt
        });
      }
    }
  } catch (e) {
    console.error("IP Check Error:", e);
    // Fail open or closed? Fail open to not block users on DB error.
  }

  next();
};

export const updateBlacklistCache = async (ip: string) => {
    if (redisClient && redisClient.isOpen) {
        await redisClient.del(`blacklist:${ip}`);
    }
};
