import crypto from "crypto";

// Canonical serialization matters here: JSON.stringify on an object with
// varying key order would produce a different hash for logically identical
// data, silently breaking the chain. Always build the string from an
// explicit field list, in a fixed order, never from JSON.stringify(obj).
export interface AuditHashInput {
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  electionId: string | null;
  outcome: string;
  metadata: unknown;
  createdAt: string; // ISO string, fixed at the moment of writing
  previousHash: string;
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
    JSON.stringify(input.metadata ?? null),
    input.createdAt,
  ].join("|");

  return crypto.createHash("sha256").update(canonical).digest("hex");
}

// The very first row in the chain has nothing to chain from. A fixed
// genesis value (rather than an empty string) makes it visually obvious
// in the DB which row started the chain, and makes chain-verification
// logic (Phase 9) not need a special "is this the first row" branch.
export const AUDIT_GENESIS_HASH = "0".repeat(64);