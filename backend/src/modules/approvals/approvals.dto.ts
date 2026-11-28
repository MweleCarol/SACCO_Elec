import { ApprovalRequest, ApprovalActionType, ApprovalStatus } from "@prisma/client";
import type { ApprovalRequestWithDetails } from "./approvals.repository";

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
  // Present on GET /approval-requests and GET /approval-requests/:id.
  election?: { id: string; name: string; status: string } | null;
  requestedBy?: { id: string; fullName: string; role: string };
  decisions?: ApprovalDecisionDto[];
}

export interface ApprovalDecisionDto {
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: "APPROVE" | "REJECT";
  comment: string | null;
  decidedAt: Date;
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

// The tally comes from the decisions already loaded, so a list needs no
// extra query per request.
export function toApprovalRequestDetailDto(r: ApprovalRequestWithDetails): ApprovalRequestDto {
  const tally = {
    approveCount: r.decisions.filter((d) => d.decision === "APPROVE").length,
    rejectCount: r.decisions.filter((d) => d.decision === "REJECT").length,
  };
  return {
    ...toApprovalRequestDto(r, tally),
    election: r.election,
    requestedBy: r.requestedBy,
    decisions: r.decisions.map((d) => ({
      approverId: d.approverId,
      approverName: d.approver.fullName,
      approverRole: d.approver.role,
      decision: d.decision,
      comment: d.comment,
      decidedAt: d.decidedAt,
    })),
  };
}