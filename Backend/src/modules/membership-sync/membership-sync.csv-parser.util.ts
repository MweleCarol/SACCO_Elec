// LLD §8.4 Data Mapping + ADR-002.
//
// The one CSV-specific file in this module. Its entire job: raw CSV text
// in, an array of raw candidate row objects out — already shaped with
// this module's field names (membershipNumber, fullName, ...), but NOT
// yet validated. Field-level validation (is this email real, is this
// status one of the three legal values) is deliberately NOT this file's
// job — that's membership-sync.validator.ts, one file downstream.
//
// Per ADR-002: if a second membership source is ever added, only this
// file (or its equivalent for that source) changes. Nothing in
// membership-sync.service.ts, .validator.ts, or .repository.ts knows or
// cares that the source is CSV specifically — they only see the raw
// candidate row shape this file produces.
//
// Throws only for structural failures — unreadable CSV, or required
// header columns entirely missing. A malformed VALUE in an otherwise
// well-structured row (e.g. a blank membership number) is NOT a parse
// failure; it's passed through as-is and becomes the validator's job to
// reject. This file only refuses to proceed when it cannot make sense of
// the file's shape at all.

import { parse } from 'csv-parse/sync';

// LLD §8.4 — SACCO Field -> SEVS Field. Header matching is
// case-insensitive and trims whitespace, since a hand-exported CSV's
// exact header capitalization/spacing isn't something to trust.
const HEADER_MAP: Record<string, string> = {
  'membership number': 'membershipNumber',
  'full name': 'fullName',
  'national id': 'nationalId',
  'membership status': 'membershipStatus',
  branch: 'branch',
  email: 'email',
  phone: 'phone',
  'phone number': 'phone',
};

// Only these two are load-bearing for every downstream step (the
// validator requires both, and membershipStatus additionally drives
// §8.6 conflict resolution) — everything else in HEADER_MAP is
// optional, matching MembershipRecord's own optional fields.
const REQUIRED_HEADERS = ['membershipNumber', 'membershipStatus'];

export function parseCsvRows(csvText: string): unknown[] {
  if (!csvText || csvText.trim().length === 0) {
    throw new Error('Uploaded file is empty.');
  }

  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: (headerRow: string[]) => mapHeaderRow(headerRow),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown parse error';
    throw new Error(`Uploaded file could not be parsed as CSV: ${detail}`);
  }

  return records;
}

function mapHeaderRow(headerRow: string[]): string[] {
  const mapped = headerRow.map((rawHeader) => {
    const key = rawHeader.trim().toLowerCase();
    return HEADER_MAP[key] ?? rawHeader.trim(); // unrecognized columns pass through under their original name and are simply ignored downstream — not an error, since an export may carry extra SACCO-internal columns we don't need
  });

  const missing = REQUIRED_HEADERS.filter((required) => !mapped.includes(required));
  if (missing.length > 0) {
    throw new Error(
      `Uploaded file is missing required column(s): ${missing.join(', ')}. ` +
        `Expected headers include "Membership Number" and "Membership Status".`,
    );
  }

  return mapped;
}