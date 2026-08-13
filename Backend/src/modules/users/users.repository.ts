// src/modules/users/users.repository.ts
import { prisma } from '@database/client';
import { Prisma } from '../../generated/prisma/client'; // relative, 2 levels up from src/modules/users/ — generated code is never aliased (Architecture Decision #5)
import { UserStatus } from '@shared/enums';
import type { RoleName } from '@shared/types/role.types';

// ---------------------------------------------------------------------
// Bulk Member Provisioning
// ---------------------------------------------------------------------

/**
 * MemberSync rows that are eligible for membership AND don't already
 * have a User account. `user: null` is the Prisma filter for "no
 * related User row exists" on this optional back-relation — this IS
 * the idempotency guarantee: running provisionEligibleMembers() twice
 * only ever acts on the delta, because already-provisioned members
 * simply stop matching this query.
 */
export async function findEligibleMembersWithoutUserAccount(): Promise<
  { id: string; email: string | null; fullName: string }[]
> {
  return prisma.memberSync.findMany({
    where: { eligibilityStatus: 'ELIGIBLE', user: null },
    select: { id: true, email: true, fullName: true },
  });
}

/**
 * One MemberSync row -> one User, linked via memberId. roleId arrives
 * already resolved — this function has no business knowing role NAMES,
 * same discipline as every other repository function in this codebase.
 */
export async function createUserForMember(input: {
  memberId: string;
  email: string;
  fullName: string;
  roleId: string;
}): Promise<{ id: string } | { conflict: 'email' | 'memberId' }> {
  try {
    const user = await prisma.user.create({
      data: {
        memberId: input.memberId,
        email: input.email,
        fullName: input.fullName,
        passwordHash: null,
        status: UserStatus.PENDING_ACTIVATION,
        roleId: input.roleId,
      },
      select: { id: true },
    });
    return { id: user.id };
  } catch (err) {
    const conflict = classifyUniqueConflict(err);
    if (conflict) return { conflict };
    throw err; // anything else is a real, unexpected failure — let it propagate, don't swallow it
  }
}

// ---------------------------------------------------------------------
// Single User Creation (officers, admin, auditor, observer)
// ---------------------------------------------------------------------

export async function createSingleUser(input: {
  email: string;
  fullName: string;
  roleId: string;
}): Promise<{ id: string } | { conflict: 'email' }> {
  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: null,
        status: UserStatus.PENDING_ACTIVATION,
        roleId: input.roleId,
      },
      select: { id: true },
    });
    return { id: user.id };
  } catch (err) {
    const conflict = classifyUniqueConflict(err);
    if (conflict === 'memberId') {
      // Unreachable in practice — this path never sets memberId.
      // If it ever actually fires, that's a real bug worth surfacing
      // loudly, not silently mapping to a result type that implies
      // it's normal.
      throw err;
    }
    if (conflict === 'email') return { conflict: 'email' };
    throw err;
  }
}

/**
 * Shared P2002 interpretation for both create functions.
 *
 * NOT YET VERIFIED against this project's actual Prisma 7 +
 * @prisma/adapter-pg setup. This is carried over from an earlier draft
 * with the same caveat it originally had — the .includes() matching
 * (vs exact equality) is a hedge against not knowing whether Prisma
 * reports the logical field name or the physical column name on a
 * driver-adapter setup this new. Confirm with a real duplicate-email
 * insert (see generate-p2002-check.ts) before trusting this against
 * production data — this determines whether a bulk provisioning run's
 * summary is trustworthy or silently wrong.
 */
interface DriverAdapterUniqueConstraintMeta {
  driverAdapterError?: {
    cause?: {
      constraint?: { fields?: string[] };
    };
  };
}

function classifyUniqueConflict(err: unknown): 'email' | 'memberId' | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
    return null;
  }
  const meta = err.meta as DriverAdapterUniqueConstraintMeta | undefined;
  const fields = meta?.driverAdapterError?.cause?.constraint?.fields ?? [];

  if (fields.some((f) => f.includes('email'))) return 'email';
  if (fields.some((f) => f.includes('member'))) return 'memberId';
  return null;
}

// ---------------------------------------------------------------------
// Listing / Lookup
// ---------------------------------------------------------------------

export interface ListUsersFilter {
  status?: UserStatus;
  role?: RoleName;
  page: number;
  limit: number;
}

const userSummarySelect = {
  id: true,
  email: true,
  fullName: true,
  status: true,
  createdAt: true,
  role: { select: { name: true } },
} as const;

/**
 * Filtering by role NAME needs no role-cache lookup at all — Prisma
 * turns a relation filter into a join/subquery against the live Role
 * table at query time. Contrast with the create functions above:
 * writes need a resolved roleId because the FK column demands one;
 * reads can go through the relation directly. Different sides of the
 * same table, genuinely different requirements.
 */
export async function listUsers(filter: ListUsersFilter) {
  const where: Prisma.UserWhereInput = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.role ? { role: { name: filter.role } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSummarySelect,
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return { rows, total };
}

export async function findUserDetailById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userSummarySelect,
  });
}