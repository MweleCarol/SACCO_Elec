import { UserRole } from "@prisma/client";
import { env } from "../../config/env";

// Two-factor sign-in is compulsory for these roles and optional for members.
export const STAFF_ROLES: readonly UserRole[] = ["ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

// Development shortcut (see DEV_SKIP_MFA in env.ts). Only ever true when
// NODE_ENV is "development"; tests and production always enforce two-factor.
export const devSkipMfa = env.DEV_SKIP_MFA && env.NODE_ENV === "development";

// A staff account that has not set up two-factor may only use its own
// account pages (/auth/*, GET /users/me) until it does.
export function mfaSetupRequired(user: { role: UserRole; mfaEnabled: boolean }): boolean {
  return isStaffRole(user.role) && !user.mfaEnabled && !devSkipMfa;
}