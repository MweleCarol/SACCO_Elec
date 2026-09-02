import { Election } from "@prisma/client";
import { assertValidTransition, InvalidTransitionError } from "../../shared/constants/election-transitions";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { writeAuditLog } from "../audit/audit.service";
import * as electionsRepository from "./elections.repository";
import { toElectionDto, ElectionDto, PaginatedElectionsDto } from "./elections.dto";
import {
  CreateElectionInput, UpdateElectionInput, RescheduleElectionInput, ReviewApprovalInput, ListElectionsQuery,
} from "./elections.schema";

async function getElectionOrThrow(id: string): Promise<Election> {
  const election = await electionsRepository.findElectionById(id);
  if (!election) throw new NotFoundError("Election");
  return election;
}

export async function createElection(officerId: string, input: CreateElectionInput): Promise<ElectionDto> {
  const election = await electionsRepository.createElection({
    name: input.name,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    requiredApprovals: input.requiredApprovals,
    createdById: officerId,
  });

  await writeAuditLog({
    actorId: officerId, action: "ELECTION_CREATED", resourceType: "Election",
    resourceId: election.id, electionId: election.id, outcome: "SUCCESS",
  });

  return toElectionDto(election);
}

export async function updateElection(
  officerId: string, electionId: string, input: UpdateElectionInput
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

  const updated = await electionsRepository.updateElection(electionId, input, officerId);

  await writeAuditLog({
    actorId: officerId, action: "ELECTION_UPDATED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
  });

  return toElectionDto(updated);
}

export async function getElection(id: string): Promise<ElectionDto> {
  return toElectionDto(await getElectionOrThrow(id));
}

export async function listElections(query: ListElectionsQuery): Promise<PaginatedElectionsDto> {
  const { elections, totalCount } = await electionsRepository.listElections(query);
  return {
    elections: elections.map(toElectionDto),
    pagination: {
      page: query.page, pageSize: query.pageSize, totalCount,
      totalPages: Math.ceil(totalCount / query.pageSize),
    },
  };
}

export async function submitForApproval(officerId: string, electionId: string): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  try {
    assertValidTransition(election.status, "PENDING_APPROVAL");
  } catch (err) {
    if (err instanceof InvalidTransitionError) throw new ConflictError(err.message);
    throw err;
  }

  const updated = await electionsRepository.setElectionStatus(electionId, "PENDING_APPROVAL", officerId);

  await writeAuditLog({
    actorId: officerId, action: "ELECTION_SUBMITTED_FOR_APPROVAL", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
  });

  return toElectionDto(updated);
}

// --- TEMPORARY STOPGAP — replace in Phase 7 ---
// Real DAT requires N-of-M distinct officers approving via
// ApprovalRequest/ApprovalDecision (LLD §11). Until that module exists,
// a single ELECTION_ADMINISTRATOR can approve/reject directly so the rest
// of the election lifecycle (activate, candidates, voting) can be built
// and tested without waiting on Phase 7. Every call site of this function
// is annotated the same way, so `grep`-ing "TEMPORARY STOPGAP" finds every
// place that needs rewiring once real DAT lands.
export async function reviewApproval(
  adminId: string, electionId: string, input: ReviewApprovalInput
): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  if (election.status !== "PENDING_APPROVAL") {
    throw new ConflictError("This election is not awaiting approval.");
  }

  const nextStatus = input.decision === "APPROVE" ? "APPROVED" : "DRAFT";
  const updated = await electionsRepository.setElectionStatus(electionId, nextStatus, adminId);

  await writeAuditLog({
    actorId: adminId,
    action: input.decision === "APPROVE" ? "ELECTION_APPROVED" : "ELECTION_REJECTED",
    resourceType: "Election", resourceId: electionId, electionId, outcome: "SUCCESS",
    metadata: { comment: input.comment, stopgap: "single_admin_review_pending_phase_7_dat" },
  });

  return toElectionDto(updated);
}
// --- END TEMPORARY STOPGAP ---

export async function activateElection(officerId: string, electionId: string): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  try {
    assertValidTransition(election.status, "ACTIVE");
  } catch (err) {
    if (err instanceof InvalidTransitionError) throw new ConflictError(err.message);
    throw err;
  }

  const updated = await electionsRepository.setElectionStatus(electionId, "ACTIVE", officerId, "activatedAt");

  await writeAuditLog({
    actorId: officerId, action: "ELECTION_ACTIVATED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
  });

  return toElectionDto(updated);
}

export async function closeElection(officerId: string, electionId: string): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  try {
    assertValidTransition(election.status, "CLOSED");
  } catch (err) {
    if (err instanceof InvalidTransitionError) throw new ConflictError(err.message);
    throw err;
  }

  const updated = await electionsRepository.setElectionStatus(electionId, "CLOSED", officerId, "closedAt");

  await writeAuditLog({
    actorId: officerId, action: "ELECTION_CLOSED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
  });

  return toElectionDto(updated);
}

// Cancellation uses the same temporary stopgap as approval — an
// ELECTION_ADMINISTRATOR can cancel directly for now, real DAT quorum
// comes in Phase 7.
export async function cancelElection(
  adminId: string, electionId: string, reason: string
): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  try {
    assertValidTransition(election.status, "ARCHIVED");
  } catch (err) {
    if (err instanceof InvalidTransitionError) throw new ConflictError(err.message);
    throw err;
  }

  const updated = await electionsRepository.setElectionStatus(electionId, "ARCHIVED", adminId, "archivedAt");

  await writeAuditLog({
    actorId: adminId, action: "ELECTION_CANCELLED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
    metadata: { reason, stopgap: "single_admin_review_pending_phase_7_dat" },
  });

  return toElectionDto(updated);
}

export async function rescheduleElection(
  officerId: string, electionId: string, input: RescheduleElectionInput
): Promise<ElectionDto> {
  const election = await getElectionOrThrow(electionId);

  if (!["DRAFT", "APPROVED", "SCHEDULED"].includes(election.status)) {
    throw new ForbiddenError("This election can no longer be rescheduled.");
  }

  // Changing dates on an already-APPROVED election is a materially
  // different election than what got approved — sending it back to
  // PENDING_APPROVAL forces a fresh review rather than letting a
  // schedule change slip through under an old approval.
  const requiresReapproval = election.status === "APPROVED" || election.status === "SCHEDULED";

  const updated = await electionsRepository.updateElection(
    electionId,
    { startDate: input.startDate, endDate: input.endDate },
    officerId
  );

  const final = requiresReapproval
    ? await electionsRepository.setElectionStatus(electionId, "PENDING_APPROVAL", officerId)
    : updated;

  await writeAuditLog({
    actorId: officerId, action: "ELECTION_RESCHEDULED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
    metadata: { requiresReapproval },
  });

  return toElectionDto(final);
}