// LLD Section 8 (Membership Synchronization Design) — §8.6 Conflict
// Resolution, §8.10 Database Operations, §8.12 Audit Logging.
//
// Layering: Service → Repository → Prisma, same as every other module.
// This file has no knowledge of CSV, validation, or the run-level
// accumulator loop — it takes one already-validated MembershipRecord at
// a time and talks to the database, returning enough information for the
// service to classify the outcome and update its counters.

import { prisma } from '@database/client';
import { EligibilityStatus, SyncStatus } from '@shared/enums';
import { Prisma } from '../../generated/prisma/client';
import type {
  MembershipRecord,
  ConflictScenario,
  SyncRunAccumulator,
} from './membership-sync.types';

// ---------------------------------------------------------------------
// Per-record upsert — LLD §8.6 Conflict Resolution
// ---------------------------------------------------------------------

/**
 * Explicit lookup-then-write (not a bare upsert()): §8.6 needs to
 * distinguish "this membershipNumber has never been seen" (NEW_MEMBER)
 * from "this membershipNumber exists but the incoming record doesn't
 * match who we think that member is" (DUPLICATE_IDENTIFIER) — a single
 * upsert() can't surface that second case, since Postgres only sees a
 * conflicting primary/unique key, not a business-level identity
 * mismatch. Two round trips per record is an accepted cost for getting
 * the §8.6 scenario classification right, consistent with Decision B's
 * per-record (not bulk-batched) design.
 *
 * "Identity mismatch" here is deliberately narrow: a full name that
 * doesn't match the existing record for the same membershipNumber.
 * Anything else differing (branch, contact info, status) is treated as
 * a normal update, not a conflict.
 */
export async function upsertMemberSyncRecord(
  record: MembershipRecord,
): Promise<{ scenario: ConflictScenario; memberSyncId: string | null }> {
  const existing = await prisma.memberSync.findUnique({
    where: { membershipNumber: record.membershipNumber },
    select: { id: true, fullName: true },
  });

  if (existing && normalizeForCompare(existing.fullName) !== normalizeForCompare(record.fullName)) {
    // Same membershipNumber, different person on record — LLD §8.6
    // "Duplicate member identifier: Reject record and generate
    // synchronization error." Deliberately NOT written to MemberSync;
    // the service records this as a rejection, not an update.
    return { scenario: 'DUPLICATE_IDENTIFIER', memberSyncId: null };
  }

  const eligibilityStatus = deriveEligibilityStatus(record.membershipStatus);

  const data = {
    fullName: record.fullName,
    nationalId: record.nationalId ?? null,
    eligibilityStatus,
    branch: record.branch ?? null,
    email: record.email ?? null,
    phone: record.phone ?? null,
  };

  if (!existing) {
    const created = await prisma.memberSync.create({
      data: { membershipNumber: record.membershipNumber, ...data },
      select: { id: true },
    });
    return { scenario: 'NEW_MEMBER', memberSyncId: created.id };
  }

  await prisma.memberSync.update({ where: { id: existing.id }, data });

  // §8.6 distinguishes plain updates from status-transition scenarios
  // (suspended/terminated) even though both are, mechanically, the same
  // update() call — the scenario reflects *why* the record changed, for
  // reporting and audit purposes, not a different write path.
  if (record.membershipStatus === 'SUSPENDED') {
    return { scenario: 'MEMBERSHIP_SUSPENDED', memberSyncId: existing.id };
  }
  if (record.membershipStatus === 'TERMINATED') {
    return { scenario: 'MEMBERSHIP_TERMINATED', memberSyncId: existing.id };
  }
  return { scenario: 'UPDATED_MEMBER', memberSyncId: existing.id };
}

/**
 * §8.7 General Membership Eligibility Derivation: ACTIVE maps to
 * ELIGIBLE; SUSPENDED and TERMINATED both map to INELIGIBLE at the
 * general-membership tier. SUSPENDED vs TERMINATED as distinct states
 * (§8.6's "retaining audit history" language for terminated members)
 * lives in the raw membershipStatus already persisted on the record
 * indirectly via re-sync history — this module does not currently
 * persist a separate "why ineligible" reason column. Flag if that
 * granularity turns out to be needed later; not required by the LLD as
 * written.
 */
function deriveEligibilityStatus(status: MembershipRecord['membershipStatus']): EligibilityStatus {
  return status === 'ACTIVE' ? EligibilityStatus.ELIGIBLE : EligibilityStatus.INELIGIBLE;
}

function normalizeForCompare(value: string): string {
  return value.trim().toLowerCase();
}

// ---------------------------------------------------------------------
// Run-level SyncLog write — LLD §8.10, §8.12
// ---------------------------------------------------------------------

/**
 * One row, written once, at the end of a run — never updated
 * incrementally. The service holds the SyncRunAccumulator in memory for
 * the duration of the run and calls this exactly once with the final
 * counts, consistent with Decision B (per-record atomicity, run-level
 * aggregate log rather than one giant transaction).
 */
export async function writeSyncLog(
  initiatedById: string | null,
  accumulator: SyncRunAccumulator,
  status: SyncStatus,
): Promise<{ id: string }> {
  return prisma.syncLog.create({
    data: {
      initiatedById,
      mode: accumulator.mode,
      status,
      recordsReceived: accumulator.recordsReceived,
      recordsProcessed: accumulator.recordsProcessed,
      recordsInserted: accumulator.recordsInserted,
      recordsUpdated: accumulator.recordsUpdated,
      recordsRejected: accumulator.recordsRejected,
      recordsFailed: accumulator.recordsFailed,
      errors:
        accumulator.errors.length > 0
          ? (accumulator.errors as unknown as Prisma.InputJsonValue)
          : undefined,
      completedAt: new Date(),
    },
    select: { id: true },
  });
}
