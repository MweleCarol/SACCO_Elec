import type { ApprovalType, ApprovalStatus, Approval } from "../../types/approval";

export const mockApprovals: Approval[] = [
  // 4 candidate approvals
  { id: "appr-001", type: "CANDIDATE_APPROVAL", targetId: "CAND-024", targetLabel: "Daniel Kiprop — Treasurer", requestedBy: "usr-officer-002", status: "PENDING", approvalsRequired: 1, approvalsReceived: 0, requestedAt: "2026-08-28T10:28:00Z" },
  { id: "appr-002", type: "CANDIDATE_APPROVAL", targetId: "CAND-027", targetLabel: "New candidate — Supervisory Committee", requestedBy: "usr-officer-002", status: "PENDING", approvalsRequired: 1, approvalsReceived: 0, requestedAt: "2026-08-28T09:10:00Z" },
  { id: "appr-003", type: "CANDIDATE_APPROVAL", targetId: "CAND-028", targetLabel: "New candidate — Supervisory Committee", requestedBy: "usr-officer-002", status: "PENDING", approvalsRequired: 1, approvalsReceived: 0, requestedAt: "2026-08-28T09:12:00Z" },
  { id: "appr-004", type: "CANDIDATE_APPROVAL", targetId: "CAND-029", targetLabel: "New candidate — Nairobi Branch Delegate", requestedBy: "usr-officer-002", status: "PENDING", approvalsRequired: 1, approvalsReceived: 0, requestedAt: "2026-08-27T16:45:00Z" },

  // 2 election actions
  { id: "appr-005", type: "ELECTION_ACTION", targetId: "el-2027-agm-preview", targetLabel: "Activate: 2027 AGM Special Resolution Vote", requestedBy: "usr-admin-001", status: "PENDING", approvalsRequired: 2, approvalsReceived: 1, requestedAt: "2026-08-28T08:15:00Z" },
  { id: "appr-006", type: "ELECTION_ACTION", targetId: "el-2026-branch-delegate", targetLabel: "Extend voting window by 24 hours", requestedBy: "usr-officer-002", status: "PENDING", approvalsRequired: 2, approvalsReceived: 0, requestedAt: "2026-08-28T07:30:00Z" },

  // 1 verification request
  { id: "appr-007", type: "VERIFICATION_REQUEST", targetId: "usr-member-gen-118", targetLabel: "Membership verification — SCCO-02118", requestedBy: "usr-officer-002", status: "PENDING", approvalsRequired: 1, approvalsReceived: 0, requestedAt: "2026-08-28T06:50:00Z" },
];

export function getPendingApprovalCounts() {
  const pending = mockApprovals.filter((a) => a.status === "PENDING");
  return {
    candidateApprovals: pending.filter((a) => a.type === "CANDIDATE_APPROVAL").length,
    electionActions: pending.filter((a) => a.type === "ELECTION_ACTION").length,
    verificationRequests: pending.filter((a) => a.type === "VERIFICATION_REQUEST").length,
    total: pending.length,
  };
}