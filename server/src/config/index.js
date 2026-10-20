import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/divyam_ayurveda"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  APP_URL: z.string().default("http://localhost:5173"),
  API_URL: z.string().default("http://localhost:5000"),

  JWT_ACCESS_SECRET: z.string().min(32).default("divyam_ayurveda_local_dev_access_secret_key_108_with_extra_entropy_for_security_2026"),
  JWT_REFRESH_SECRET: z.string().min(32).default("divyam_ayurveda_local_dev_refresh_secret_key_108_with_extra_entropy_for_security_2026"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  PASSWORD_PEPPER: z.string().default("divyam_ayurveda_local_pepper_secret_108"),
  ENCRYPTION_KEY: z.string().default("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"),

  CASHFREE_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  CASHFREE_APP_ID: z.string().default("TEST_CF_APP_ID"),
  CASHFREE_SECRET_KEY: z.string().default("TEST_CF_SECRET_KEY"),
  CASHFREE_API_VERSION: z.string().default("2025-01-01"),
  CASHFREE_WEBHOOK_URL: z.string().default("http://localhost:5000/api/v1/webhooks/cashfree"),

  SHIPROCKET_BASE_URL: z.string().default("https://apiv2.shiprocket.in"),
  SHIPROCKET_EMAIL: z.string().default("shipping@divyamayurveda.test"),
  SHIPROCKET_PASSWORD: z.string().default("TestShiprocketPass123!"),
  SHIPROCKET_WEBHOOK_SECRET: z.string().default("test_shiprocket_webhook_secret_999"),

  OBJECT_STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  SMTP_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.fatal({ errors: parsed.error.format() }, "Environment configuration validation failed");
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const config = parsed.success ? parsed.data : envSchema.parse({});

