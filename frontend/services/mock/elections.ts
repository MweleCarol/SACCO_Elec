import type { Election, ApprovalStatus, LifecycleStatus, Position, DisplayStatus } from "@/types/election";

export const mockElections: Election[] = [
  {
    id: "el-2026-general",
    title: "2026 SACCO General Election",
    description: "Annual general election for the SACCO Board of Directors and Supervisory Committee.",
    approvalStatus: "APPROVED",
    lifecycleStatus: "ACTIVE",
    startDate: "2026-08-28T08:00:00Z",
    endDate: "2026-09-08T21:00:00Z", // extended past "today" (Sep 2) so it's genuinely ACTIVE for testing
    totalEligibleVoters: 1756,
    totalVotesCast: 1054,
    positions: [
      { id: "pos-chair", electionId: "el-2026-general", title: "Chairperson", seats: 1 },
      { id: "pos-treasurer", electionId: "el-2026-general", title: "Treasurer", seats: 1 },
      { id: "pos-secretary", electionId: "el-2026-general", title: "Secretary", seats: 1 },
    ],
    createdBy: "usr-admin-001",
  },
  {
    id: "el-2026-branch-delegate",
    title: "Branch Delegate Election 2026",
    description: "Election of branch delegates to represent members at the annual delegates' conference.",
    approvalStatus: "APPROVED",
    lifecycleStatus: "ACTIVE",
    startDate: "2026-08-24T08:00:00Z",
    endDate: "2026-09-08T21:00:00Z", // also extended so it stays ACTIVE
    totalEligibleVoters: 640,
    totalVotesCast: 384,
    positions: [
      { id: "pos-delegate-nairobi", electionId: "el-2026-branch-delegate", title: "Branch Delegate", seats: 3 },
    ],
    createdBy: "usr-admin-001",
  },
  {
    id: "el-2025-agm",
    title: "2025 SACCO Annual General Meeting Election",
    description: "Annual leadership election held during the 2025 AGM.",
    approvalStatus: "APPROVED",
    lifecycleStatus: "RESULTS_PUBLISHED",
    startDate: "2025-11-10T08:00:00Z",
    endDate: "2025-11-10T18:00:00Z",
    totalEligibleVoters: 1180,
    totalVotesCast: 812,
    positions: [
      { id: "pos-agm-chair", electionId: "el-2025-agm", title: "Chairperson", seats: 1 },
    ],
    createdBy: "usr-admin-001",
  },
  {
    id: "el-2026-treasurer-byelection",
    title: "2026 Treasurer By-Election",
    description: "A by-election to fill the vacant Treasurer position ahead of the next AGM.",
    approvalStatus: "APPROVED",
    lifecycleStatus: "SCHEDULED",
    startDate: "2026-09-20T08:00:00Z", // future — genuinely SCHEDULED, nominations open now
    endDate: "2026-09-22T21:00:00Z",
    totalEligibleVoters: 0,
    totalVotesCast: 0,
    positions: [
      { id: "pos-byelection-treasurer", electionId: "el-2026-treasurer-byelection", title: "Treasurer", seats: 1 },
    ],
    createdBy: "usr-admin-001",
  },
];

export const mockDashboardStats = {
  get activeElections() {
    return mockElections.filter((e) => getComputedLifecycleStatus(e) === "ACTIVE").length;
  },
  registeredMembers: 1842,
  pendingApprovals: 7,
  systemAlerts: 3,
};

export function getVotingProgress(election: Election): number {
  if (election.totalEligibleVoters === 0) return 0;
  return Math.round((election.totalVotesCast / election.totalEligibleVoters) * 100);
}

