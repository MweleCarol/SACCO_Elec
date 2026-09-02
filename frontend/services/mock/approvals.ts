// services/mock/approvals.ts
import type { Approval, ApprovalStageStatus, ApprovalType } from "@/types/approval";
import { applyElectionActivation, applyElectionClosure } from "@/services/mock/elections";
import { applyCandidateApproval } from "@/services/mock/candidates";

function makeApproval(
  id: string,
  type: ApprovalType,
  targetId: string,
  targetLabel: string,
  requestedBy: string,
  requestedAt: string
): Approval {
  return {
    id,
    type,
    targetId,
    targetLabel,
    requestedBy,
    requestedAt,
    status: "PENDING",
    stages: [
      { role: "ELECTION_OFFICER", status: "PENDING" },
      { role: "ADMINISTRATOR", status: "PENDING" },
    ],
  };
}

export const mockApprovals: Approval[] = [
  makeApproval(
    "appr-002",
    "ELECTION_ACTIVATION",
    "el-2026-branch-delegate",
    "Branch Delegate Election 2026",
    "Election Admin",
    "2026-08-27T08:30:00Z"
  ),
];

/**
 * For requests where the requester has NOT yet acted on their own stage
 * (e.g. an Election Admin submitting an election for activation — the
 * Admin isn't one of the two DAT approver roles here, so both stages start
 * PENDING).
 */
export function requestApproval(
  type: ApprovalType,
  targetId: string,
  targetLabel: string,
  requestedBy: string
): Approval {
  const approval = makeApproval(`appr-${Date.now()}`, type, targetId, targetLabel, requestedBy, new Date().toISOString());
  mockApprovals.push(approval);
  return approval;
}

/**
 * For flows where the requesting officer's own review IS their DAT stage
 * (e.g. candidate verification) — stage 1 is created already APPROVED by
 * the officer, so only the Administrator stage remains PENDING. Prevents
 * the officer being asked to "approve" a second time for the same decision.
 */
export function requestApprovalWithOfficerPreApproved(
  type: ApprovalType,
  targetId: string,
  targetLabel: string,
  officerName: string
): Approval {
  const approval: Approval = {
    id: `appr-${Date.now()}`,
    type,
    targetId,
    targetLabel,
    requestedBy: officerName,
    requestedAt: new Date().toISOString(),
    status: "PENDING",
    stages: [
      { role: "ELECTION_OFFICER", status: "APPROVED", approverName: officerName, decidedAt: new Date().toISOString() },
      { role: "ADMINISTRATOR", status: "PENDING" },
    ],
  };
  mockApprovals.push(approval);
  return approval;
}

/** Index of the first still-PENDING stage, or -1 if the approval is fully resolved. */
export function getCurrentStageIndex(approval: Approval): number {
  return approval.stages.findIndex((s) => s.status === "PENDING");
}

/**
 * Prevents the same person from approving both stages of one request —
 * a core DAT integrity requirement. Frontend-only check; a real backend
 * must enforce this too, since a determined client could bypass it here.
 */
export function hasAlreadyActedOnApproval(approval: Approval, approverName: string): boolean {
  return approval.stages.some((s) => s.approverName === approverName && s.status !== "PENDING");
}

/**
 * Records a decision on whichever stage matches `role` and is currently
 * PENDING. No-op if it's not that role's turn, there's no matching pending
 * stage, or the same person already acted on an earlier stage of this
 * request. On full approval, applies the corresponding real-world effect
 * (candidate approval, election activation, election closure).
 */
export function decideStage(
  approvalId: string,
  role: "ELECTION_OFFICER" | "ADMINISTRATOR",
  decision: ApprovalStageStatus,
  approverName: string,
  reason?: string
): void {
  const approval = mockApprovals.find((a) => a.id === approvalId);
  if (!approval) return;

  if (hasAlreadyActedOnApproval(approval, approverName)) {
    console.warn(`Blocked: "${approverName}" already acted on approval "${approvalId}" — cannot approve both stages.`);
    return;
  }

  const stageIndex = approval.stages.findIndex((s) => s.role === role && s.status === "PENDING");
  if (stageIndex === -1) return;

  approval.stages[stageIndex] = {
    ...approval.stages[stageIndex],
    status: decision,
    approverName,
    decidedAt: new Date().toISOString(),
    reason,
  };

  if (decision === "REJECTED") {
    approval.status = "REJECTED";
    return;
  }

  const allApproved = approval.stages.every((s) => s.status === "APPROVED");
  approval.status = allApproved ? "APPROVED" : "PENDING";

  if (approval.status === "APPROVED") {
    if (approval.type === "CANDIDATE_APPROVAL") {
      applyCandidateApproval(approval.targetId);
    } else if (approval.type === "ELECTION_ACTIVATION") {
      applyElectionActivation(approval.targetId);
    } else if (approval.type === "ELECTION_CLOSURE") {
      applyElectionClosure(approval.targetId);
    }
    // RESULT_PUBLICATION has no wired effect yet — publishElectionResults()
    // exists in elections.ts but nothing calls it from here yet.
  }
}

export function getPendingApprovalCounts() {
  const pending = mockApprovals.filter((a) => a.status === "PENDING");
  return {
    total: pending.length,
    candidateApprovals: pending.filter((a) => a.type === "CANDIDATE_APPROVAL").length,
    electionActions: pending.filter((a) => a.type === "ELECTION_ACTIVATION" || a.type === "ELECTION_CLOSURE").length,
    verificationRequests: 0,
  };
}

export function getApprovalsForTarget(targetId: string): Approval[] {
  return mockApprovals.filter((a) => a.targetId === targetId);
}

/** Human-readable label for an approval type — never expose the raw enum string in the UI. */
export function formatApprovalType(type: ApprovalType): string {
  switch (type) {
    case "CANDIDATE_APPROVAL": return "Candidate Approval";
    case "ELECTION_ACTIVATION": return "Election Activation";
    case "ELECTION_CLOSURE": return "Election Closure";
    case "RESULT_PUBLICATION": return "Result Publication";
    default: return type;
  }
}