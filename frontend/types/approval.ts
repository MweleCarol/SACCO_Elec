
export type ApprovalType = "CANDIDATE_APPROVAL" | "ELECTION_ACTION" | "VERIFICATION_REQUEST";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Approval {
  id: string;
  type: ApprovalType;
  targetId: string; // Candidate.id, Election.id, or Member.id depending on type
  targetLabel: string; // human-readable label for UI
  requestedBy: string; // Member.id
  status: ApprovalStatus;
  approvalsRequired: number;
  approvalsReceived: number;
  requestedAt: string; // ISO date string
}