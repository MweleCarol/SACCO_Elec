/**
 * Shared Enums — Prisma Enum Re-exports
 *
 * Architecture pattern: Anti-Corruption Layer
 * Layer: Shared Infrastructure
 *
 * WHY re-export instead of importing from generated Prisma client directly?
 *
 * The generated Prisma client lives at `../generated/prisma`. Its output path
 * is an implementation detail of the ORM layer — it could change if you
 * switch from Prisma to another ORM, regenerate to a different path, or
 * restructure the project.
 *
 * If every module imports directly from `@/generated/prisma`, and that path
 * changes, you have 40+ files to update. If every module imports from
 * `@shared/enums`, you update one line here.
 *
 * This is the Anti-Corruption Layer pattern — you don't let generated/external
 * types leak into your domain layer. Your domain speaks your terms; the
 * generated types are translated at the boundary.
 *
 * USAGE in any module:
 *   import { ElectionStatus, UserStatus } from '@shared/enums';
 *   // NOT: import { ElectionStatus } from '@/generated/prisma';
 */

export {
  UserStatus,
  ElectionStatus,
  CandidateStatus,
  ApprovalActionType,
  ApprovalStatus,
  ApprovalDecision,
  SyncMode,
  EligibilityStatus,
  SyncStatus,
  
} from '../../generated/prisma/client'; // relative, 2 levels up from src/shared/enums/ — generated code is never aliased (Architecture Decision #5)

import type { ElectionStatus } from '../../generated/prisma/client';

/**
 * Election state machine — valid transitions only.
 *
 * Typed as Record<ElectionStatus, ElectionStatus[]> rather than
 * Record<string, string[]> deliberately: this forces the object to have
 * exactly one entry per ElectionStatus member. If the Prisma schema ever
 * gains a new status, TypeScript fails the build here until this map is
 * updated — instead of the gap surfacing later as an election silently
 * stuck in an undefined state.
 *
 * DRAFT → PENDING_APPROVAL
 * PENDING_APPROVAL → SCHEDULED (after required approvals)
 * PENDING_APPROVAL → DRAFT (if rejected)
 * SCHEDULED → ACTIVE (manual trigger or scheduled job)
 * ACTIVE → CLOSED (manual trigger or scheduled job)
 * CLOSED → RESULTS_PENDING (tally initiated)
 * RESULTS_PENDING → ARCHIVED (after results published)
 *
 * No state can skip ahead. No state can go backward.
 * The ElectionStateError is thrown when a transition is attempted out of order.
 */
export const VALID_ELECTION_TRANSITIONS: Record<ElectionStatus, ElectionStatus[]> = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['SCHEDULED', 'DRAFT'],
  SCHEDULED: ['ACTIVE'],
  ACTIVE: ['CLOSED'],
  CLOSED: ['RESULTS_PENDING'],
  RESULTS_PENDING: ['ARCHIVED'],
  ARCHIVED: [],
};