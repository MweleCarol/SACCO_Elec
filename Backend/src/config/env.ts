import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  // Distributed trust / quorum governance settings
  TRUST_THRESHOLD_M: z.coerce.number().int().min(2).default(3),
  TRUST_POOL_SIZE_N: z.coerce.number().int().min(3).default(5),
  TRUST_ACTION_EXPIRY_HOURS: z.coerce.number().int().min(1).default(48),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.TRUST_THRESHOLD_M > parsed.data.TRUST_POOL_SIZE_N) {
  console.error("TRUST_THRESHOLD_M cannot exceed TRUST_POOL_SIZE_N");
  process.exit(1);
}

export const env = parsed.data;