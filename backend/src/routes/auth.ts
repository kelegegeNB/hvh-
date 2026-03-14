import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const router = Router();

const loginInput = z.object({
  username: z.string().min(2),
  password: z.string().min(6)
});

const bootstrapInput = z.object({
  username: z.string().min(2),
  password: z.string().min(6),
  adminKey: z.string().min(6)
});

const jwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("missing_jwt_secret");
  }
  return secret;
};

const signToken = (user: { id: string; role: string; username: string }) => {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, jwtSecret(), { expiresIn: "7d" });
};

router.post("/bootstrap-admin", async (req, res) => {
  const parsed = bootstrapInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  if (parsed.data.adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: "invalid_admin_key" });
  }
  const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) {
    return res.status(409).json({ message: "admin_exists" });
  }
  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      role: "ADMIN",
      passwordHash: hashPassword(parsed.data.password)
    }
  });
  return res.json({ token: signToken(user) });
});

router.post("/login", async (req, res) => {
  const parsed = loginInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid_payload", issues: parsed.error.issues });
  }
  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "invalid_credentials" });
  }

  // Check ban status
  if (user.status === "banned") {
      if (user.banExpires && new Date() > user.banExpires) {
          // Ban expired, reactivate
          await prisma.user.update({
              where: { id: user.id },
              data: { status: "active", banExpires: null }
          });
          // Proceed
      } else {
          return res.status(403).json({ 
              message: "user_banned", 
              expires: user.banExpires 
          });
      }
  } else if (user.status !== "active") {
    return res.status(403).json({ message: "user_disabled" });
  }

  if (!verifyPassword(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ message: "invalid_credentials" });
  }
  return res.json({ token: signToken(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  const payload = req.user!; // req.user is guaranteed by requireAuth
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) {
    return res.status(404).json({ message: "not_found" });
  }
  return res.json({ id: user.id, username: user.username, role: user.role, status: user.status });
});

export default router;
