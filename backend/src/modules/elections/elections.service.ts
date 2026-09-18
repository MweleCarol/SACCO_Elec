import { Election, Prisma } from "@prisma/client";
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
// Circular import note: approvals.service.ts imports executeActivation/
// executeCancellation/executeReschedule from this file, and this file
// imports requestApproval from approvals.service.ts. This is safe here
// specifically because neither side calls the other's export at module-
// load time — only inside async function bodies invoked later, by which
// point both modules have finished initializing. If this ever becomes
// fragile, the fix is moving the three execute* functions to their own
// file rather than restructuring the approval flow itself.
import { requestApproval } from "../approvals/approvals.service";

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

// Single-administrator editorial review of the election plan itself
// (LLD §8's Draft -> Pending Approval -> Approved step) — distinct from
// DAT, which gates the three actions below. This is NOT a stopgap; it's
// staying as single-reviewer by design, per the Phase 7 discussion.
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
    metadata: { comment: input.comment },
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

// --- These three REQUEST DAT approval; they no longer transition the election directly ---

export async function activateElection(officerId: string, electionId: string) {
  const election = await getElectionOrThrow(electionId);
  assertValidTransition(election.status, "ACTIVE");

  return requestApproval({
    actionType: "ELECTION_ACTIVATION",
    electionId,
    requestedById: officerId,
    requiredApprovals: election.requiredApprovals,
  });
}

export async function cancelElection(adminId: string, electionId: string, reason: string) {
  const election = await getElectionOrThrow(electionId);
  assertValidTransition(election.status, "ARCHIVED");

  return requestApproval({
    actionType: "ELECTION_CANCELLATION",
    electionId,
    requestedById: adminId,
    requiredApprovals: election.requiredApprovals,
    payload: { reason },
  });
}

export async function rescheduleElection(officerId: string, electionId: string, input: RescheduleElectionInput) {
  const election = await getElectionOrThrow(electionId);
  if (!["DRAFT", "APPROVED", "SCHEDULED"].includes(election.status)) {
    throw new ForbiddenError("This election can no longer be rescheduled.");
  }

  return requestApproval({
    actionType: "ELECTION_RESCHEDULE",
    electionId,
    requestedById: officerId,
    requiredApprovals: election.requiredApprovals,
    payload: { startDate: input.startDate.toISOString(), endDate: input.endDate.toISOString() },
  });
}

// --- These three EXECUTE the actual transition, called only by approvals.service after quorum ---

export async function executeActivation(electionId: string, officerId: string, tx: Prisma.TransactionClient) {
  await tx.election.update({
    where: { id: electionId }, data: { status: "ACTIVE", activatedAt: new Date(), updatedById: officerId },
  });
  await writeAuditLog({
    actorId: officerId, action: "ELECTION_ACTIVATED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
  });
}

export async function executeCancellation(
  electionId: string, adminId: string, reason: string, tx: Prisma.TransactionClient
) {
  await tx.election.update({
    where: { id: electionId }, data: { status: "ARCHIVED", archivedAt: new Date(), updatedById: adminId },
  });
  await writeAuditLog({
    actorId: adminId, action: "ELECTION_CANCELLED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS", metadata: { reason },
  });
}

export async function executeReschedule(
  electionId: string, officerId: string, dates: { startDate: string; endDate: string }, tx: Prisma.TransactionClient
) {
  await tx.election.update({
    where: { id: electionId },
    data: { startDate: new Date(dates.startDate), endDate: new Date(dates.endDate), updatedById: officerId },
  });
  await writeAuditLog({
    actorId: officerId, action: "ELECTION_RESCHEDULED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
  });
}