const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses strings like "15m", "7d", "30s" into milliseconds. */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}" (expected e.g. "15m", "7d")`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}