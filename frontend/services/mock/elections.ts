import type { ElectionStatus, Position, Election, DashboardStats } from "../../types/election";

const MEMBER_VISIBLE_STATUSES: ElectionStatus[] = [
  "SCHEDULED",
  "ACTIVE",
  "CLOSED",
  "RESULTS_PUBLISHED",
  "ARCHIVED",
];

export function getMemberVisibleElections(): Election[] {
  return mockElections.filter((e) => MEMBER_VISIBLE_STATUSES.includes(e.status));
}

export const mockElections: Election[] = [
  {
    id: "el-2026-general",
    title: "2026 SACCO General Election",
    description:
      "Annual general election for the SACCO Board of Directors and Supervisory Committee.",
    status: "ACTIVE",
    startDate: "2026-08-28T06:00:00Z",
    endDate: "2026-08-29T18:00:00Z",
    totalEligibleVoters: 1248,
    totalVotesCast: 749, // ~60% voting progress, matches dashboard
    positions: [
      { id: "pos-chair", electionId: "el-2026-general", title: "Chairperson", seats: 1 },
      { id: "pos-treasurer", electionId: "el-2026-general", title: "Treasurer", seats: 1 },
      { id: "pos-secretary", electionId: "el-2026-general", title: "Secretary", seats: 1 },
      { id: "pos-supervisory", electionId: "el-2026-general", title: "Supervisory Committee Member", seats: 3 },
    ],
    createdBy: "usr-admin-001",
    approvalStatus: "APPROVED",
    approvalsRequired: 2,
    approvalsReceived: 2,
  },
  {
    id: "el-2026-branch-delegate",
    title: "Branch Delegate Election 2026",
    description: "Election of branch delegates for regional representation.",
    status: "ACTIVE",
    startDate: "2026-08-27T06:00:00Z",
    endDate: "2026-08-30T18:00:00Z",
    totalEligibleVoters: 412,
    totalVotesCast: 118,
    positions: [
      { id: "pos-delegate-nairobi", electionId: "el-2026-branch-delegate", title: "Nairobi Branch Delegate", seats: 2 },
      { id: "pos-delegate-mombasa", electionId: "el-2026-branch-delegate", title: "Mombasa Branch Delegate", seats: 1 },
    ],
    createdBy: "usr-officer-002",
    approvalStatus: "APPROVED",
    approvalsRequired: 2,
    approvalsReceived: 2,
  },
  {
    id: "el-2027-agm-preview",
    title: "2027 AGM Special Resolution Vote",
    description: "Draft election prepared ahead of the 2027 AGM cycle.",
    status: "DRAFT",
    startDate: "2027-01-15T06:00:00Z",
    endDate: "2027-01-16T18:00:00Z",
    totalEligibleVoters: 0,
    totalVotesCast: 0,
    positions: [],
    createdBy: "usr-admin-001",
    approvalStatus: "PENDING",
    approvalsRequired: 2,
    approvalsReceived: 0,
  },
  {
  id: "el-2025-agm",
  title: "2025 SACCO Annual General Meeting Election",
  description: "Annual leadership election held during the 2025 AGM.",
  status: "RESULTS_PUBLISHED",
  startDate: "2025-11-10T08:00:00Z",
  endDate: "2025-11-10T18:00:00Z",
  totalEligibleVoters: 1180,
  totalVotesCast: 812,
  positions: [
    { id: "pos-agm-chair", electionId: "el-2025-agm", title: "Chairperson", seats: 1 },
  ],
  createdBy: "usr-admin-001",
  approvalStatus: "APPROVED",
  approvalsRequired: 2,
  approvalsReceived: 2,
},
];

export function getElectionById(id: string): Election | undefined {
  return mockElections.find((e) => e.id === id);
}

export function getActiveElections(): Election[] {
  return mockElections.filter((e) => e.status === "ACTIVE");
}

export function getVotingProgress(election: Election): number {
  if (election.totalEligibleVoters === 0) return 0;
  return Math.round((election.totalVotesCast / election.totalEligibleVoters) * 100);
}

// Dashboard summary stats (top cards in admin dashboard screenshot)
export const mockDashboardStats = {
  activeElections: getActiveElections().length, // 2
  registeredMembers: 1248,
  pendingApprovals: 7,
  systemAlerts: 3,
};