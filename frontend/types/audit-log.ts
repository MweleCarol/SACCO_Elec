

import type { UserRole } from "@/types/member";

export type AuditModule =
  | "ELECTIONS" | "CANDIDATES" | "APPROVALS" | "AUTH" | "USERS" | "MEMBERSHIP_SYNC";

export type AuditRiskLevel = "LOW" | "MEDIUM" | "HIGH";

/** Outcome of the operation — drives the Result column/badge. */
export type AuditResult = "SUCCESS" | "FAILED";

/** System-generated events have no human actor role. */
export type AuditActorRole = UserRole | "SYSTEM";

/** Drives the per-row event icon. Keep this list closed so the icon map is exhaustive. */
export type AuditEventType =
  | "VOTE_CAST"
  | "LOGIN"
  | "AUTH_FAILURE"
  | "SECURITY_ALERT"
  | "CANDIDATE_APPLICATION"
  | "CANDIDATE_APPROVED"
  | "CANDIDATE_REJECTED"
  | "APPROVAL_SUBMITTED"
  | "DAT_APPROVAL"
  | "ELECTION_CREATED"
  | "ELECTION_CONFIG_CHANGED"
  | "RESULTS_PUBLISHED"
  | "RISK_ALERT"
  | "USER_UPDATED"
  | "MEMBERSHIP_SYNC";

export interface AuditLogEntry {
  id: string;
  /** Short event name — the bold line in the Event column. */
  action: string;
  /** Secondary line under the event name, e.g. "Member submitted ballot". */
  description?: string;
  eventType: AuditEventType;

  actor: string;
  actorId: string;
  actorRole: AuditActorRole;

  targetLabel?: string;
  electionId?: string;
  /** Denormalised for display so the table doesn't lookup per row. */
  electionTitle?: string;

  module: AuditModule;
  result: AuditResult;
  riskLevel: AuditRiskLevel;
  timestamp: string;
  hash: string;

  // Event Details panel
  ipAddress?: string;
  device?: string;

  // "Additional Information" — only present on some event types
  ballotReference?: string;
  statusNote?: string;

  /** AI Governance commentary shown in the AI Insight card. */
  aiInsight?: string;
}

export interface AuditStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  highRiskEvents: number;
  /** Prototype only — static deltas vs. the previous 7 days. */
  totalDeltaPct: number;
  successfulDeltaPct: number;
  failedDeltaPct: number;
  highRiskDeltaPct: number;
}

// @/types/audit-log.ts — add near AuditActorRole
export type AuditResultFilter = AuditResult; // "SUCCESS" | "FAILED"