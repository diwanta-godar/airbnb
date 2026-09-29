import path from "path";
import { randomUUID } from "crypto";
import { URL } from "url";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const storage = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET);

export async function uploadPublicImage(
  file: Express.Multer.File,
  folder: "properties" | "hero",
): Promise<string> {
  const extension = path.extname(file.originalname).toLowerCase();
  const objectPath = `${folder}/${randomUUID()}${extension}`;
  const { data, error } = await storage.upload(objectPath, file.buffer, {
    contentType: file.mimetype,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("[Storage] Image upload failed:", error.message);
    throw new AppError("Image upload failed", 502);
  }

  return storage.getPublicUrl(data.path).data.publicUrl;
}

export async function deletePublicImage(imageUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return;
  }

  const publicObjectPrefix = `/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/`;
  if (!url.pathname.startsWith(publicObjectPrefix)) return;

  const objectPath = decodeURIComponent(
    url.pathname.slice(publicObjectPrefix.length),
  );
  const { error } = await storage.remove([objectPath]);
  if (error) {
    console.warn("[Storage] Could not delete image:", error.message);
  }
}
