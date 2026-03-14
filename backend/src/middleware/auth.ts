import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type AuthPayload = {
  sub: string;
  role: string;
  username: string;
};

const jwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("missing_jwt_secret");
  }
  return secret;
};

const parseToken = (req: Request) => {
  const header = req.header("authorization") || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }
  return token;
};

const getPayload = (req: Request) => {
  const token = parseToken(req);
  if (!token) {
    return null;
  }
  return jwt.verify(token, jwtSecret()) as AuthPayload;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = getPayload(req);
    if (!payload) {
      return res.status(401).json({ message: "unauthorized" });
    }
    req.user = {
      id: payload.sub,
      role: payload.role,
      username: payload.username
    };
    return next();
  } catch {
    return res.status(401).json({ message: "unauthorized" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = getPayload(req);
      if (!payload) {
        return res.status(401).json({ message: "unauthorized" });
      }
      if (!roles.includes(payload.role)) {
        return res.status(403).json({ message: "forbidden" });
      }
      req.user = {
        id: payload.sub,
        role: payload.role,
        username: payload.username
      };
      return next();
    } catch {
      return res.status(401).json({ message: "unauthorized" });
    }
  };
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = getPayload(req);
    if (!payload) {
      return res.status(401).json({ message: "unauthorized" });
    }
    if (payload.role !== "ADMIN") {
      return res.status(403).json({ message: "forbidden" });
    }
    req.user = {
      id: payload.sub,
      role: payload.role,
      username: payload.username
    };
    return next();
  } catch {
    return res.status(401).json({ message: "unauthorized" });
  }
};
