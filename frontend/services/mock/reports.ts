// services/mock/reports.ts
import type { Report } from "@/types/report";
import { mockElections, getComputedLifecycleStatus, getDisplayStatus } from "@/services/mock/elections";
import { mockCandidates } from "@/services/mock/candidates";
import { mockAuditLogs, getElectionActivityTimeline } from "@/services/mock/audit-logs";
import { mockApprovals, getCurrentStageIndex } from "@/services/mock/approvals";
import { mockVoterParticipation } from "@/services/mock/ballots";
import type { Election } from "@/types/election";
import type { Candidate } from "@/types/candidate";

export function getElectionReportData(election: Election) {
  const candidates = mockCandidates.filter((c) => c.electionId === election.id);
  const turnout = election.totalEligibleVoters > 0
    ? Math.round((election.totalVotesCast / election.totalEligibleVoters) * 100)
    : 0;
  const lifecycle = getComputedLifecycleStatus(election);

  return {
    status: getDisplayStatus(election), // human-readable, e.g. "Active", "Pending Approval"
    startDate: election.startDate,
    endDate: election.endDate,
    positions: election.positions.length,
    candidateCount: candidates.length,
    eligibleVoters: election.totalEligibleVoters,
    votesCast: election.totalVotesCast,
    turnout,
    isComplete: ["CLOSED", "RESULTS_PUBLISHED", "ARCHIVED"].includes(lifecycle),
  };
}

const CANDIDATE_STATUSES: Candidate["status"][] = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"];

export function getCandidateReportData(electionId: string) {
  const candidates = mockCandidates.filter((c) => c.electionId === electionId);
  const byStatus = CANDIDATE_STATUSES.map((status) => ({
    status: status.charAt(0) + status.slice(1).toLowerCase(),
    count: candidates.filter((c) => c.status === status).length,
  }));

  const election = mockElections.find((e) => e.id === electionId);
  const byPosition = (election?.positions ?? []).map((p) => ({
    position: p.title,
    count: candidates.filter((c) => c.positionId === p.id).length,
  }));

  return { total: candidates.length, byStatus, byPosition };
}

/** Re-exported so app/reports/page.tsx can import all audit-related report helpers from one place. */
export { getElectionActivityTimeline };

/** Votes-cast-over-time — synthesized as a plausible accelerating curve ending at the election's real totalVotesCast. */
export function getVotingActivityOverTime(electionId: string): { label: string; votes: number }[] {
  const election = mockElections.find((e) => e.id === electionId);
  if (!election) return [];

  const labels = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];
  const weights = [0.05, 0.09, 0.14, 0.20, 0.28, 0.38, 0.55, 1.0];
  const target = election.totalVotesCast;

  return labels.map((label, i) => ({ label, votes: Math.round(weights[i] * target) }));
}

/** DAT approval status counts, matching the Approvals page's four-way split. */
export function getDatApprovalStatusCounts() {
  const approved = mockApprovals.filter((a) => a.status === "APPROVED").length;
  const rejected = mockApprovals.filter((a) => a.status === "REJECTED").length;
  const pending = mockApprovals.filter((a) => a.status === "PENDING" && getCurrentStageIndex(a) === 0).length;
  const awaitingCoApproval = mockApprovals.filter((a) => a.status === "PENDING" && getCurrentStageIndex(a) === 1).length;

  return [
    { status: "Approved", count: approved },
    { status: "Pending", count: pending },
    { status: "Awaiting Co-Approval", count: awaitingCoApproval },
    { status: "Rejected", count: rejected },
  ];
}

/** Security/risk events over time — bucketed by day from real audit log riskLevel entries. */
export function getRiskEventsOverTime(): { label: string; count: number }[] {
  const byDay = new Map<string, number>();
  mockAuditLogs
    .filter((log) => log.riskLevel === "MEDIUM" || log.riskLevel === "HIGH")
    .forEach((log) => {
      const day = new Date(log.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    });

  return Array.from(byDay.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([label, count]) => ({ label, count }));
}

/** Real voter-participation split for a given election — voted vs not yet voted. */
export function getVoterParticipationSplit(electionId: string) {
  const election = mockElections.find((e) => e.id === electionId);
  if (!election) return { voted: 0, notVoted: 0 };
  const voted = mockVoterParticipation.filter((p) => p.electionId === electionId).length || election.totalVotesCast;
  return { voted, notVoted: Math.max(0, election.totalEligibleVoters - voted) };
}

export const mockReports: Report[] = [
  {
    id: "rep-001",
    title: "Election Audit Report",
    subtitle: "2026 SACCO General Election",
    type: "ELECTION_AUDIT",
    generatedAt: "2026-08-28T09:00:00Z",
  },
  {
    id: "rep-002",
    title: "Election Audit Report",
    subtitle: "Branch Delegate Election 2026",
    type: "ELECTION_AUDIT",
    generatedAt: "2026-08-27T09:00:00Z",
  },
  {
    id: "rep-003",
    title: "Administrative Activity Report",
    subtitle: "August 2026",
    type: "ADMINISTRATIVE_ACTIVITY",
    generatedAt: "2026-08-28T07:00:00Z",
  },
];

export function getReportsCount(): number {
  return mockReports.length;
}