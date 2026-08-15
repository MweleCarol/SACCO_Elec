// LLD Section 8 (Membership Synchronization Design) — §8.3 Synchronization
// Workflow, §8.6 Conflict Resolution, §8.10 Database Operations, §8.12
// Audit Logging — plus Decisions A and B from the M7 design discussion.
//
// Owns the full "raw CSV text in, SyncLog row + summary out" flow. Per
// ADR-002, CSV parsing itself lives in membership-sync.csv-parser.util.ts
// (kept separate so a future non-CSV source only requires swapping that
// one util, not this file) — this service calls it, but has no CSV-format
// knowledge of its own beyond "give me an array of raw candidate rows."
//
// Per-record atomicity (Decision B): a single bad or failing record never
// aborts the run. Only a run-level failure — the file itself couldn't be
// parsed into any rows at all — produces SyncStatus.FAILED. Once the
// per-record loop starts, the worst a run can end at is PARTIAL_SUCCESS.

import { SyncStatus } from '@shared/enums';
import type { SyncMode } from '@shared/enums';
import { parseCsvRows } from './membership-sync.csv-parser.util';
import { parseMembershipRecordRow } from './membership-sync.validator';
import { upsertMemberSyncRecord, writeSyncLog } from './membership-sync.repository';
import { createEmptySyncRunAccumulator } from './membership-sync.types';
import type { SyncRunAccumulator } from './membership-sync.types';

export interface SyncRunResult {
  syncLogId: string;
  status: SyncStatus;
  summary: SyncRunAccumulator;
}

export async function runMembershipSync(
  csvText: string,
  mode: SyncMode,
  initiatedById: string | null,
): Promise<SyncRunResult> {
  const accumulator = createEmptySyncRunAccumulator(mode);

  // Run-level failure: the file itself couldn't be parsed into rows at
  // all (wrong file type, missing required columns, unreadable
  // structure). No per-record loop ever starts — LLD §8.11 "Invalid data
  // format," but at the whole-file level, distinct from a single bad row.
  let rawRows: unknown[];
  try {
    rawRows = parseCsvRows(csvText);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unable to parse uploaded file';
    accumulator.errors.push({ membershipNumber: null, reason, category: 'FAILED' });
    const log = await writeSyncLog(initiatedById, accumulator, SyncStatus.FAILED);
    return { syncLogId: log.id, status: SyncStatus.FAILED, summary: accumulator };
  }

  accumulator.recordsReceived = rawRows.length;

  for (const rawRow of rawRows) {
    accumulator.recordsProcessed += 1;

    const parsed = parseMembershipRecordRow(rawRow);
    if (!parsed.success) {
      accumulator.recordsRejected += 1;
      accumulator.errors.push({
        membershipNumber: parsed.membershipNumber,
        reason: parsed.reason,
        category: 'REJECTED',
      });
      continue;
    }

    try {
      const { scenario } = await upsertMemberSyncRecord(parsed.data);

      if (scenario === 'DUPLICATE_IDENTIFIER') {
        // Repository detected the record but deliberately did not write
        // it — LLD §8.6, treated as a rejection (bad data), not a
        // system failure.
        accumulator.recordsRejected += 1;
        accumulator.errors.push({
          membershipNumber: parsed.data.membershipNumber,
          reason:
            'Duplicate member identifier: an existing record has a different full name on file for this membership number.',
          category: 'REJECTED',
        });
        continue;
      }

      if (scenario === 'NEW_MEMBER') {
        accumulator.recordsInserted += 1;
      } else {
        // UPDATED_MEMBER, MEMBERSHIP_SUSPENDED, MEMBERSHIP_TERMINATED all
        // count as an update — but §8.13 also wants "members marked
        // ineligible" reported as its own figure, so the suspended/
        // terminated scenarios increment both counters, not just one.
        accumulator.recordsUpdated += 1;
        if (scenario === 'MEMBERSHIP_SUSPENDED' || scenario === 'MEMBERSHIP_TERMINATED') {
          accumulator.recordsMarkedIneligible += 1;
        }
      }
    } catch (err) {
      // Good data, system-level failure while writing it — the
      // recordsFailed side of Decision A's rejected/failed split.
      const reason = err instanceof Error ? err.message : 'Unexpected error writing record';
      accumulator.recordsFailed += 1;
      accumulator.errors.push({
        membershipNumber: parsed.data.membershipNumber,
        reason,
        category: 'FAILED',
      });
    }
  }

  const status = deriveRunStatus(accumulator);
  const log = await writeSyncLog(initiatedById, accumulator, status);

  return { syncLogId: log.id, status, summary: accumulator };
}

/**
 * SUCCESS: every received record was inserted or updated cleanly (this
 * also currently covers the zero-rows-received case — see the open
 * question raised alongside this file about whether that should count
 * as SUCCESS or FAILED instead).
 * PARTIAL_SUCCESS: the run completed, but at least one record was
 * rejected or failed.
 * FAILED is never returned from here — a truly failed run never reaches
 * this point (see the parseCsvRows catch above); by the time the loop
 * finishes, the run itself succeeded even if not every record did.
 */
function deriveRunStatus(accumulator: SyncRunAccumulator): SyncStatus {
  const hadAnyProblem = accumulator.recordsRejected > 0 || accumulator.recordsFailed > 0;
  return hadAnyProblem ? SyncStatus.PARTIAL_SUCCESS : SyncStatus.SUCCESS;
}