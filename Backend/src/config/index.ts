import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config = {
  server: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '5000', 10),
    apiVersion: process.env.API_VERSION ?? 'v1',
  },
  database: {
    url: requireEnv('DATABASE_URL'),
  },
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    // Window to submit a TOTP code after password verification succeeds
    // (login()'s MFA_REQUIRED branch). Short and deliberate: long enough
    // to grab a phone, short enough that a leaked mfaToken doesn't stay
    // dangerous. 5m is my suggested default — confirm or adjust.
    mfaPendingExpiresIn: process.env.JWT_MFA_PENDING_EXPIRES_IN ?? '5m',
  },
  // Encryption config removed from here — VOTE_ENCRYPTION_KEY,
  // VOTE_SIGNING_PRIVATE_KEY, and VOTE_SIGNING_PUBLIC_KEY are read,
  // decoded, and validated directly by shared/crypto/key-management.service.ts.
  // That file's own comment explains why: crypto-specific parsing
  // (base64 decode, byte-length checks, PEM parsing) shouldn't live in
  // generic config code every module depends on. One source of truth
  // per secret. VOTE_ENCRYPTION_IV_LENGTH is gone entirely — GCM IV
  // length is a fixed, non-configurable constant in encryption.service.ts,
  // so a .env variable implying it was tunable was actively misleading.
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
    totpIssuer: process.env.TOTP_ISSUER ?? 'SEVS-SACCO',
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  membershipSync: {
    baseUrl: process.env.MEMBERSHIP_SYSTEM_BASE_URL ?? '',
    apiKey: process.env.MEMBERSHIP_SYSTEM_API_KEY ?? '',
  },
  notifications: {
    smtp: {
      host: process.env.SMTP_HOST ?? '',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
    },
    smsApiKey: process.env.SMS_API_KEY ?? '',
  },
};