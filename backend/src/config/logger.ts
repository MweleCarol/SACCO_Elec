import { isProduction } from "./env";

// Minimal structured logger with no external dependency — swap for
// pino/winston later if log volume in production justifies it, without
// changing any call sites (they all go through this same interface).
//
// The one rule every call site must follow: never pass passwords, tokens,
// TOTP secrets, encryption keys, or ballot/vote contents into `meta`.
// This module doesn't attempt to auto-redact — see the comment on `log()`.

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// In production, skip debug noise by default.
const MIN_LEVEL: LogLevel = isProduction ? "info" : "debug";

function log(level: LogLevel, message: string, meta?: LogMeta): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => log("debug", message, meta),
  info: (message: string, meta?: LogMeta) => log("info", message, meta),
  warn: (message: string, meta?: LogMeta) => log("warn", message, meta),
  error: (message: string, meta?: LogMeta) => log("error", message, meta),
};