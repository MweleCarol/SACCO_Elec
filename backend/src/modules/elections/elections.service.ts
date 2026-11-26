import { Election, ElectionStatus, Prisma, UserRole } from "@prisma/client";
import {
  assertValidTransition,
  InvalidTransitionError,
} from "../../shared/constants/election-transitions";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import {
  assertElectionVisible,
  memberVisibleElectionWhere,
  seesEverything,
} from "../../shared/constants/visibility";
import {
  writeAuditLog,
  writeAuditLogInTransaction,
} from "../audit/audit.service";
import * as electionsRepository from "./elections.repository";
import {
  toElectionDto,
  ElectionDto,
  PaginatedElectionsDto,
} from "./elections.dto";
import {
  CreateElectionInput,
  UpdateElectionInput,
  RescheduleElectionInput,
  ReviewApprovalInput,
  ListElectionsQuery,
} from "./elections.schema";
// Circular import: approvals.service imports the execute* functions below, and
// this file imports requestApproval. Safe because neither side calls the other
// at module-load time, only inside async function bodies.
import { requestApproval } from "../approvals/approvals.service";
import {
  notify,
  notifyAllActiveMembers,
} from "../notifications/notifications.service";

async function getElectionOrThrow(id: string): Promise<Election> {
  const election = await electionsRepository.findElectionById(id);
  if (!election) throw new NotFoundError("Election");
  return election;
}

// Turns an invalid lifecycle transition into a 409 instead of an unhandled 500.
function assertTransitionOrConflict(
  from: ElectionStatus,
  to: ElectionStatus,
): void {
  try {
    assertValidTransition(from, to);
  } catch (err) {
    if (err instanceof InvalidTransitionError)
      throw new ConflictError(err.message);
    throw err;
  }
}

export async function createElection(
  officerId: string,
  input: CreateElectionInput,
): Promise<ElectionDto> {
  const election = await electionsRepository.createElection({
    name: input.name,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    requiredApprovals: input.requiredApprovals,
    createdById: officerId,
  });

  await writeAuditLog({
    actorId: officerId,
    action: "ELECTION_CREATED",
    resourceType: "Election",
    resourceId: election.id,
    electionId: election.id,
    outcome: "SUCCESS",
  });

  return toElectionDto(election);
}

export async function updateElection(
  officerId: string,
  electionId: string,
  input: UpdateElectionInput,
): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  if (election.status !== "DRAFT") {
    throw new ForbiddenError("Only elections in DRAFT status can be edited.");
  }

  const startDate = input.startDate ?? election.startDate;
  const endDate = input.endDate ?? election.endDate;
  if (endDate <= startDate) {
    throw new ConflictError("End date must be after start date.");
  }

  const updated = await electionsRepository.updateElection(
    electionId,
    input,
    officerId,
  );

  await writeAuditLog({
    actorId: officerId,
    action: "ELECTION_UPDATED",
    resourceType: "Election",
    resourceId: electionId,
    electionId,
    outcome: "SUCCESS",
  });

  return toElectionDto(updated);
}

export async function getElection(
  role: UserRole,
  id: string,
): Promise<ElectionDto> {
  const election = await electionsRepository.findElectionById(id);
  assertElectionVisible(role, election);
  return toElectionDto(election);
}

export async function listElections(
  role: UserRole,
  query: ListElectionsQuery,
): Promise<PaginatedElectionsDto> {
  const { elections, totalCount } = await electionsRepository.listElections({
    ...query,
    visibilityWhere: seesEverything(role)
      ? undefined
      : memberVisibleElectionWhere,
  });
  return {
    elections: elections.map(toElectionDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / query.pageSize),
    },
  };
}

export async function submitForApproval(
  officerId: string,
  electionId: string,
): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  try {
    assertValidTransition(election.status, "PENDING_APPROVAL");
  } catch (err) {
    if (err instanceof InvalidTransitionError)
      throw new ConflictError(err.message);
    throw err;
  }

  // An administrator cannot meaningfully review an election with no ballot.
  if ((await electionsRepository.countPositions(electionId)) === 0) {
    throw new ConflictError(
      "Add at least one position before submitting the election for review.",
    );
  }

  const updated = await electionsRepository.setElectionStatus(
    electionId,
    "PENDING_APPROVAL",
    officerId,
  );

  await writeAuditLog({
    actorId: officerId,
    action: "ELECTION_SUBMITTED_FOR_APPROVAL",
    resourceType: "Election",
    resourceId: electionId,
    electionId,
    outcome: "SUCCESS",
  });

  return toElectionDto(updated);
}

