// LLD Section 8 (Membership Synchronization Design) + ADR-002.
//
// Validates ONE already-column-mapped candidate row into a MembershipRecord.
// Turning a raw CSV header row (e.g. "Membership Number", "Full Name") into
// a candidate object with these field names is the parser's job, not this
// file's — this schema only ever sees an object already shaped like a
// candidate MembershipRecord, with unvalidated string values.
//
// Scope boundary, deliberate: this file checks shape and format only
// (required fields present, status is one of the three legal values, email
// looks like an email). It does NOT detect duplicate identifiers or compare
// against existing MemberSync rows — that's cross-record logic
// (ConflictScenario, LLD §8.6) and requires the whole batch plus the
// database, which belongs in the service, not a per-row validator.

import { z } from 'zod';
import { MEMBERSHIP_STATUS_RAW_VALUES } from './membership-sync.types';
import type { MembershipRecord } from './membership-sync.types';

const membershipStatusRawSchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(
    z.enum(MEMBERSHIP_STATUS_RAW_VALUES, {
      error: `Membership status must be one of: ${MEMBERSHIP_STATUS_RAW_VALUES.join(', ')}`,
    }),
  );

export const membershipRecordRowSchema = z.object({
  membershipNumber: z.string().trim().min(1, 'Membership number is required'),
  fullName: z.string().trim().min(2, 'Full name is too short').max(120, 'Full name is too long'),
  nationalId: z.string().trim().min(1).optional(),
  membershipStatus: membershipStatusRawSchema,
  branch: z.string().trim().min(1).optional(),
  email: z.string().trim().toLowerCase().email('Invalid email address').optional(),
  phone: z.string().trim().min(1).optional(),
});

export type MembershipRecordRowParsed = z.infer<typeof membershipRecordRowSchema>;

// Structural check, kept only as a compile-time reminder to update this
// schema if MembershipRecord's shape ever changes — not exported, not
// used at runtime.
type _AssertShapeMatches = MembershipRecordRowParsed extends MembershipRecord ? true : never;

// ---------------------------------------------------------------------------
// Row-level parse result
// ---------------------------------------------------------------------------

export type RowValidationResult =
  | { success: true; data: MembershipRecord }
  | { success: false; membershipNumber: string | null; reason: string };

/**
 * Best-effort membershipNumber extraction on failure: even a row that
 * fails validation elsewhere (bad email, bad status) usually still has a
 * readable membershipNumber, and the service needs that to attribute the
 * rejection to a specific member in SyncRecordError — a generic "row 47
 * failed" is far less useful to an administrator than "M00231 failed:
 * invalid email address."
 */
export function parseMembershipRecordRow(raw: unknown): RowValidationResult {
  const result = membershipRecordRowSchema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const membershipNumber = extractMembershipNumberBestEffort(raw);
  const reason = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`)
    .join('; ');

  return { success: false, membershipNumber, reason };
}

function extractMembershipNumberBestEffort(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null || !('membershipNumber' in raw)) {
    return null;
  }
  const value = (raw as Record<string, unknown>).membershipNumber;
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}