export function getComputedLifecycleStatus(election: Election): LifecycleStatus {
  if (election.approvalStatus !== "APPROVED") return "NOT_SCHEDULED";
  if (!["SCHEDULED", "ACTIVE", "CLOSED"].includes(election.lifecycleStatus)) {
    return election.lifecycleStatus;
  }
  const now = Date.now();
  const start = new Date(election.startDate).getTime();
  const end = new Date(election.endDate).getTime();
  if (now < start) return "SCHEDULED";
  if (now < end) return "ACTIVE";
  return "CLOSED";
}

export function getDisplayStatus(election: Election): DisplayStatus {
  if (election.approvalStatus === "DRAFT") return "Draft";
  if (election.approvalStatus === "PENDING_APPROVAL") return "Pending Approval";
  switch (getComputedLifecycleStatus(election)) {
    case "SCHEDULED": return "Scheduled";
    case "ACTIVE": return "Active";
    case "CLOSED": return "Closed";
    case "RESULTS_PUBLISHED": return "Results Published";
    case "ARCHIVED": return "Archived";
    default: return "Approved";
  }
}

const MEMBER_VISIBLE_LIFECYCLE_STATUSES: LifecycleStatus[] = [
  "SCHEDULED", "ACTIVE", "CLOSED", "RESULTS_PUBLISHED", "ARCHIVED",
];

export function getMemberVisibleElections(): Election[] {
  return mockElections.filter((e) => MEMBER_VISIBLE_LIFECYCLE_STATUSES.includes(getComputedLifecycleStatus(e)));
}

export function getActiveElections(): Election[] {
  return mockElections.filter((e) => getComputedLifecycleStatus(e) === "ACTIVE");
}

export function getElectionById(id: string): Election | undefined {
  return mockElections.find((e) => e.id === id);
}

export function isAcceptingNominations(election: Election): boolean {
  return election.approvalStatus === "APPROVED" && getComputedLifecycleStatus(election) === "SCHEDULED";
}

export function createMockElection(input: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  positions: { title: string; seats: number }[];
}): Election {
  const id = `el-${Date.now()}`;
  const election: Election = {
    id,
    title: input.title,
    description: input.description,
    approvalStatus: "DRAFT",
    lifecycleStatus: "NOT_SCHEDULED",
    startDate: input.startDate,
    endDate: input.endDate,
    totalEligibleVoters: 0,
    totalVotesCast: 0,
    positions: input.positions.map((p, i) => ({
      id: `${id}-pos-${i}`,
      electionId: id,
      title: p.title,
      seats: p.seats,
    })),
    createdBy: "current-officer",
  };
  mockElections.push(election);
  return election;
}

export function submitElectionForApproval(electionId: string): boolean {
  const election = mockElections.find((e) => e.id === electionId);
  if (!election) return false;
  if (election.approvalStatus !== "DRAFT") return false;
  election.approvalStatus = "PENDING_APPROVAL";
  return true;
}

export function applyElectionActivation(electionId: string): boolean {
  const election = mockElections.find((e) => e.id === electionId);
  if (!election) return false;
  if (election.approvalStatus !== "PENDING_APPROVAL") return false;
  election.approvalStatus = "APPROVED";
  election.lifecycleStatus = "SCHEDULED";
  return true;
}

export function applyElectionClosure(electionId: string): boolean {
  const election = mockElections.find((e) => e.id === electionId);
  if (!election) return false;
  if (getComputedLifecycleStatus(election) !== "ACTIVE") return false;
  election.lifecycleStatus = "CLOSED";
  return true;
}

export function publishElectionResults(electionId: string): boolean {
  const election = mockElections.find((e) => e.id === electionId);
  if (!election) return false;
  if (getComputedLifecycleStatus(election) !== "CLOSED") return false;
  election.lifecycleStatus = "RESULTS_PUBLISHED";
  return true;
}

export function archiveElection(electionId: string): boolean {
  const election = mockElections.find((e) => e.id === electionId);
  if (!election) return false;
  if (election.lifecycleStatus !== "RESULTS_PUBLISHED") return false;
  election.lifecycleStatus = "ARCHIVED";
  return true;
}