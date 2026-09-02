import type { AuditLogEntry } from "@/types/audit-log";

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: "log-001",
    action: "Election updated",
    actor: "Admin User",
    actorId: "usr-admin-001",
    targetLabel: "2026 SACCO General Election",
    electionId: "el-2026-general",
    module: "ELECTIONS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T10:42:00Z",
    hash: "a3f5c9d1e7b2...mock",
  },
  {
    id: "log-002",
    action: "Candidate submitted",
    actor: "Candidate #024",
    actorId: "CAND-024",
    targetLabel: "Treasurer — 2026 SACCO General Election",
    electionId: "el-2026-general",
    module: "CANDIDATES",
    riskLevel: "LOW",
    timestamp: "2026-08-28T10:28:00Z",
    hash: "7b2d4f8a1c9e...mock",
  },
  {
    id: "log-003",
    action: "Risk alert generated",
    actor: "AI Governance",
    actorId: "system-ai-governance",
    targetLabel: "2026 SACCO General Election",
    electionId: "el-2026-general",
    module: "ELECTIONS",
    riskLevel: "MEDIUM",
    timestamp: "2026-08-28T09:56:00Z",
    hash: "9e1a6c3b5d7f...mock",
  },
  {
    id: "log-004",
    action: "Officer logged in",
    actor: "Winnie Chebet",
    actorId: "usr-officer-002",
    module: "AUTH",
    riskLevel: "LOW",
    timestamp: "2026-08-28T07:05:00Z",
    hash: "2f8b4d6a9c1e...mock",
  },
  {
    id: "log-005",
    action: "Approval requested",
    actor: "Winnie Chebet",
    actorId: "usr-officer-002",
    targetLabel: "Extend voting window — Branch Delegate Election",
    electionId: "el-2026-branch-delegate",
    module: "APPROVALS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T07:30:00Z",
    hash: "5c9e2a7f1b3d...mock",
  },
  {
    id: "log-006",
    action: "Unusual login activity",
    actor: "Election Officer",
    actorId: "usr-officer-002",
    module: "AUTH",
    riskLevel: "HIGH",
    timestamp: "2026-08-27T23:47:00Z",
    hash: "6a2c8e4b1f7d...mock",
  },
];

export function getRecentAuditLogs(limit = 5): AuditLogEntry[] {
  return [...mockAuditLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function getAuditEventCountForElection(electionId: string): number {
  return mockAuditLogs.filter((log) => log.electionId === electionId).length;
}

export function getHighRiskAuditLogs(): AuditLogEntry[] {
  return mockAuditLogs.filter((log) => log.riskLevel === "HIGH");
}

export function getElectionActivityTimeline(electionId: string): AuditLogEntry[] {
  return mockAuditLogs
    .filter((log) => log.electionId === electionId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}