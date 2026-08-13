import { z } from 'zod';
import { UserStatus } from '@shared/enums';
import { ROLE_NAMES } from '@shared/types/role.types';
import { paginationQuerySchema } from '@shared/validators/common.validators';

// ---------------------------------------------------------------------------
// Single User Creation
// ---------------------------------------------------------------------------

/**
 * Mirrors ROLE_NAMES minus MEMBER (role.types.ts). Written out by hand
 * rather than derived via .filter(), because z.enum() needs a literal,
 * non-empty tuple at compile time — a filtered array loses that
 * literal-ness and would need an unsafe `as` cast to satisfy it anyway,
 * defeating the point of deriving it. Five roles, changed rarely — update
 * this list by hand if a role is ever added or removed.
 */
const SINGLE_CREATABLE_ROLE_NAMES = [
  'SYSTEM_ADMIN',
  'ELECTION_OFFICER',
  'VERIFICATION_OFFICER',
  'AUDITOR',
  'OBSERVER',
] as const;

export const createSingleUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  fullName: z.string().trim().min(2, 'Full name is too short').max(120),
  role: z.enum(SINGLE_CREATABLE_ROLE_NAMES, {
    error: `Role must be one of: ${SINGLE_CREATABLE_ROLE_NAMES.join(', ')}`,
  }),
});

export type CreateSingleUserParsed = z.infer<typeof createSingleUserSchema>;

// ---------------------------------------------------------------------------
// List / Query Users
// ---------------------------------------------------------------------------

/**
 * UserStatus already has a real Prisma-generated enum object to draw
 * from — unlike RoleName, which has no equivalent because Role is plain
 * table data, not a database-level enum. That asymmetry is exactly why
 * roles needed a hand-maintained array a moment ago and statuses don't:
 * Object.values(UserStatus) already IS the single source of truth.
 */
const userStatusValues = Object.values(UserStatus) as [UserStatus, ...UserStatus[]];

export const listUsersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(userStatusValues).optional(),
  role: z.enum(ROLE_NAMES).optional(),
});

export type ListUsersQueryParsed = z.infer<typeof listUsersQuerySchema>;