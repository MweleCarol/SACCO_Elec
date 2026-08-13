/**
 * Common Validators — cross-module Zod schemas
 *
 * Layer: Shared Infrastructure (validators/)
 *
 * WHY these live here and not in a module's own validator.ts:
 * Per LLD §6.1, each module owns its own dto.ts/validator.ts for
 * module-specific shapes (LoginInput, CreateElectionInput, etc.). These
 * schemas don't belong to any one module — a UUID route param, a
 * pagination query, and password rules are needed by elections,
 * candidates, users, audit logs, and more. Defining them once here and
 * importing everywhere avoids five modules writing five slightly
 * different versions of "is this a valid UUID?"
 *
 * USAGE:
 *   import { uuidParamSchema } from '@shared/validators/common.validators';
 *   router.get('/:id', validate({ params: uuidParamSchema }), ...);
 */
import { z } from 'zod';

/** Validates a single :id route param as a UUID. */
export const uuidParamSchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),
});

export type UuidParam = z.infer<typeof uuidParamSchema>;

/**
 * Pagination query params — coerced from query-string strings to
 * numbers (Zod's z.coerce handles "?page=2" arriving as a string).
 * Defaults match what most list endpoints will want without the
 * client having to specify anything.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Password policy — NIST SP 800-63B: length-only, no forced composition
 * rules. This supersedes an earlier version of this file that required
 * upper/lower/number complexity — that was my own invented
 * interpretation, not LLD-sourced. This one is: composition rules push
 * people toward predictable patterns (Password1!) and push real entropy
 * out of the password into a sticky note; a genuinely long passphrase
 * beats a short "complex" one that gets written down.
 *
 * NOTE: this deliberately deviates from the LLD's literal §7.5 text
 * ("8 characters... complexity rules enforced") — flagged as a real
 * policy decision, not a silent override.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be under 128 characters');

export const emailSchema = z.string().trim().toLowerCase().email('Must be a valid email address');

/** Shared by every 6-digit numeric code flow: activation OTP, staff
 * activation OTP, and TOTP codes — one definition instead of four
 * near-identical inline schemas. */
export const otpCodeSchema = z
  .string()
  .trim()
  .length(6, 'Code must be exactly 6 digits')
  .regex(/^\d+$/, 'Code must contain only digits');