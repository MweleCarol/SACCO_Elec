// LLD Section 9 (Membership Synchronization Design, post-renumber) + ADR-002.
// Internal-only shapes for the Membership Synchronization module — never
// returned directly from a controller. See membership-sync.dto.ts for the
// external-facing report shape returned to the client.

import { SyncMode } from '@shared/enums';

// -----------------------------------------------------------------------------
// Source-agnostic normalized record — ADR-002
// -----------------------------------------------------------------------------

// The raw membership-status values a source record may legally carry, after
// the source-specific parser (CSV today; any future source parser) has
// normalized casing/whitespace and rejected anything else. This is NOT the
// same as EligibilityStatus (the Prisma enum) — mapping raw status to
// EligibilityStatus is business logic in the service layer (LLD §8.6/§8.7),
// not a 1:1 rename. Matches the three statuses the LLD's conflict-resolution
// table (§8.6) actually reasons about.
// Single source of truth for raw membership-status values, same pattern
// as ROLE_NAMES in role.types.ts — a hand-maintained const array, with
// the type derived from it via typeof/[number] rather than declared
// separately. No backing Prisma enum exists for this (it's pre-mapping
// source data, not EligibilityStatus), so unlike UserStatus there's no
// generated array to draw from instead.
export const MEMBERSHIP_STATUS_RAW_VALUES = ['ACTIVE', 'SUSPENDED', 'TERMINATED'] as const;
export type MembershipStatusRaw = (typeof MEMBERSHIP_STATUS_RAW_VALUES)[number];

// LLD §8.4 Data Mapping, source-agnostic per ADR-002: the shape the sync
// service consumes, regardless of where a record came from. A CSV row (or
// any future source) is parsed into this shape before the service ever
// sees it — the service has no knowledge of CSV, files, or upload
// mechanics at all.
export interface MembershipRecord {
  membershipNumber: string;
  fullName: string;
  nationalId?: string;
  membershipStatus: MembershipStatusRaw;
  branch?: string;
  email?: string;
  phone?: string;
}

// -----------------------------------------------------------------------------
// Conflict resolution — LLD §8.6
// -----------------------------------------------------------------------------

// Which §8.6 scenario a given incoming record falls into, once compared
// against existing MemberSync state. Determined per-record during the sync
// loop; drives both the MemberSync write and which outcome bucket (see
// RecordOutcome below) the record counts toward.
export type ConflictScenario =
  | 'NEW_MEMBER'
  | 'UPDATED_MEMBER'
  | 'MEMBERSHIP_SUSPENDED'
  | 'MEMBERSHIP_TERMINATED'
  | 'DUPLICATE_IDENTIFIER';

// -----------------------------------------------------------------------------
// Per-record outcome — Decision B (per-record atomicity)
// -----------------------------------------------------------------------------

// What happened when the service tried to process one record. `rejected`
// is bad source data (failed validation, duplicate identifier — the
// record was never attempted against the database); `failed` is good
// data that hit a system-level problem while being written (matches the
// recordsRejected/recordsFailed split on SyncLog). Exactly one of these
// is produced per input record; the sync loop never throws past a single
// record's boundary.
export type RecordOutcome =
  | { kind: 'inserted'; membershipNumber: string }
  | { kind: 'updated'; membershipNumber: string }
  | { kind: 'rejected'; membershipNumber: string | null; reason: string }
  | { kind: 'failed'; membershipNumber: string | null; reason: string };

// -----------------------------------------------------------------------------
// Run-level accumulator — collapses into one SyncLog row (LLD §8.10, §8.12)
// -----------------------------------------------------------------------------

// Accumulated over the course of one sync run as RecordOutcomes come in.
// Mirrors SyncLog's count fields exactly so the final write is a direct
// mapping, not a re-derivation. `errors` is the structured detail behind
// the aggregate counts — persisted into SyncLog.errors (Json).
export interface SyncRunAccumulator {
  mode: SyncMode;
  recordsReceived: number;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsMarkedIneligible: number; // LLD §8.13 — subset of recordsUpdated where the scenario was MEMBERSHIP_SUSPENDED or MEMBERSHIP_TERMINATED
  recordsRejected: number;
  recordsFailed: number;
  errors: SyncRecordError[];
}

export interface SyncRecordError {
  membershipNumber: string | null; // null if the row couldn't be parsed enough to know its identifier
  reason: string;
  category: 'REJECTED' | 'FAILED';
}

// Starting point for a new run — every count at zero, no errors yet.
// Exported as a function (not a constant) so each run gets its own
// `errors` array instance rather than one shared/mutated across runs.
export function createEmptySyncRunAccumulator(mode: SyncMode): SyncRunAccumulator {
  return {
    mode,
    recordsReceived: 0,
    recordsProcessed: 0,
    recordsInserted: 0,
    recordsUpdated: 0,
    recordsMarkedIneligible: 0,
    recordsRejected: 0,
    recordsFailed: 0,
    errors: [],
  };
}