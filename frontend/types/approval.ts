export type ApprovalType = "CANDIDATE_APPROVAL" | "ELECTION_ACTIVATION" | "ELECTION_CLOSURE" | "RESULT_PUBLICATION";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ApprovalStageStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalStage {
  role: "ELECTION_OFFICER" | "ADMINISTRATOR";
  approverName?: string;
  status: ApprovalStageStatus;
  decidedAt?: string;
  reason?: string;
}

export interface Approval {
  id: string;
  type: ApprovalType;
  targetId: string; // Candidate.id or Election.id
  targetLabel: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus; // overall — derived from stages, but stored for quick filtering
  stages: [ApprovalStage, ApprovalStage]; // exactly two: officer stage, then admin stage
}