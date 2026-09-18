import { ApprovalRequest, ApprovalActionType, ApprovalStatus } from "@prisma/client";

export interface ApprovalRequestDto {
  id: string;
  actionType: ApprovalActionType;
  resourceType: string;
  resourceId: string;
  electionId: string | null;
  requestedById: string;
  requiredApprovals: number;
  status: ApprovalStatus;
  approveCount: number;
  rejectCount: number;
  payload: unknown;
  expiresAt: Date;
  createdAt: Date;
  decidedAt: Date | null;
  executedAt: Date | null;
}

export function toApprovalRequestDto(
  request: ApprovalRequest,
  tally: { approveCount: number; rejectCount: number }
): ApprovalRequestDto {
  return {
    id: request.id,
    actionType: request.actionType,
    resourceType: request.resourceType,
    resourceId: request.resourceId,
    electionId: request.electionId,
    requestedById: request.requestedById,
    requiredApprovals: request.requiredApprovals,
    status: request.status,
    approveCount: tally.approveCount,
    rejectCount: tally.rejectCount,
    payload: request.payload,
    expiresAt: request.expiresAt,
    createdAt: request.createdAt,
    decidedAt: request.decidedAt,
    executedAt: request.executedAt,
  };
}