import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Fails fast on startup if anything required is missing or malformed.
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

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),

  // Login and MFA attempts allowed per IP per 15 minutes. Keep 10 in
  // production; raise it in .env only while testing.
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // How many reverse proxies or load balancers sit in front of the app
  // (0 = none). Without this behind a proxy, every client looks like one IP.

  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

  // Background job that auto-closes ended elections and expires stale DAT
  // requests. Run it on ONE server instance only (single-SACCO deployment).
  SCHEDULER_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  SCHEDULER_INTERVAL_MS: z.coerce.number().int().min(5_000).default(60_000),

  // Time zone used by the governance off-hours rule (IANA name).
  GOVERNANCE_TIMEZONE: z
    .string()
    .default("Africa/Nairobi")
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-GB", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "GOVERNANCE_TIMEZONE must be a valid IANA time zone, e.g. Africa/Nairobi"),
});
type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // console + exit rather than throw: this runs before the logger exists.
    console.error("Invalid environment configuration:");
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