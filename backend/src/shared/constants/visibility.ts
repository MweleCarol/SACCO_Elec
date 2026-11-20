import { Election, ElectionStatus, Prisma, UserRole } from "@prisma/client";
import { NotFoundError } from "../errors/NotFoundError";

// Read-visibility policy (handoff K6):
// - Members see elections from APPROVED onwards, and APPROVED candidates only.
//   An ARCHIVED election counts only if it was approved first (approvedAt is
//   set), so a draft cancelled before approval stays hidden.
// - Officers, administrators and auditors see everything.
//
// A hidden election is reported as "not found" (404), not "forbidden"
// (403): a 403 would confirm to a member that the draft exists.

const MEMBER_VISIBLE_LIVE_STATUSES: ElectionStatus[] = [
  "APPROVED",
  "SCHEDULED",
  "ACTIVE",
  "CLOSED",
  "RESULTS_PUBLISHED",
];

export function seesEverything(role: UserRole): boolean {
  return role !== "MEMBER";
}

export function canSeeElection(
  role: UserRole,
  election: Pick<Election, "status" | "approvedAt">
): boolean {
  if (seesEverything(role)) return true;
  if (MEMBER_VISIBLE_LIVE_STATUSES.includes(election.status)) return true;
  return election.status === "ARCHIVED" && election.approvedAt !== null;
}

// The same rule as canSeeElection, as a database filter for list queries.
export const memberVisibleElectionWhere: Prisma.ElectionWhereInput = {
  OR: [
    { status: { in: MEMBER_VISIBLE_LIVE_STATUSES } },
    { status: "ARCHIVED", approvedAt: { not: null } },
  ],
};

// Throws 404 when the election is missing or hidden from this role.
export function assertElectionVisible(role: UserRole, election: Election | null): asserts election is Election {
  if (!election || !canSeeElection(role, election)) {
    throw new NotFoundError("Election");
  }
}