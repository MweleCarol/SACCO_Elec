import { Prisma, ApprovalRequest } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { writeAuditLog, writeAuditLogInTransaction } from "../audit/audit.service";
import { notify, notifyApprovers } from "../notifications/notifications.service";
import * as approvalsRepository from "./approvals.repository";
import { toApprovalRequestDto, toApprovalRequestDetailDto, ApprovalRequestDto } from "./approvals.dto";
import { DecisionInput, ListApprovalRequestsQuery } from "./approvals.schema";
import { executeActivation, executeCancellation, executeReschedule } from "../elections/elections.service";
import { executePublish } from "../results/results.service";

const REQUEST_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// A resolver runs INSIDE the resolution transaction. It may return a callback
// that runs only after that transaction commits (used for notifications).
type PostCommitHook = () => void;
type Resolver = (request: ApprovalRequest, tx: Prisma.TransactionClient) => Promise<PostCommitHook | undefined>;

// What happens once a request is APPROVED. Deliberately Partial: action types
// with no resolver yet must fail loudly, not silently do nothing.
const RESOLVERS: Partial<Record<string, Resolver>> = {
  ELECTION_ACTIVATION: (request, tx) => executeActivation(request.resourceId, request.requestedById, tx),
  ELECTION_CANCELLATION: (request, tx) =>
    executeCancellation(request.resourceId, request.requestedById, (request.payload as { reason: string }).reason, tx),
  ELECTION_RESCHEDULE: (request, tx) =>
    executeReschedule(
      request.resourceId, request.requestedById,
      request.payload as { startDate: string; endDate: string }, tx
    ),
  RESULT_PUBLICATION: (request, tx) => executePublish(request.resourceId, request.requestedById, tx),
};

export async function requestApproval(params: {
  actionType: "ELECTION_ACTIVATION" | "ELECTION_CANCELLATION" | "ELECTION_RESCHEDULE" | "RESULT_PUBLICATION";
  electionId: string;
  requestedById: string;
  requiredApprovals: number;
  payload?: Record<string, unknown>;
  // What to do if the same kind of request is already pending for this
  // election. "return" hands back the existing one (activation: asking twice
  // means the same thing). "conflict" refuses, because a reschedule or
  // cancellation carries its own dates or reason, and silently returning the
  // old request would hide that the new details were never sent.
  ifPending?: "return" | "conflict";
  // Shown to approvers in their notification, e.g. "Reschedule Board 2026".
  summary?: string;
}): Promise<ApprovalRequestDto> {
  const expiredIds = await approvalsRepository.expireStaleRequests(params.electionId, params.actionType);
  for (const id of expiredIds) {
    await writeAuditLog({
      actorId: null, action: "APPROVAL_EXPIRED", resourceType: "Election",
      resourceId: params.electionId, electionId: params.electionId, outcome: "SUCCESS",
      metadata: { approvalRequestId: id, actionType: params.actionType },
    });
  }

  const existing = await approvalsRepository.findPendingRequest(params.electionId, params.actionType);
  if (existing && params.ifPending === "conflict") {
    throw new ConflictError(
      "A request like this is already waiting for approval for this election. It must be decided, or expire, before a new one can be made."
    );
  }
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
    metadata: {
      approvalRequestId: request.id, actionType: params.actionType, requiredApprovals: params.requiredApprovals,
    },
  });

  // Fire-and-forget: the request exists whether or not the notices go out.
  notifyApprovers(params.requestedById, {
    type: "APPROVAL_REQUESTED",
    title: "Approval needed",
    message: `${params.summary ?? params.actionType.toLowerCase().replace(/_/g, " ")}: ${params.requiredApprovals} approval${params.requiredApprovals === 1 ? "" : "s"} needed.`,
    electionId: params.electionId,
  }).catch(() => {});

  return toApprovalRequestDto(request, { approveCount: 0, rejectCount: 0 });
}

export async function getById(id: string): Promise<ApprovalRequestDto> {
  const request = await approvalsRepository.findRequestWithDetails(id);
  if (!request) throw new NotFoundError("Approval request");
  return toApprovalRequestDetailDto(request);
}

