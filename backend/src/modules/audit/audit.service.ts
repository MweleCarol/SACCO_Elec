import { prisma } from "../../config/prisma";
import { AuditOutcome } from "@prisma/client";
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
  // Caller's responsibility: NEVER pass passwords, tokens, TOTP secrets,
  // encryption keys, or ballot/vote contents in here. This function does
  // not attempt to redact — see task spec §16/§25.
  metadata?: Record<string, unknown>;
}

// Writing an audit row is deliberately NOT wrapped in the same transaction
// as the business action it's logging in most call sites — see the
// service-layer comment where this gets called for why (a failed audit
// write should not be able to silently roll back a successful vote, for
// example). Exceptions to that rule are called out explicitly where they
// matter (e.g. election activation).
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    // Reading the last row and writing the next one isn't atomic against a
    // concurrent writer — two simultaneous audit writes could both read the
    // same "last" hash and produce a fork. Acceptable for now (audit writes
    // are append-only and low-contention compared to, say, vote
    // submission); if this ever becomes a real race in practice, the fix is
    // a Postgres advisory lock around this function, not a Prisma
    // transaction (transactions don't serialize reads by default).
    const lastEntry = await prisma.auditLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { currentHash: true },
    });

    const previousHash = lastEntry?.currentHash ?? AUDIT_GENESIS_HASH;
    const createdAt = new Date();

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

    await prisma.auditLog.create({
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
  } catch (err) {
    // An audit write failing should never crash the request that triggered
    // it (e.g. a member's vote should still succeed even if, hypothetically,
    // the audit table were briefly unreachable) — but it must not fail
    // silently either, since a gap in the chain is exactly the kind of
    // thing an auditor needs to know happened.
    logger.error("Audit log write failed", {
      action: input.action,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Phase 9 additions below — querying what writeAuditLog has been
// writing since Phase 2 ───────────────────────────────────────────────

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

// Walks the chain in write order, recomputing each row's hash from its
// own fields + the PREVIOUS row's actual stored currentHash (not the
// previous row's recomputed hash — a single corrupted row should be
// reported as exactly one break, not cascade into flagging every row
// after it as broken too).
//
// Known limitation: rows are ordered by createdAt, which has no
// dedicated sequence/version column to break ties within the same
// millisecond. For this project's request volume that's not a practical
// concern, but a production system verifying a high-throughput chain
// would want an explicit monotonic sequence number to order by instead.
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