// Single-administrator editorial review of the election plan (LLD section 8).
// Distinct from DAT, which gates activation, cancellation, rescheduling and
// publication. This is permanent by design, not a stopgap.
export async function reviewApproval(
  adminId: string,
  electionId: string,
  input: ReviewApprovalInput,
): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  if (election.status !== "PENDING_APPROVAL") {
    throw new ConflictError("This election is not awaiting approval.");
  }

  const nextStatus = input.decision === "APPROVE" ? "APPROVED" : "DRAFT";
  // approvedAt records the admin's approval. A rejection leaves it unchanged
  // (still null for an election that was never approved).
  const updated = await electionsRepository.setElectionStatus(
    electionId,
    nextStatus,
    adminId,
    nextStatus === "APPROVED" ? "approvedAt" : undefined,
  );

  await writeAuditLog({
    actorId: adminId,
    action:
      input.decision === "APPROVE" ? "ELECTION_APPROVED" : "ELECTION_REJECTED",
    resourceType: "Election",
    resourceId: electionId,
    electionId,
    outcome: "SUCCESS",
    metadata: { comment: input.comment },
  });

  // Tell the officer who prepared it, with the administrator's comment, so a
  // returned draft says what to fix. Fire-and-forget, like other notifications.
  const approved = input.decision === "APPROVE";
  notify([election.createdById], {
    type: "APPROVAL_DECIDED",
    title: approved
      ? "Your election was approved"
      : "Your election was sent back to draft",
    message: approved
      ? `"${election.name}" was approved. Members can now see it.${input.comment ? ` Comment: ${input.comment}` : ""}`
      : `"${election.name}" needs changes before it can be approved.${input.comment ? ` Administrator's note: ${input.comment}` : ""}`,
    electionId,
  }).catch(() => {});

  return toElectionDto(updated);
}

export async function closeElection(
  officerId: string,
  electionId: string,
): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  try {
    assertValidTransition(election.status, "CLOSED");
  } catch (err) {
    if (err instanceof InvalidTransitionError)
      throw new ConflictError(err.message);
    throw err;
  }

  const updated = await electionsRepository.markClosed(
    electionId,
    officerId,
    await electionsRepository.countEligibleVoters(),
  );

  await writeAuditLog({
    actorId: officerId,
    action: "ELECTION_CLOSED",
    resourceType: "Election",
    resourceId: electionId,
    electionId,
    outcome: "SUCCESS",
    metadata: { trigger: "MANUAL" },
  });

  notifyVotingClosed(updated);
  return toElectionDto(updated);
}

// Fire-and-forget, after the close is saved. Same message whether an officer
// closed the election or the scheduler did.
function notifyVotingClosed(election: Election): void {
  notifyAllActiveMembers({
    type: "ELECTION_CLOSED",
    title: "Voting has closed",
    message: `Voting for "${election.name}" has closed. Results will be shared once they are published.`,
    electionId: election.id,
  }).catch(() => {});
}

// Called by the scheduler (src/jobs/scheduler.ts). Closes every ACTIVE
// election whose end date has passed, audits it as a system action
// (actorId null), and notifies active members. Returns the ids closed.
export async function autoCloseEndedElections(
  now: Date = new Date(),
): Promise<string[]> {
  const ended = await electionsRepository.findEndedActiveElections(now);
  const closed: string[] = [];
  if (ended.length === 0) return closed;
  const eligibleVoterCount = await electionsRepository.countEligibleVoters();

  for (const election of ended) {
    if (
      !(await electionsRepository.closeIfEnded(
        election.id,
        now,
        eligibleVoterCount,
      ))
    )
      continue;
    closed.push(election.id);

    await writeAuditLog({
      actorId: null,
      action: "ELECTION_CLOSED",
      resourceType: "Election",
      resourceId: election.id,
      electionId: election.id,
      outcome: "SUCCESS",
      metadata: {
        trigger: "SCHEDULED",
        endDate: election.endDate.toISOString(),
      },
    });
    notifyVotingClosed(election);
  }

  return closed;
}

// Voting can only open on a complete ballot: at least one position, every
// position with at least one approved candidate, and a voting period that has
// not already ended. Checked when activation is requested and again inside the
// activation transaction, because a candidate may withdraw in between.
async function assertBallotReady(
  election: Election,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const positions = await electionsRepository.ballotReadiness(election.id, tx);
  if (positions.length === 0) {
    throw new ConflictError("The ballot has no positions.");
  }
  const empty = positions
    .filter((p) => p._count.candidates === 0)
    .map((p) => p.name);
  if (empty.length > 0) {
    throw new ConflictError(
      `Voting cannot open yet: no approved candidate for ${empty.join(", ")}.`,
    );
  }
  if (election.endDate <= new Date()) {
    throw new ConflictError(
      "The voting period has already ended. Reschedule the election before opening voting.",
    );
  }
}

// --- These three REQUEST DAT approval; they do not transition the election ---

