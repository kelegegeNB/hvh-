import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 16) || ".bin";
    cb(null, `${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("invalid_file_type"));
  }
});

const router = Router();

router.post("/evidences", upload.array("files", 3), (req, res) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  const items = files.map((f) => ({
    url: `/uploads/${f.filename}`,
    originalName: f.originalname,
    size: f.size,
    mimeType: f.mimetype
  }));
  res.json({ items });
});

export { uploadDir };
export default router;
