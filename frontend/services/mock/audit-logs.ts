import type { AuditLogEntry, AuditStats } from "@/types/audit-log";

const GENERAL = {
  electionId: "el-2026-general",
  electionTitle: "2026 SACCO General Election",
};
const BRANCH = {
  electionId: "el-2026-branch-delegate",
  electionTitle: "Branch Delegate Election 2026",
};
const AGM = {
  electionId: "el-2025-agm",
  electionTitle: "2025 SACCO Annual General Meeting Election",
};

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: "log-001",
    action: "Election updated",
    description: "Voting duration updated",
    eventType: "ELECTION_CONFIG_CHANGED",
    actor: "Admin User",
    actorId: "usr-admin-001",
    actorRole: "ADMINISTRATOR",
    targetLabel: "2026 SACCO General Election",
    ...GENERAL,
    module: "ELECTIONS",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T10:42:00Z",
    hash: "a3f5c9d1e7b2...mock",
    ipAddress: "154.56.78.21",
    device: "Chrome on Windows",
    aiInsight:
      "Configuration change made within the permitted pre-voting window. No irregularities detected.",
  },
  {
    id: "log-002",
    action: "Candidate submitted",
    description: "Application submitted",
    eventType: "CANDIDATE_APPLICATION",
    actor: "Candidate #024",
    actorId: "CAND-024",
    actorRole: "MEMBER",
    targetLabel: "Treasurer — 2026 SACCO General Election",
    ...GENERAL,
    module: "CANDIDATES",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T10:28:00Z",
    hash: "7b2d4f8a1c9e...mock",
    ipAddress: "41.90.12.144",
    device: "Safari on iPhone",
  },
  {
    id: "log-003",
    action: "Risk alert generated",
    description: "Anomalous voting pattern flagged",
    eventType: "RISK_ALERT",
    actor: "AI Governance",
    actorId: "system-ai-governance",
    actorRole: "SYSTEM",
    targetLabel: "2026 SACCO General Election",
    ...GENERAL,
    module: "ELECTIONS",
    result: "SUCCESS",
    riskLevel: "MEDIUM",
    timestamp: "2026-08-28T09:56:00Z",
    hash: "9e1a6c3b5d7f...mock",
    statusNote: "Flagged for officer review",
    aiInsight:
      "Vote submission rate exceeded the expected hourly pattern by 34%. Recommend manual review before results are published.",
  },
  {
    id: "log-004",
    action: "Officer logged in",
    description: "User logged in successfully",
    eventType: "LOGIN",
    actor: "Winnie Chebet",
    actorId: "usr-officer-002",
    actorRole: "ELECTION_OFFICER",
    module: "AUTH",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T07:05:00Z",
    hash: "2f8b4d6a9c1e...mock",
    ipAddress: "197.232.61.8",
    device: "Chrome on Windows",
  },
  {
    id: "log-005",
    action: "Approval requested",
    description: "For election activation",
    eventType: "APPROVAL_SUBMITTED",
    actor: "Winnie Chebet",
    actorId: "usr-officer-002",
    actorRole: "ELECTION_OFFICER",
    targetLabel: "Extend voting window — Branch Delegate Election",
    ...BRANCH,
    module: "APPROVALS",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T07:30:00Z",
    hash: "5c9e2a7f1b3d...mock",
    ipAddress: "197.232.61.8",
    device: "Chrome on Windows",
  },
  {
    id: "log-006",
    action: "Unusual login activity",
    description: "Multiple failed logins detected",
    eventType: "SECURITY_ALERT",
    actor: "System",
    actorId: "system-security",
    actorRole: "SYSTEM",
    module: "AUTH",
    result: "SUCCESS",
    riskLevel: "HIGH",
    timestamp: "2026-08-27T23:47:00Z",
    hash: "6a2c8e4b1f7d...mock",
    ipAddress: "102.68.204.77",
    device: "Unknown",
    statusNote: "Account temporarily locked",
    aiInsight:
      "Five failed TOTP attempts from an unrecognised IP within 4 minutes. Pattern is consistent with credential stuffing.",
  },
  {
    id: "log-007",
    action: "Vote cast",
    description: "Member submitted ballot",
    eventType: "VOTE_CAST",
    actor: "—",
    actorId: "anonymised",
    actorRole: "MEMBER",
    ...GENERAL,
    module: "ELECTIONS",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T15:42:18Z",
    hash: "a9f3e7c4...2b6d",
    ipAddress: "154.56.78.21",
    device: "Chrome on Windows",
    ballotReference: "BAL-8F3A-29D1",
    statusNote: "Vote stored securely",
    aiInsight:
      "This voting activity is within the expected operational pattern. No irregularities detected.",
  },
  {
    id: "log-008",
    action: "Authentication failure",
    description: "Invalid TOTP code",
    eventType: "AUTH_FAILURE",
    actor: "John Kamau",
    actorId: "usr-officer-003",
    actorRole: "ELECTION_OFFICER",
    ...GENERAL,
    module: "AUTH",
    result: "FAILED",
    riskLevel: "MEDIUM",
    timestamp: "2026-08-28T14:28:00Z",
    hash: "c4e8a2f6...91b3",
    ipAddress: "41.215.33.90",
    device: "Firefox on Ubuntu",
  },
  {
    id: "log-009",
    action: "Candidate approved",
    description: "Candidate passed verification",
    eventType: "CANDIDATE_APPROVED",
    actor: "Jane Wanjiku",
    actorId: "usr-officer-004",
    actorRole: "ELECTION_OFFICER",
    targetLabel: "Secretary — 2026 SACCO General Election",
    ...GENERAL,
    module: "CANDIDATES",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T13:15:00Z",
    hash: "1d7b3e9c...44af",
    ipAddress: "197.232.61.12",
    device: "Chrome on macOS",
  },
  {
    id: "log-010",
    action: "DAT approval",
    description: "Administrator co-approved",
    eventType: "DAT_APPROVAL",
    actor: "Patrick Okoth",
    actorId: "usr-admin-002",
    actorRole: "ADMINISTRATOR",
    targetLabel: "Extend voting window — Branch Delegate Election",
    ...BRANCH,
    module: "APPROVALS",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T11:47:00Z",
    hash: "8b5f1a3d...7ce2",
    ipAddress: "154.56.78.40",
    device: "Edge on Windows",
    aiInsight:
      "Second-stage approval completed within the DAT policy. Both approvers are distinct accounts.",
  },
  {
    id: "log-011",
    action: "Login",
    description: "User logged in successfully",
    eventType: "LOGIN",
    actor: "Mary Njeri",
    actorId: "usr-admin-003",
    actorRole: "ADMINISTRATOR",
    module: "AUTH",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T09:18:00Z",
    hash: "3a9d5c7e...b182",
    ipAddress: "197.232.61.55",
    device: "Chrome on Windows",
  },
  {
    id: "log-012",
    action: "Candidate application",
    description: "Application submitted",
    eventType: "CANDIDATE_APPLICATION",
    actor: "Samuel Karani",
    actorId: "usr-mem-118",
    actorRole: "MEMBER",
    targetLabel: "Chairperson — Branch Delegate Election 2026",
    ...BRANCH,
    module: "CANDIDATES",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T08:55:00Z",
    hash: "6f2c8b4a...3d90",
    ipAddress: "41.90.12.201",
    device: "Chrome on Android",
  },
  {
    id: "log-013",
    action: "Configuration changed",
    description: "Candidate list updated",
    eventType: "CONFIG_CHANGED" as never, // see note below
    actor: "Patricia Wanjiku",
    actorId: "usr-admin-004",
    actorRole: "ADMINISTRATOR",
    ...GENERAL,
    module: "ELECTIONS",
    result: "SUCCESS",
    riskLevel: "MEDIUM",
    timestamp: "2026-08-27T18:43:00Z",
    hash: "9c1e4f7b...5a38",
    ipAddress: "154.56.78.19",
    device: "Chrome on Windows",
  },
  {
    id: "log-014",
    action: "Membership sync completed",
    description: "412 records reconciled",
    eventType: "MEMBERSHIP_SYNC",
    actor: "System",
    actorId: "system-sync",
    actorRole: "SYSTEM",
    module: "MEMBERSHIP_SYNC",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-27T06:00:00Z",
    hash: "2e6a9d3c...c471",
    statusNote: "Next sync scheduled in 24 hours",
  },
  {
    id: "log-015",
    action: "Membership sync failed",
    description: "External SACCO API timeout",
    eventType: "MEMBERSHIP_SYNC",
    actor: "System",
    actorId: "system-sync",
    actorRole: "SYSTEM",
    module: "MEMBERSHIP_SYNC",
    result: "FAILED",
    riskLevel: "MEDIUM",
    timestamp: "2026-08-26T06:00:00Z",
    hash: "7d3b8e1f...0a92",
    statusNote: "Retry succeeded on next cycle",
    aiInsight:
      "Third timeout in 14 days against the membership endpoint. Recommend reviewing the integration timeout threshold.",
  },
  {
    id: "log-016",
    action: "User role changed",
    description: "Promoted to Election Officer",
    eventType: "USER_UPDATED",
    actor: "Mary Njeri",
    actorId: "usr-admin-003",
    actorRole: "ADMINISTRATOR",
    targetLabel: "Winnie Chebet",
    module: "USERS",
    result: "SUCCESS",
    riskLevel: "HIGH",
    timestamp: "2026-08-26T14:22:00Z",
    hash: "4b7f2a9e...d813",
    ipAddress: "197.232.61.55",
    device: "Chrome on Windows",
    aiInsight:
      "Privilege escalation event. Role changes to Election Officer are classified high-risk and require DAT co-approval.",
  },
  {
    id: "log-017",
    action: "Candidate rejected",
    description: "Failed eligibility verification",
    eventType: "CANDIDATE_REJECTED",
    actor: "Jane Wanjiku",
    actorId: "usr-officer-004",
    actorRole: "ELECTION_OFFICER",
    targetLabel: "Treasurer — Branch Delegate Election 2026",
    ...BRANCH,
    module: "CANDIDATES",
    result: "SUCCESS",
    riskLevel: "MEDIUM",
    timestamp: "2026-08-26T11:09:00Z",
    hash: "8a4c6d2b...f157",
    ipAddress: "197.232.61.12",
    device: "Chrome on macOS",
  },
  {
    id: "log-018",
    action: "Results published",
    description: "Final tally released to members",
    eventType: "RESULTS_PUBLISHED",
    actor: "Admin User",
    actorId: "usr-admin-001",
    actorRole: "ADMINISTRATOR",
    ...AGM,
    module: "ELECTIONS",
    result: "SUCCESS",
    riskLevel: "HIGH",
    timestamp: "2026-08-25T16:30:00Z",
    hash: "1f8e3a7c...9b24",
    ipAddress: "154.56.78.21",
    device: "Chrome on Windows",
    statusNote: "Tally hash anchored to audit chain",
    aiInsight:
      "Result publication followed full DAT approval. Tally hash matches the sealed ballot record.",
  },
  {
    id: "log-019",
    action: "Authentication failure",
    description: "Invalid password",
    eventType: "AUTH_FAILURE",
    actor: "Unknown",
    actorId: "unknown",
    actorRole: "SYSTEM",
    module: "AUTH",
    result: "FAILED",
    riskLevel: "HIGH",
    timestamp: "2026-08-25T02:14:00Z",
    hash: "5e9b1d4f...a308",
    ipAddress: "102.68.204.77",
    device: "Unknown",
    aiInsight:
      "Attempt originated from the same IP range as an earlier flagged incident.",
  },
  {
    id: "log-020",
    action: "Election created",
    description: "Draft election initialised",
    eventType: "ELECTION_CREATED",
    actor: "Admin User",
    actorId: "usr-admin-001",
    actorRole: "ADMINISTRATOR",
    ...BRANCH,
    module: "ELECTIONS",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-24T09:41:00Z",
    hash: "3c7a5f1e...6d4b",
    ipAddress: "154.56.78.21",
    device: "Chrome on Windows",
  },
  {
    id: "log-021",
    action: "Approval rejected",
    description: "Insufficient justification provided",
    eventType: "DAT_APPROVAL",
    actor: "Patrick Okoth",
    actorId: "usr-admin-002",
    actorRole: "ADMINISTRATOR",
    targetLabel: "Early closure — 2026 SACCO General Election",
    ...GENERAL,
    module: "APPROVALS",
    result: "FAILED",
    riskLevel: "MEDIUM",
    timestamp: "2026-08-24T08:12:00Z",
    hash: "9d2f6b8a...1e75",
    ipAddress: "154.56.78.40",
    device: "Edge on Windows",
  },
  {
    id: "log-022",
    action: "Auditor logged in",
    description: "Read-only session started",
    eventType: "LOGIN",
    actor: "Grace Achieng",
    actorId: "usr-auditor-001",
    actorRole: "AUDITOR",
    module: "AUTH",
    result: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-23T10:05:00Z",
    hash: "7b1e9c3d...48fa",
    ipAddress: "41.215.33.12",
    device: "Firefox on Windows",
  },
  {
    id: "log-023",
    action: "User suspended",
    description: "Account suspended pending review",
    eventType: "USER_UPDATED",
    actor: "Mary Njeri",
    actorId: "usr-admin-003",
    actorRole: "ADMINISTRATOR",
    targetLabel: "Member #0442",
    module: "USERS",
    result: "SUCCESS",
    riskLevel: "HIGH",
    timestamp: "2026-08-22T15:58:00Z",
    hash: "2a8d4e6c...b930",
    ipAddress: "197.232.61.55",
    device: "Chrome on Windows",
    statusNote: "Suspension logged for DAT review",
  },
  {
    id: "log-024",
    action: "Risk alert generated",
    description: "Duplicate ballot attempt blocked",
    eventType: "RISK_ALERT",
    actor: "AI Governance",
    actorId: "system-ai-governance",
    actorRole: "SYSTEM",
    ...GENERAL,
    module: "ELECTIONS",
    result: "SUCCESS",
    riskLevel: "HIGH",
    timestamp: "2026-08-22T12:37:00Z",
    hash: "6c3b9a1f...d582",
    statusNote: "Blocked before ballot storage",
    aiInsight:
      "A second ballot submission was attempted against an already-recorded member token. The system rejected it; no duplicate vote was stored.",
  },
];

