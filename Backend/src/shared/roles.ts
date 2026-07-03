import type { Role } from "@prisma/client";

/**
 * Roles that hold administrative power over the election process. TOTP is
 * mandatory for these the moment it's enrolled; MEMBER accounts may use it
 * optionally but it is never required to cast a vote.
 */
export const ADMIN_TIER_ROLES: readonly Role[] = [
  "TRUSTEE_ADMIN",
  "ELECTION_OFFICER",
  "AUDITOR",
  "SACCO_MANAGEMENT",
];

export function isAdminTierRole(role: Role): boolean {
  return (ADMIN_TIER_ROLES as string[]).includes(role);
}