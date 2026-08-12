/**
 * Users Module — Data Transfer Objects
 *
 * External-facing shapes: request/response bodies a controller or
 * route touches directly.
 */
import type { UserStatus } from '@shared/enums';
import type { RoleName } from '@shared/types/role.types';
import type { PaginationQuery } from '@shared/validators/common.validators';
import type { PaginatedResult } from '@shared/dto/pagination.dto';
import type { SingleCreatableRole } from './users.types';

// ---------------------------------------------------------------------
// Bulk Member Provisioning
// ---------------------------------------------------------------------

/**
 * Outcome of provisioning ONE eligible MemberSync row. A discriminated
 * union, not a generic "success: boolean, error?: string" shape — same
 * pattern auth.dto.ts's LoginResult uses. missing_email is its own
 * outcome, not lumped into "failed": a MemberSync row with no synced
 * email is a legitimate, already-existing record that simply can't be
 * provisioned yet — that's different from a genuine failure, and the
 * distinction matters to whoever's reading this summary to decide what
 * needs following up (chase the SACCO's data source vs. investigate a bug).
 */
export type MemberProvisionResult =
  | { status: 'created'; memberId: string; userId: string; email: string }
  | { status: 'failed'; memberId: string; reason: 'missing_email' | 'duplicate_email' | 'already_provisioned' };

export interface ProvisionMembersSummary {
  totalEligible: number;
  created: number;
  failed: number;
  results: MemberProvisionResult[];
}

// ---------------------------------------------------------------------
// Single User Creation (officers, admin, auditor, observer)
// ---------------------------------------------------------------------

export interface CreateSingleUserInput {
  email: string;
  fullName: string;
  role: SingleCreatableRole;
}

export interface CreateSingleUserResult {
  id: string;
  email: string;
  fullName: string;
  role: SingleCreatableRole;
  status: UserStatus;
}

// ---------------------------------------------------------------------
// Listing / Lookup — adopts shared pagination (page/limit,
// PaginatedResult<T>) rather than a module-specific page/pageSize shape,
// since this is the first module to need list pagination and every
// module after it should follow one convention, not invent its own.
// ---------------------------------------------------------------------

export interface ListUsersQuery extends PaginationQuery {
  status?: UserStatus;
  role?: RoleName;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
  status: UserStatus;
  createdAt: Date;
}

export type PaginatedUsers = PaginatedResult<UserSummary>;