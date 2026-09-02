import { ElectionStatus } from "@prisma/client";

// The full lifecycle graph from LLD §8 / task spec §10. Every state
// transition in elections.service.ts is checked against this — no
// service function ever sets `status` without going through
// assertValidTransition first, so an invalid jump (e.g. CLOSED -> ACTIVE)
// fails the same way regardless of which endpoint tried it.
export const ELECTION_TRANSITIONS: Record<ElectionStatus, ElectionStatus[]> = {
  DRAFT: ["PENDING_APPROVAL", "ARCHIVED"],
  PENDING_APPROVAL: ["APPROVED", "DRAFT"], // DRAFT = rejected, sent back for edits
  APPROVED: ["SCHEDULED", "ACTIVE", "ARCHIVED"],
  SCHEDULED: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["CLOSED"],
  CLOSED: ["RESULTS_PUBLISHED"],
  RESULTS_PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [], // terminal
};

export class InvalidTransitionError extends Error {
  constructor(from: ElectionStatus, to: ElectionStatus) {
    super(`Cannot transition an election from ${from} to ${to}.`);
  }
}

export function assertValidTransition(from: ElectionStatus, to: ElectionStatus): void {
  if (!ELECTION_TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}