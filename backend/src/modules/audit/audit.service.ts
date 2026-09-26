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
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
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
    logger.error("Audit log write failed", {
      action: input.action,
      message: err instanceof Error ? err.message : String(err),
    });
  }
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