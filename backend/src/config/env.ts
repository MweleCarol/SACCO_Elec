import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Fails fast on startup if anything required is missing/malformed, rather
// than surfacing a confusing runtime error later (e.g. "jwt secret undefined")
// deep inside a request handler.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_TEST_URL: z.string().min(1).optional(),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET should be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET should be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  TOTP_ISSUER: z.string().default("SEVS"),

  ENCRYPTION_KEY: z
    .string()
    .length(64, "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Deliberately printed with console.error + process.exit rather than
    // thrown: this runs before the logger/error-handling infrastructure
    // exists, and a stack trace here would just be noise over the real
    // problem (which env var is missing).
    console.error("❌ Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";