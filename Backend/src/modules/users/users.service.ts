// src/modules/users/users.service.ts
import { getRoleId } from '@shared/cache/role.cache';
import { ConflictError, NotFoundError } from '@shared/errors';
import type { RoleName } from '@shared/types/role.types';
import { buildPaginationMeta } from '@shared/dto/pagination.dto';
import type { CreateSingleUserParsed, ListUsersQueryParsed } from './users.validator';
import {
  findEligibleMembersWithoutUserAccount,
  createUserForMember,
  createSingleUser,
  listUsers,
  findUserDetailById,
} from './users.repository';
import type {
  MemberProvisionResult,
  ProvisionMembersSummary,
  CreateSingleUserResult,
  PaginatedUsers,
  UserSummary,
} from './users.dto';

// ---------------------------------------------------------------------
// Bulk Member Provisioning
// ---------------------------------------------------------------------

/**
 * Creates a PENDING_ACTIVATION User for every ELIGIBLE MemberSync row
 * that doesn't already have one — see the Option B discussion: M7
 * (sync) owns keeping MemberSync accurate, this is the deliberate,
 * admin-triggered step that turns "eligible member" into "can call
 * /activation/initiate." Idempotent by construction: re-running this
 * only ever acts on members findEligibleMembersWithoutUserAccount()
 * still returns, since already-provisioned ones stop matching that
 * query.
 *
 * Zero eligible members is a normal, non-error outcome — not the same
 * situation as the old CSV import throwing on an empty file (an empty
 * upload was almost certainly the wrong file; nothing left to
 * provision is just the expected steady state once a sync is caught up).
 */
export async function provisionEligibleMembers(): Promise<ProvisionMembersSummary> {
  const eligibleMembers = await findEligibleMembersWithoutUserAccount();
  const memberRoleId = await getRoleId('MEMBER'); // resolved once, outside the loop

  const results: MemberProvisionResult[] = [];

  for (const member of eligibleMembers) {
    if (!member.email) {
      // A legitimate, already-existing MemberSync record that simply
      // has no synced email yet — not a bug, needs chasing at the
      // data-source level, not a code fix.
      results.push({ status: 'failed', memberId: member.id, reason: 'missing_email' });
      continue;
    }

    const outcome = await createUserForMember({
      memberId: member.id,
      email: member.email,
      fullName: member.fullName,
      roleId: memberRoleId,
    });

    if ('conflict' in outcome) {
      results.push({
        status: 'failed',
        memberId: member.id,
        reason: outcome.conflict === 'email' ? 'duplicate_email' : 'already_provisioned',
      });
    } else {
      results.push({
        status: 'created',
        memberId: member.id,
        userId: outcome.id,
        email: member.email,
      });
    }
  }

  return {
    totalEligible: eligibleMembers.length,
    created: results.filter((r) => r.status === 'created').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  };
}

// ---------------------------------------------------------------------
// Single User Creation
// ---------------------------------------------------------------------

export async function createSingleUserAccount(
  input: CreateSingleUserParsed,
): Promise<CreateSingleUserResult> {
  const roleId = await getRoleId(input.role);

  const outcome = await createSingleUser({ email: input.email, fullName: input.fullName, roleId });

  if ('conflict' in outcome) {
    // Single-create has exactly one caller waiting on exactly one HTTP
    // response — unlike bulk provisioning, there's no "report" to assemble.
    // A thrown error is the right signal here, not a result the
    // controller has to inspect to decide what happened.
    throw new ConflictError('A user with this email already exists.');
  }

  return {
    id: outcome.id,
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    status: 'PENDING_ACTIVATION',
  };
}

// ---------------------------------------------------------------------
// Listing / Lookup
// ---------------------------------------------------------------------

export async function getUsersList(query: ListUsersQueryParsed): Promise<PaginatedUsers> {
  const { rows, total } = await listUsers(query);

  const items: UserSummary[] = rows.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.fullName,
    role: r.role.name as RoleName, // safe: every seeded role.name is a RoleName member; nothing else writes to this table
    status: r.status,
    createdAt: r.createdAt,
  }));

  return { items, pagination: buildPaginationMeta(query.page, query.limit, total) };
}

export async function getUserDetail(userId: string): Promise<UserSummary> {
  const row = await findUserDetailById(userId);
  if (!row) {
    throw new NotFoundError('User not found.');
  }
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role.name as RoleName,
    status: row.status,
    createdAt: row.createdAt,
  };
}