import { getActiveElections, getVotingProgress } from "@/services/mock/elections";
import { mockCandidates, getCandidateDisplayStatus } from "@/services/mock/candidates";
import { mockApprovals, getPendingApprovalCounts, getCurrentStageIndex, getApprovalsForTarget } from "@/services/mock/approvals";
import { getRecentAuditLogs, getHighRiskAuditLogs } from "@/services/mock/audit-logs";
import { mockAnomalies, mockRiskAssessment } from "@/services/mock/ai-governance";
import { getRiskEventsOverTime } from "@/services/mock/reports";
import type { RiskLevel } from "@/types/ai-governance";

export { getRecentAuditLogs, getRiskEventsOverTime };

export interface OfficerCopilotStats {
  electionProgress: number;
  primaryElectionTitle: string | null;
  pendingTasks: number;
  candidatesPendingReview: number;
  approvalsAwaitingMe: number;
  voterTurnoutPct: number;
  votesCast: number;
  eligibleVoters: number;
  systemStatus: "Good" | "Attention" | "Critical";
}

export function getOfficerCopilotStats(): OfficerCopilotStats {
  const active = getActiveElections();
  const primary = active[0] ?? null;

  const candidatesPendingReview = mockCandidates.filter((c) => {
    const approval = getApprovalsForTarget(c.id).find((a) => a.status === "PENDING");
    return getCandidateDisplayStatus(c.id, Boolean(approval)) === "Pending Review";
  }).length;

  const approvalsAwaitingMe = mockApprovals.filter(
    (a) => a.status === "PENDING" && getCurrentStageIndex(a) === 0
  ).length;

  const highRisk = getHighRiskAuditLogs().length;

  return {
    electionProgress: primary ? getVotingProgress(primary) : 0,
    primaryElectionTitle: primary?.title ?? null,
    pendingTasks: candidatesPendingReview + approvalsAwaitingMe,
    candidatesPendingReview,
    approvalsAwaitingMe,
    voterTurnoutPct: primary ? getVotingProgress(primary) : 0,
    votesCast: primary?.totalVotesCast ?? 0,
    eligibleVoters: primary?.totalEligibleVoters ?? 0,
    systemStatus: highRisk === 0 ? "Good" : highRisk <= 2 ? "Attention" : "Critical",
  };
}

export interface AdminCopilotStats {
  overallRiskScore: number; // illustrative 0-100, weighted from anomaly severity — not a spec'd formula
  riskLabel: RiskLevel;
  activeAlerts: number;
  pendingDatApprovals: number;
  systemIntegrityPct: number; // illustrative, derived from high-risk audit event count
}

export function getAdminCopilotStats(): AdminCopilotStats {
  const highCount = mockAnomalies.filter((a) => a.severity === "HIGH").length;
  const medCount = mockAnomalies.filter((a) => a.severity === "MEDIUM").length;
  const lowCount = mockAnomalies.filter((a) => a.severity === "LOW").length;
  const score = Math.min(100, highCount * 30 + medCount * 15 + lowCount * 5);
  const highRiskLogs = getHighRiskAuditLogs().length;

  return {
    overallRiskScore: score,
    riskLabel: mockRiskAssessment.level,
    activeAlerts: mockAnomalies.length,
    pendingDatApprovals: getPendingApprovalCounts().total,
    systemIntegrityPct: Math.max(0, 100 - highRiskLogs * 3),
  };
}

export function getRiskDistribution(): { level: RiskLevel; count: number }[] {
  return [
    { level: "HIGH", count: mockAnomalies.filter((a) => a.severity === "HIGH").length },
    { level: "MEDIUM", count: mockAnomalies.filter((a) => a.severity === "MEDIUM").length },
    { level: "LOW", count: mockAnomalies.filter((a) => a.severity === "LOW").length },
  ];
}