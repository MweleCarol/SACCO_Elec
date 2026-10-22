import { prisma } from "../../config/prisma";
import { AuditOutcome, Prisma } from "@prisma/client";
import { computeAuditHash, AUDIT_GENESIS_HASH } from "../../shared/utils/hash";
import { logger } from "../../config/logger";
import { toAuditLogDto, AuditLogDto, ChainVerificationResult } from "./audit.dto";
import { ListAuditLogsQuery } from "./audit.schema";
import * as auditRepository from "./audit.repository";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export interface WriteAuditLogInput {
  actorId: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  electionId?: string;
  outcome: AuditOutcome;
  // NEVER pass passwords, tokens, TOTP secrets, encryption keys, or ballot
  // contents here. This function does not redact anything.
  metadata?: Record<string, unknown>;
}

// Arbitrary constant naming the audit chain's advisory lock. Every writer
// takes it, so entries are appended one at a time and the chain cannot fork.
const AUDIT_CHAIN_LOCK_KEY = 7265001;

async function appendEntry(tx: Prisma.TransactionClient, input: WriteAuditLogInput): Promise<void> {
  // Transaction-scoped lock: released automatically on commit or rollback,
  // and re-entrant, so a transaction can write several entries.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK_KEY}::bigint)`;

  const last = await tx.auditLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { currentHash: true, createdAt: true },
  });

  const previousHash = last?.currentHash ?? AUDIT_GENESIS_HASH;

  // Strictly increasing timestamps keep the write order unambiguous for chain
  // verification, even when two entries land in the same millisecond.
  let createdAt = new Date();
  if (last && createdAt.getTime() <= last.createdAt.getTime()) {
    createdAt = new Date(last.createdAt.getTime() + 1);
  }

  const currentHash = computeAuditHash({
    actorId: input.actorId,
    action: input.action,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    electionId: input.electionId ?? null,
    outcome: input.outcome,
    metadata: input.metadata ?? null,
    createdAt: createdAt.toISOString(),
    previousHash,
  });

  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      electionId: input.electionId,
      outcome: input.outcome,
      metadata: input.metadata as never,
      previousHash,
      currentHash,
      createdAt,
    },
  });
}

// BEST-EFFORT: for ordinary actions. A failed audit write is logged loudly but
// never undoes the action that triggered it. Do NOT call this from inside a
// transaction: it would wait on the lock that transaction holds.
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    await prisma.$transaction((tx) => appendEntry(tx, input));
  } catch (err) {
    logger.error("Audit log write failed", {
      action: input.action,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// FAIL-CLOSED: for high-risk actions. Runs inside the caller's transaction and
// throws on failure, so the action cannot commit without its audit record.
export async function writeAuditLogInTransaction(
  tx: Prisma.TransactionClient,
  input: WriteAuditLogInput
): Promise<void> {
  await appendEntry(tx, input);
}

export async function getById(id: string): Promise<AuditLogDto> {
  const log = await auditRepository.findById(id);
  if (!log) throw new NotFoundError("Audit log entry");
  return toAuditLogDto(log);
}

export async function listLogs(query: ListAuditLogsQuery) {
  const [logs, totalCount] = await auditRepository.listLogs(query);
  return {
    logs: logs.map(toAuditLogDto),
    pagination: {
      page: query.page, pageSize: query.pageSize, totalCount,
      totalPages: Math.ceil(totalCount / query.pageSize),
    },
  };
}

export async function verifyChain(dateFrom?: Date, dateTo?: Date): Promise<ChainVerificationResult> {
  const logs = await auditRepository.listForVerification(dateFrom, dateTo);
  const breaks: ChainVerificationResult["breaks"] = [];

  let expectedPreviousHash = dateFrom ? logs[0]?.previousHash ?? AUDIT_GENESIS_HASH : AUDIT_GENESIS_HASH;

  for (const log of logs) {
    if (log.previousHash !== expectedPreviousHash) {
      breaks.push({ auditLogId: log.id, reason: "LINK_MISMATCH", createdAt: log.createdAt });
    }

    const recomputed = computeAuditHash({
      actorId: log.actorId, action: log.action, resourceType: log.resourceType,
      resourceId: log.resourceId, electionId: log.electionId, outcome: log.outcome,
      metadata: log.metadata, createdAt: log.createdAt.toISOString(), previousHash: log.previousHash,
    });

    if (recomputed !== log.currentHash) {
      breaks.push({ auditLogId: log.id, reason: "HASH_MISMATCH", createdAt: log.createdAt });
    }

    expectedPreviousHash = log.currentHash;
  }

  return { recordsChecked: logs.length, intact: breaks.length === 0, breaks };
}