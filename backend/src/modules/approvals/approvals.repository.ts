import { prisma } from "../../config/prisma";
import { ApprovalActionType, ApprovalRequest, ApprovalStatus, Prisma } from "@prisma/client";

export function findRequestById(id: string): Promise<ApprovalRequest | null> {
  return prisma.approvalRequest.findUnique({ where: { id } });
}

// Prevents creating a second PENDING request for the same election +
// action type — e.g. two activate calls in quick succession should reuse
// the one already awaiting decisions, not spawn a duplicate quorum race.
export function findPendingRequest(
  electionId: string, actionType: ApprovalActionType
): Promise<ApprovalRequest | null> {
  return prisma.approvalRequest.findFirst({
    where: { electionId, actionType, status: "PENDING" },
  });
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

export function listRequests(filters: {
  status?: ApprovalStatus; actionType?: ApprovalActionType; page: number; pageSize: number;
}) {
  const where: Prisma.ApprovalRequestWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.actionType ? { actionType: filters.actionType } : {}),
  };
  return prisma.$transaction([
    prisma.approvalRequest.findMany({
      where, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize,
      orderBy: { createdAt: "desc" },
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
  return tx.approvalRequest.update({ where: { id: requestId }, data: { executedAt: new Date() } });
}