import crypto from "crypto";

export interface AuditHashInput {
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  electionId: string | null;
  outcome: string;
  metadata: unknown;
  createdAt: string;
  previousHash: string;
}

// Deterministic regardless of key insertion/storage order — critical because
// Postgres's jsonb type does NOT preserve the key order metadata was
// originally written with. Without this, recomputing a hash after reading
// metadata back from the database can silently disagree with the hash
// computed at write time, purely due to key reordering, not tampering.
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalStringify((value as Record<string, unknown>)[k])}`
  );
  return `{${parts.join(",")}}`;
}

export function computeAuditHash(input: AuditHashInput): string {
  const canonical = [
    input.previousHash,
    input.actorId ?? "",
    input.action,
    input.resourceType ?? "",
    input.resourceId ?? "",
    input.electionId ?? "",
    input.outcome,
    canonicalStringify(input.metadata ?? null),
    input.createdAt,
  ].join("|");

  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export const AUDIT_GENESIS_HASH = "0".repeat(64);