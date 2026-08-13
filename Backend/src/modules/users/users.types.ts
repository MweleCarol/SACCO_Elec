/**
 * Users Module — Internal Types
 *
 * Types used only within this module's own service/repository layer —
 * never returned directly to a controller. External-facing shapes live
 * in users.dto.ts.
 */
import type { RoleName } from '@shared/types/role.types';

/**
 * Roles the single-create endpoint may provision directly. MEMBER is
 * excluded — member accounts only ever arrive via provisionEligibleMembers,
 * never single-create, because only that path links a User to its
 * MemberSync row.
 */
export type SingleCreatableRole = Exclude<RoleName, 'MEMBER'>;