export type ApprovalStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED";
export type LifecycleStatus = "NOT_SCHEDULED" | "SCHEDULED" | "ACTIVE" | "CLOSED" | "RESULTS_PUBLISHED" | "ARCHIVED";

export interface Position {
  id: string;
  electionId: string;
  title: string;
  seats: number;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  approvalStatus: ApprovalStatus;
  lifecycleStatus: LifecycleStatus;
  startDate: string;
  endDate: string;
  totalEligibleVoters: number;
  totalVotesCast: number;
  positions: Position[];
  createdBy: string;
}
export type DisplayStatus =
  | "Draft" | "Pending Approval" | "Approved"
  | "Scheduled" | "Active" | "Closed" | "Results Published" | "Archived";

export function getDisplayStatus(election: Pick<Election, "approvalStatus" | "lifecycleStatus">): DisplayStatus {
  if (election.approvalStatus === "DRAFT") return "Draft";
  if (election.approvalStatus === "PENDING_APPROVAL") return "Pending Approval";
  // approvalStatus === "APPROVED" from here — lifecycle takes over
  switch (election.lifecycleStatus) {
    case "SCHEDULED": return "Scheduled";
    case "ACTIVE": return "Active";
    case "CLOSED": return "Closed";
    case "RESULTS_PUBLISHED": return "Results Published";
    case "ARCHIVED": return "Archived";
    default: return "Approved"; // APPROVED + NOT_SCHEDULED — authorized but not yet activated
  }
}