export async function activateElection(officerId: string, electionId: string) {
  const election = await getElectionOrThrow(electionId);
  assertTransitionOrConflict(election.status, "ACTIVE");
  await assertBallotReady(election);

  return requestApproval({
    actionType: "ELECTION_ACTIVATION",
    electionId,
    requestedById: officerId,
    requiredApprovals: election.requiredApprovals,
  });
}

export async function cancelElection(
  adminId: string,
  electionId: string,
  reason: string,
) {
  const election = await getElectionOrThrow(electionId);
  assertTransitionOrConflict(election.status, "ARCHIVED");

  return requestApproval({
    actionType: "ELECTION_CANCELLATION",
    electionId,
    requestedById: adminId,
    requiredApprovals: election.requiredApprovals,
    payload: { reason },
  });
}

export async function rescheduleElection(
  officerId: string,
  electionId: string,
  input: RescheduleElectionInput,
) {
  const election = await getElectionOrThrow(electionId);
  if (!["DRAFT", "APPROVED", "SCHEDULED"].includes(election.status)) {
    throw new ForbiddenError("This election can no longer be rescheduled.");
  }

  return requestApproval({
    actionType: "ELECTION_RESCHEDULE",
    electionId,
    requestedById: officerId,
    requiredApprovals: election.requiredApprovals,
    payload: {
      startDate: input.startDate.toISOString(),
      endDate: input.endDate.toISOString(),
    },
  });
}

// --- These three EXECUTE the change. Called only by approvals.service, inside
// its resolution transaction, after DAT quorum is reached. They are FAIL-CLOSED:
// the audit row is written in the same transaction, so a failed audit write
// rolls the whole action back. ---

// A DAT request can sit pending for days, so re-check the election's CURRENT
// status inside the transaction before acting on an old approval.
async function assertTransitionInTx(
  tx: Prisma.TransactionClient,
  electionId: string,
  to: ElectionStatus,
): Promise<void> {
  const current = await tx.election.findUnique({ where: { id: electionId } });
  if (!current) throw new NotFoundError("Election");
  try {
    assertValidTransition(current.status, to);
  } catch (err) {
    if (err instanceof InvalidTransitionError)
      throw new ConflictError(err.message);
    throw err;
  }
}

// Returns a callback that approvals.service runs only AFTER the transaction
// commits, so no notification goes out for an action that rolled back.
export async function executeActivation(
  electionId: string,
  officerId: string,
  tx: Prisma.TransactionClient,
): Promise<() => void> {
  await assertTransitionInTx(tx, electionId, "ACTIVE");
  const current = await tx.election.findUniqueOrThrow({
    where: { id: electionId },
  });
  await assertBallotReady(current, tx);

  const election = await tx.election.update({
    where: { id: electionId },
    data: { status: "ACTIVE", activatedAt: new Date(), updatedById: officerId },
  });

  await writeAuditLogInTransaction(tx, {
    actorId: officerId,
    action: "ELECTION_ACTIVATED",
    resourceType: "Election",
    resourceId: electionId,
    electionId,
    outcome: "SUCCESS",
  });

  return () => {
    notifyAllActiveMembers({
      type: "ELECTION_ACTIVATED",
      title: "Voting is now open",
      message: `"${election.name}" is now open for voting.`,
      electionId,
    }).catch(() => {});
  };
}

export async function executeCancellation(
  electionId: string,
  adminId: string,
  reason: string,
  tx: Prisma.TransactionClient,
): Promise<undefined> {
  await assertTransitionInTx(tx, electionId, "ARCHIVED");

  await tx.election.update({
    where: { id: electionId },
    data: { status: "ARCHIVED", archivedAt: new Date(), updatedById: adminId },
  });

  await writeAuditLogInTransaction(tx, {
    actorId: adminId,
    action: "ELECTION_CANCELLED",
    resourceType: "Election",
    resourceId: electionId,
    electionId,
    outcome: "SUCCESS",
    metadata: { reason },
  });

  return undefined;
}

export async function executeReschedule(
  electionId: string,
  officerId: string,
  dates: { startDate: string; endDate: string },
  tx: Prisma.TransactionClient,
): Promise<undefined> {
  const current = await tx.election.findUnique({ where: { id: electionId } });
  if (!current) throw new NotFoundError("Election");
  if (!["DRAFT", "APPROVED", "SCHEDULED"].includes(current.status)) {
    throw new ConflictError("This election can no longer be rescheduled.");
  }

  await tx.election.update({
    where: { id: electionId },
    data: {
      startDate: new Date(dates.startDate),
      endDate: new Date(dates.endDate),
      updatedById: officerId,
    },
  });

  await writeAuditLogInTransaction(tx, {
    actorId: officerId,
    action: "ELECTION_RESCHEDULED",
    resourceType: "Election",
    resourceId: electionId,
    electionId,
    outcome: "SUCCESS",
  });

  return undefined;
}
