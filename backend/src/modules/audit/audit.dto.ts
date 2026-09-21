import { AuditLog, AuditOutcome } from "@prisma/client";

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  electionId: string | null;
  outcome: AuditOutcome;
  metadata: unknown;
  createdAt: Date;
}

export function toAuditLogDto(log: AuditLog): AuditLogDto {
  return {
    id: log.id, actorId: log.actorId, action: log.action, resourceType: log.resourceType,
    resourceId: log.resourceId, electionId: log.electionId, outcome: log.outcome,
    metadata: log.metadata, createdAt: log.createdAt,
    // previousHash/currentHash deliberately excluded from the normal DTO —
    // they're implementation detail for chain verification, not something
    // a reader browsing the audit trail needs to see. Exposed only via the
    // verify-chain endpoint's own response shape below.
  };
}

export interface ChainBreak {
  auditLogId: string;
  reason: "HASH_MISMATCH" | "LINK_MISMATCH";
  createdAt: Date;
}

export interface ChainVerificationResult {
  recordsChecked: number;
  intact: boolean;
  breaks: ChainBreak[];
}