export async function list(query: ListApprovalRequestsQuery) {
  const [requests, totalCount] = await approvalsRepository.listRequests(query);
  return {
    requests: requests.map(toApprovalRequestDetailDto),
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
  if (request.expiresAt <= new Date()) {
    // Record the expiry so the request stops showing as PENDING. The action
    // can be requested again, which creates a fresh request.
    if (await approvalsRepository.markExpired(request.id)) {
      await writeAuditLog({
        actorId: null, action: "APPROVAL_EXPIRED", resourceType: "Election",
        resourceId: request.resourceId, electionId: request.electionId ?? undefined, outcome: "SUCCESS",
        metadata: { approvalRequestId: request.id, actionType: request.actionType },
      });
    }
    throw new ConflictError("This approval request has expired. Request the action again to start a new approval.");
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
    metadata: { approvalRequestId: requestId, decision: input.decision, ...tally },
  });

  // Veto: a single REJECT resolves immediately regardless of approve count.
  if (tally.rejectCount >= 1) {
    return resolveAndDispatch(request, "REJECTED", tally);
  }

  if (tally.approveCount >= request.requiredApprovals) {
    return resolveAndDispatch(request, "APPROVED", tally);
  }

  return toApprovalRequestDto(request, tally);
}

async function resolveAndDispatch(
  request: ApprovalRequest, finalStatus: "APPROVED" | "REJECTED", tally: { approveCount: number; rejectCount: number }
): Promise<ApprovalRequestDto> {
  // FAIL-CLOSED: the claim, the election change, markExecuted and the audit
  // rows all commit together or not at all.
  const outcome = await prisma.$transaction(async (tx) => {
    const claimed = await approvalsRepository.claimResolution(request.id, finalStatus, tx);
    if (!claimed) return { claimed: false as const }; // another decision resolved it first

    let afterCommit: PostCommitHook | undefined;

    if (finalStatus === "APPROVED") {
      const resolver = RESOLVERS[request.actionType];
      if (!resolver) {
        throw new Error(
          `No resolver registered for actionType '${request.actionType}' — this request type should not be able to reach quorum yet.`
        );
      }
      afterCommit = await resolver(request, tx);
      await approvalsRepository.markExecuted(request.id, tx);
    }

    await writeAuditLogInTransaction(tx, {
      actorId: request.requestedById,
      action: finalStatus === "APPROVED" ? "APPROVAL_EXECUTED" : "APPROVAL_REJECTED",
      resourceType: "Election", resourceId: request.resourceId, electionId: request.electionId ?? undefined,
      outcome: "SUCCESS", metadata: { approvalRequestId: request.id, ...tally },
    });

    return { claimed: true as const, afterCommit };
  });

  if (outcome.claimed) {
    // Only after commit: nothing goes out for an action that rolled back.
    outcome.afterCommit?.();

    // Tell the requester the outcome, naming the election and, for a
    // rejection, the reason given.
    tellRequester(request, finalStatus).catch(() => {});
  }

  const updated = await approvalsRepository.findRequestById(request.id);
  return toApprovalRequestDto(updated!, tally);
}

const ACTION_LABEL: Record<string, string> = {
  ELECTION_ACTIVATION: "open voting",
  ELECTION_RESCHEDULE: "change the voting dates",
  ELECTION_CANCELLATION: "cancel the election",
  RESULT_PUBLICATION: "publish the results",
};

async function tellRequester(request: ApprovalRequest, finalStatus: "APPROVED" | "REJECTED"): Promise<void> {
  const details = await approvalsRepository.findRequestWithDetails(request.id);
  const what = ACTION_LABEL[request.actionType] ?? request.actionType.toLowerCase().replace(/_/g, " ");
  const where = details?.election ? ` for "${details.election.name}"` : "";
  const veto = details?.decisions.find((d) => d.decision === "REJECT");
  await notify([request.requestedById], {
    type: "APPROVAL_DECIDED",
    title: finalStatus === "APPROVED" ? "Your request was approved" : "Your request was rejected",
    message:
      finalStatus === "APPROVED"
        ? `Your request to ${what}${where} got enough approvals and has been carried out.`
        : `Your request to ${what}${where} was rejected by ${veto?.approver.fullName ?? "an approver"}. Reason: ${veto?.comment ?? "none given"}`,
    electionId: request.electionId ?? undefined,
  });
}

// Called by the scheduler. Marks every expired PENDING request EXPIRED so
// approval screens stop showing requests nobody can decide any more.
export async function expireStaleApprovalRequests(now: Date = new Date()): Promise<number> {
  const expired = await approvalsRepository.expireAllStaleRequests(now);
  for (const request of expired) {
    await writeAuditLog({
      actorId: null, action: "APPROVAL_EXPIRED", resourceType: "Election",
      resourceId: request.resourceId, electionId: request.electionId ?? undefined, outcome: "SUCCESS",
      metadata: { approvalRequestId: request.id, actionType: request.actionType, trigger: "SCHEDULED" },
    });
  }
  return expired.length;
}