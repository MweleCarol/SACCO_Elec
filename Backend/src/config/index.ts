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
  },
  encryption: {
    voteKey: requireEnv('VOTE_ENCRYPTION_KEY'),
    ivLength: parseInt(process.env.VOTE_ENCRYPTION_IV_LENGTH ?? '12', 10),
  },
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