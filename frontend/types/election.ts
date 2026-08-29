// types/election.ts

export type ElectionStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SCHEDULED"
  | "ACTIVE"
  | "CLOSED"
  | "RESULTS_PUBLISHED"
  | "ARCHIVED";

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
  status: ElectionStatus;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  totalEligibleVoters: number;
  totalVotesCast: number;
  positions: Position[];
  createdBy: string; // Member.id
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  approvalsRequired: number;
  approvalsReceived: number;
}

export interface DashboardStats {
  activeElections: number;
  registeredMembers: number;
  pendingApprovals: number;
  systemAlerts: number;
}