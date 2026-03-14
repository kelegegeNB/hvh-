import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import reportsRouter from "./routes/reports.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import uploadsRouter from "./routes/uploads.js";
import publicRouter from "./routes/public.js";
import platformsRouter from "./routes/platforms.js";
import blacklistRouter from "./routes/blacklist.js";
import appealsRouter from "./routes/appeals.js";
import { checkIpBlacklist } from "./middleware/ipCheck.js";
import path from "path";
import { logger } from "./utils/logger.js";

dotenv.config();

const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

// Debug Middleware to trace IP issues
app.use((req, res, next) => {
  if (!req.path.startsWith('/health') && !req.path.startsWith('/uploads')) {
    logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip']
        }
    });
  }
  next();
});

// Apply IP Blacklist Check
app.use(checkIpBlacklist);

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use("/api/auth", authRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/admin", requireAuth, adminRouter);
app.use("/api/platforms", platformsRouter);
app.use("/api/blacklist", requireAuth, blacklistRouter);
app.use("/api/appeals", appealsRouter);
app.use("/api", publicRouter);
app.use("/api/uploads", uploadsRouter);
const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadDir));

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
    logger.info(`Server started on port ${port}`);
});
