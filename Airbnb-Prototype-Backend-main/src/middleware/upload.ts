import multer from "multer";
import { AppError } from "./errorHandler";

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (!file.mimetype.startsWith("image/")) {
    cb(new AppError("Only image uploads are allowed", 400));
    return;
  }
  cb(null, true);
}

export const propertyImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 12 },
});

export const heroImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
