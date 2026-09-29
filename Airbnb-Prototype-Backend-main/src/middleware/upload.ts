import path from "path";
import fs from "fs";
import multer from "multer";
import { AppError } from "./errorHandler";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const propertyUploadRoot = path.resolve(process.cwd(), "uploads", "properties");
const heroUploadRoot = path.resolve(process.cwd(), "uploads", "hero");

ensureDir(propertyUploadRoot);
ensureDir(heroUploadRoot);

function makeStorage(destination: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const safe = file.originalname
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .toLowerCase();
      cb(null, `${Date.now()}-${safe}`);
    },
  });
}

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (!file.mimetype.startsWith("image/")) {
    cb(new AppError("Only image uploads are allowed", 400));
    return;
  }
  cb(null, true);
}

export const propertyImageUpload = multer({
  storage: makeStorage(propertyUploadRoot),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 12 },
});

export const heroImageUpload = multer({
  storage: makeStorage(heroUploadRoot),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

export function publicUploadUrl(filename: string) {
  return `/uploads/properties/${filename}`;
}

export function publicHeroUploadUrl(filename: string) {
  return `/uploads/hero/${filename}`;
}
