import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default("property-images"),
  WHATSAPP_AUTH_ENCRYPTION_KEY: z.string().min(32),
  DB_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  DB_SYNCHRONIZE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  DB_LOGGING: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SEED_ON_START: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  CORS_ORIGINS: z.string().min(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),
  APP_NAME: z.string().default("The Lantern Stay"),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  ADMIN_NOTIFY_PHONE: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const corsOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim());
