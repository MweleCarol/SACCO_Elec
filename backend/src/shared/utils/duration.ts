const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

// Converts "15m" / "7d" style env values (JWT_ACCESS_EXPIRES_IN,
// JWT_REFRESH_EXPIRES_IN) into milliseconds, needed anywhere we compute a
// real Date (e.g. RefreshToken.expiresAt) rather than just handing the
// string to jsonwebtoken, which parses these natively for signing only.
export function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${value}". Expected formats like "15m", "7d".`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit.toLowerCase()];
}