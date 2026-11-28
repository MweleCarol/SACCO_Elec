import { prisma } from "../../config/prisma";
import { ApprovalActionType, ApprovalRequest, ApprovalStatus, Prisma } from "@prisma/client";

export function findRequestById(id: string): Promise<ApprovalRequest | null> {
  return prisma.approvalRequest.findUnique({ where: { id } });
}

// Prevents creating a second PENDING request for the same election +
// action type — e.g. two activate calls in quick succession should reuse
// the one already awaiting decisions, not spawn a duplicate quorum race.
// Only an UNEXPIRED request counts: an expired one can never be decided, so
// reusing it would block that action for the election permanently.
export function findPendingRequest(
  electionId: string, actionType: ApprovalActionType
): Promise<ApprovalRequest | null> {
  return prisma.approvalRequest.findFirst({
    where: { electionId, actionType, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

// Nothing runs on a schedule, so expiry is applied when a request is next
// touched. Returns the ids that changed, so the caller can audit each one.
export async function expireStaleRequests(
  electionId: string, actionType: ApprovalActionType
): Promise<string[]> {
  const now = new Date();
  const stale = await prisma.approvalRequest.findMany({
    where: { electionId, actionType, status: "PENDING", expiresAt: { lte: now } },
    select: { id: true },
  });
  if (stale.length === 0) return [];
  const ids = stale.map((r) => r.id);
  await prisma.approvalRequest.updateMany({
    where: { id: { in: ids }, status: "PENDING" },
    data: { status: "EXPIRED", decidedAt: now },
  });
  return ids;
}

// Same claim pattern as claimResolution: only a still-PENDING row changes.
export async function markExpired(requestId: string): Promise<boolean> {
  const result = await prisma.approvalRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "EXPIRED", decidedAt: new Date() },
  });
  return result.count > 0;
}

export function createRequest(data: {
  actionType: ApprovalActionType;
  resourceType: string;
  resourceId: string;
  electionId: string;
  requestedById: string;
  requiredApprovals: number;
  payload?: Prisma.InputJsonValue;
  expiresAt: Date;
}): Promise<ApprovalRequest> {
  return prisma.approvalRequest.create({ data });
}

export async function getTally(requestId: string): Promise<{ approveCount: number; rejectCount: number }> {
  const grouped = await prisma.approvalDecision.groupBy({
    by: ["decision"],
    where: { approvalRequestId: requestId },
    _count: { decision: true },
  });
  return {
    approveCount: grouped.find((g) => g.decision === "APPROVE")?._count.decision ?? 0,
    rejectCount: grouped.find((g) => g.decision === "REJECT")?._count.decision ?? 0,
  };
}

// What the approvals screens need to show a request without more calls:
// the election, who asked, and every decision so far with its comment.
export const REQUEST_DETAILS = {
  election: { select: { id: true, name: true, status: true } },
  requestedBy: { select: { id: true, fullName: true, role: true } },
  decisions: {
    orderBy: { decidedAt: "asc" },
    select: {
      approverId: true, decision: true, comment: true, decidedAt: true,
      approver: { select: { fullName: true, role: true } },
    },
  },
} satisfies Prisma.ApprovalRequestInclude;

export type ApprovalRequestWithDetails = Prisma.ApprovalRequestGetPayload<{ include: typeof REQUEST_DETAILS }>;

export function findRequestWithDetails(id: string): Promise<ApprovalRequestWithDetails | null> {
  return prisma.approvalRequest.findUnique({ where: { id }, include: REQUEST_DETAILS });
}

export function listRequests(filters: {
  status?: ApprovalStatus; actionType?: ApprovalActionType; open?: "true" | "false"; page: number; pageSize: number;
}) {
  const statusWhere: Prisma.ApprovalRequestWhereInput = filters.status
    ? { status: filters.status }
    : filters.open === "true"
      ? { status: "PENDING" }
      : filters.open === "false"
        ? { status: { not: "PENDING" } }
        : {};
  const where: Prisma.ApprovalRequestWhereInput = {
    ...statusWhere,
    ...(filters.actionType ? { actionType: filters.actionType } : {}),
  };
  // Waiting requests: the one that expires soonest first.
  const orderBy: Prisma.ApprovalRequestOrderByWithRelationInput =
    filters.open === "true" ? { expiresAt: "asc" } : { createdAt: "desc" };
  return prisma.$transaction([
    prisma.approvalRequest.findMany({
      where, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize, orderBy, include: REQUEST_DETAILS,
    }),
    prisma.approvalRequest.count({ where }),
  ]);
}

// Insert-then-catch, not check-then-insert: @@unique([approvalRequestId,
// approverId]) is the actual guard against double-voting from the same
// officer, and inserting directly avoids a race between two officers
// voting within milliseconds of each other — the realistic case here.
export function castDecision(
  approvalRequestId: string, approverId: string, decision: "APPROVE" | "REJECT", comment?: string
) {
  return prisma.approvalDecision.create({
    data: { approvalRequestId, approverId, decision, comment },
  });
}

// The "claim" — whichever caller's updateMany actually changes a row is
// the one that goes on to execute the underlying action. A concurrent
// second resolution attempt (two officers crossing quorum on votes that
// arrive almost simultaneously) sees count: 0 and backs off silently,
// same principle as the Participation unique-constraint race in Phase 6.
export async function claimResolution(
  requestId: string, status: ApprovalStatus, tx: Prisma.TransactionClient
): Promise<boolean> {
  const result = await tx.approvalRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status, decidedAt: new Date() },
  });
  return result.count > 0;
}

export function markExecuted(requestId: string, tx: Prisma.TransactionClient) {
  return tx.approvalRequest.update({
    where: { id: requestId },
    data: { status: "EXECUTED", executedAt: new Date() },
  });
}

// Every PENDING request past its expiry, across all elections. Used by the
// scheduler; returns what changed so each one can be audited.
export async function expireAllStaleRequests(now: Date): Promise<ApprovalRequest[]> {
  const stale = await prisma.approvalRequest.findMany({
    where: { status: "PENDING", expiresAt: { lte: now } },
  });
  if (stale.length === 0) return [];
  await prisma.approvalRequest.updateMany({
    where: { id: { in: stale.map((r) => r.id) }, status: "PENDING" },
    data: { status: "EXPIRED", decidedAt: now },
  });
  return stale;
}