import { Prisma, ApprovalRequest } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { writeAuditLog } from "../audit/audit.service";
import * as approvalsRepository from "./approvals.repository";
import { toApprovalRequestDto, ApprovalRequestDto } from "./approvals.dto";
import { DecisionInput, ListApprovalRequestsQuery } from "./approvals.schema";
import { executeActivation, executeCancellation, executeReschedule } from "../elections/elections.service";

const REQUEST_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — no explicit LLD figure, a reasonable default

// Dispatch table: what actually happens once a request is APPROVED.
// Deliberately Partial — CANDIDATE_APPROVAL, RESULT_PUBLICATION, and
// MEMBERSHIP_SYNC_OVERRIDE have no resolver yet (Candidates already has
// its own officer-direct approval in Phase 5; Results doesn't exist until
// Phase 8). A request of one of those types reaching quorum today is a
// bug, not a silent no-op — see the throw in resolveAndDispatch below.
const RESOLVERS: Partial<Record<string, (request: ApprovalRequest, tx: Prisma.TransactionClient) => Promise<void>>> = {
  ELECTION_ACTIVATION: (request, tx) => executeActivation(request.resourceId, request.requestedById, tx),
  ELECTION_CANCELLATION: (request, tx) =>
    executeCancellation(request.resourceId, request.requestedById, (request.payload as { reason: string }).reason, tx),
  ELECTION_RESCHEDULE: (request, tx) =>
    executeReschedule(
      request.resourceId, request.requestedById,
      request.payload as { startDate: string; endDate: string }, tx
    ),
};

// Called by elections.service — creates (or reuses) the ApprovalRequest
// that gates one of the three DAT-controlled election actions.
export async function requestApproval(params: {
  actionType: "ELECTION_ACTIVATION" | "ELECTION_CANCELLATION" | "ELECTION_RESCHEDULE";
  electionId: string;
  requestedById: string;
  requiredApprovals: number;
  payload?: Record<string, unknown>;
}): Promise<ApprovalRequestDto> {
  const existing = await approvalsRepository.findPendingRequest(params.electionId, params.actionType);
  if (existing) {
    const tally = await approvalsRepository.getTally(existing.id);
    return toApprovalRequestDto(existing, tally);
  }

  const request = await approvalsRepository.createRequest({
    actionType: params.actionType,
    resourceType: "Election",
    resourceId: params.electionId,
    electionId: params.electionId,
    requestedById: params.requestedById,
    requiredApprovals: params.requiredApprovals,
    payload: params.payload as Prisma.InputJsonValue | undefined,
    expiresAt: new Date(Date.now() + REQUEST_EXPIRY_MS),
  });

  await writeAuditLog({
    actorId: params.requestedById, action: "APPROVAL_REQUESTED", resourceType: "Election",
    resourceId: params.electionId, electionId: params.electionId, outcome: "SUCCESS",
    metadata: { actionType: params.actionType, requiredApprovals: params.requiredApprovals },
  });

  return toApprovalRequestDto(request, { approveCount: 0, rejectCount: 0 });
}

export async function getById(id: string): Promise<ApprovalRequestDto> {
  const request = await approvalsRepository.findRequestById(id);
  if (!request) throw new NotFoundError("Approval request");
  const tally = await approvalsRepository.getTally(id);
  return toApprovalRequestDto(request, tally);
}

export async function list(query: ListApprovalRequestsQuery) {
  const [requests, totalCount] = await approvalsRepository.listRequests(query);
  const withTallies = await Promise.all(
    requests.map(async (r) => toApprovalRequestDto(r, await approvalsRepository.getTally(r.id)))
  );
  return {
    requests: withTallies,
    pagination: { page: query.page, pageSize: query.pageSize, totalCount, totalPages: Math.ceil(totalCount / query.pageSize) },
  };
}

export async function decide(
  approverId: string, requestId: string, input: DecisionInput
): Promise<ApprovalRequestDto> {
  const request = await approvalsRepository.findRequestById(requestId);
  if (!request) throw new NotFoundError("Approval request");

  if (request.status !== "PENDING") {
    throw new ConflictError(`This request has already been resolved (${request.status}).`);
  }
  if (request.expiresAt < new Date()) {
    throw new ConflictError("This approval request has expired.");
  }
  if (request.requestedById === approverId) {
    throw new ForbiddenError("You cannot decide on a request you created yourself.");
  }

  try {
    await approvalsRepository.castDecision(requestId, approverId, input.decision, input.comment);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("You have already cast a decision on this request.");
    }
    throw err;
  }

  const tally = await approvalsRepository.getTally(requestId);

  await writeAuditLog({
    actorId: approverId, action: "APPROVAL_DECIDED", resourceType: "Election",
    resourceId: request.resourceId, electionId: request.electionId ?? undefined, outcome: "SUCCESS",
    metadata: { decision: input.decision, ...tally },
  });

  // Veto: a single REJECT resolves immediately regardless of approve count.
  if (tally.rejectCount >= 1) {
    return resolveAndDispatch(request, "REJECTED", tally);
  }

  if (tally.approveCount >= request.requiredApprovals) {
    return resolveAndDispatch(request, "APPROVED", tally);
  }

  return toApprovalRequestDto(request, tally); // still PENDING
}

async function resolveAndDispatch(
  request: ApprovalRequest, finalStatus: "APPROVED" | "REJECTED", tally: { approveCount: number; rejectCount: number }
): Promise<ApprovalRequestDto> {
  let claimed = false;

  await prisma.$transaction(async (tx) => {
    claimed = await approvalsRepository.claimResolution(request.id, finalStatus, tx);
    if (!claimed) return; // lost the race — another decision already resolved this request

    if (finalStatus === "APPROVED") {
      const resolver = RESOLVERS[request.actionType];
      if (!resolver) {
        throw new Error(
          `No resolver registered for actionType '${request.actionType}' — this request type should not be able to reach quorum yet.`
        );
      }
      await resolver(request, tx);
      await approvalsRepository.markExecuted(request.id, tx);
    }
  });

  await writeAuditLog({
    actorId: request.requestedById, action: finalStatus === "APPROVED" ? "APPROVAL_EXECUTED" : "APPROVAL_REJECTED",
    resourceType: "Election", resourceId: request.resourceId, electionId: request.electionId ?? undefined,
    outcome: "SUCCESS", metadata: { claimed, ...tally },
  });

  const updated = await approvalsRepository.findRequestById(request.id);
  return toApprovalRequestDto(updated!, tally);
}