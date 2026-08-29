import { prisma } from "../../config/prisma";
import { AuditOutcome } from "@prisma/client";
import { computeAuditHash, AUDIT_GENESIS_HASH } from "../../shared/utils/hash";
import { logger } from "../../config/logger";

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