export function getRecentAuditLogs(limit = 5): AuditLogEntry[] {
  return [...mockAuditLogs]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit);
}

export function getAuditEventCountForElection(electionId: string): number {
  return mockAuditLogs.filter((log) => log.electionId === electionId).length;
}

export function getHighRiskAuditLogs(): AuditLogEntry[] {
  return mockAuditLogs.filter((log) => log.riskLevel === "HIGH");
}

export function getElectionActivityTimeline(
  electionId: string,
): AuditLogEntry[] {
  return mockAuditLogs
    .filter((log) => log.electionId === electionId)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

/** Static deltas — a prototype doesn't benefit from genuinely computing 7-day trends. */
const STATIC_DELTAS = { total: 12, successful: 11, failed: 28, highRisk: 3 };

export function getAuditStats(
  logs: AuditLogEntry[] = mockAuditLogs,
): AuditStats {
  return {
    totalEvents: logs.length,
    successfulEvents: logs.filter((l) => l.result === "SUCCESS").length,
    failedEvents: logs.filter((l) => l.result === "FAILED").length,
    highRiskEvents: logs.filter((l) => l.riskLevel === "HIGH").length,
    totalDeltaPct: STATIC_DELTAS.total,
    successfulDeltaPct: STATIC_DELTAS.successful,
    failedDeltaPct: STATIC_DELTAS.failed,
    highRiskDeltaPct: STATIC_DELTAS.highRisk,
  };
}

export function getAuditLogById(id: string): AuditLogEntry | undefined {
  return mockAuditLogs.find((l) => l.id === id);
}

/** Powers "View Related Events" — same election, or same actor when there's no election. */
export function getRelatedAuditLogs(
  log: AuditLogEntry,
  limit = 5,
): AuditLogEntry[] {
  return mockAuditLogs
    .filter((l) => l.id !== log.id)
    .filter((l) =>
      log.electionId
        ? l.electionId === log.electionId
        : l.actorId === log.actorId,
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit);
}

/** Distinct elections present in the log set — feeds the Election filter dropdown. */
export function getAuditElectionOptions(): { id: string; title: string }[] {
  const seen = new Map<string, string>();
  mockAuditLogs.forEach((l) => {
    if (l.electionId && l.electionTitle)
      seen.set(l.electionId, l.electionTitle);
  });
  return [...seen].map(([id, title]) => ({ id, title }));
}
