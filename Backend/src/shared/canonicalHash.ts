import { createHash } from "node:crypto";

/**
 * Produces a stable, deterministic string representation of a JSON-serialisable
 * value by sorting object keys recursively. Two payloads that are semantically
 * identical but differ in key order must hash identically; any actual change
 * to the payload's content must change the hash. This is what trustees sign,
 * so it must never depend on incidental serialization order.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`
  );
  return `{${entries.join(",")}}`;
}

export function hashPayload(payload: unknown): string {
  return createHash("sha256").update(canonicalize(payload)).digest("hex");
}