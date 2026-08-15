// LLD §8.13 Synchronization Report — the external-facing shape returned
// to the client after a sync run. Distinct from SyncRunAccumulator
// (membership-sync.types.ts, internal-only): this is what the API
// actually returns, not what the service accumulates while running.
// Field names here are deliberately DTO-flavored ("newRecordsImported")
// rather than matching the internal accumulator's names 1:1
// ("recordsInserted") — the external contract shouldn't be locked to
// however the internal implementation happens to name its counters.

import type { SyncMode, SyncStatus } from '@shared/enums';
import type { SyncRunResult } from './membership-sync.service';

// Re-declared rather than imported from membership-sync.types.ts —
// structurally identical to SyncRecordError, but kept as its own type
// here to preserve the internal/external boundary the module
// conventions establish (.types.ts vs .dto.ts), even though the shapes
// happen to match today.
export interface SyncErrorDetail {
  membershipNumber: string | null;
  reason: string;
  category: 'REJECTED' | 'FAILED';
}

export interface SyncReportDto {
  syncLogId: string;
  mode: SyncMode;
  status: SyncStatus;
  totalRecordsReceived: number;
  recordsProcessed: number;
  newRecordsImported: number;
  recordsUpdated: number;
  membersMarkedIneligible: number;
  recordsRejected: number;
  recordsFailed: number;
  processingDurationMs: number;
  errors: SyncErrorDetail[];
}

export function toSyncReportDto(result: SyncRunResult, durationMs: number): SyncReportDto {
  const { summary } = result;
  return {
    syncLogId: result.syncLogId,
    mode: summary.mode,
    status: result.status,
    totalRecordsReceived: summary.recordsReceived,
    recordsProcessed: summary.recordsProcessed,
    newRecordsImported: summary.recordsInserted,
    recordsUpdated: summary.recordsUpdated,
    membersMarkedIneligible: summary.recordsMarkedIneligible,
    recordsRejected: summary.recordsRejected,
    recordsFailed: summary.recordsFailed,
    processingDurationMs: durationMs,
    errors: summary.errors,
  };
}