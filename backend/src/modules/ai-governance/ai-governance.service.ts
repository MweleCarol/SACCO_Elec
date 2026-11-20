import { NotFoundError } from "../../shared/errors/NotFoundError";
import { writeAuditLog } from "../audit/audit.service";
import * as repo from "./ai-governance.repository";
import { toAIInsightDto, AIInsightDto } from "./ai-governance.dto";
import { ListInsightsQuery } from "./ai-governance.schema";
import { env } from "../../config/env";

const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

// Rule 1: rapid failed logins
const FAILED_LOGIN_THRESHOLD = 3;
const FAILED_LOGIN_WINDOW_MS = 10 * 60 * 1000;

async function detectRapidFailedLogins(since: Date): Promise<void> {
  const logs = await repo.getRecentAuditLogs(since, ["LOGIN_FAILED"]);

  const byKey = new Map<string, typeof logs>();
  for (const log of logs) {
    const key = log.actorId ?? `email:${(log.metadata as { email?: string } | null)?.email ?? "unknown"}`;
    byKey.set(key, [...(byKey.get(key) ?? []), log]);
  }

  for (const [key, attempts] of byKey) {
    attempts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (let i = 0; i + FAILED_LOGIN_THRESHOLD - 1 < attempts.length; i++) {
      const windowStart = attempts[i].createdAt;
      const windowEnd = attempts[i + FAILED_LOGIN_THRESHOLD - 1].createdAt;
      if (windowEnd.getTime() - windowStart.getTime() > FAILED_LOGIN_WINDOW_MS) continue;

      const resourceId = attempts[0].actorId ?? key;
      const existing = await repo.findExistingInsight(
        "RAPID_FAILED_LOGINS", resourceId, new Date(Date.now() - DEDUPE_WINDOW_MS)
      );
      if (existing) break;

      await repo.createInsight({
        eventType: "RAPID_FAILED_LOGINS",
        resourceType: "User",
        resourceId,
        features: { attemptCount: FAILED_LOGIN_THRESHOLD, windowMs: FAILED_LOGIN_WINDOW_MS },
        riskLevel: "HIGH",
        recommendation: "Review this account for a possible credential-stuffing or brute-force attempt.",
        reasoning: `${FAILED_LOGIN_THRESHOLD} failed login attempts occurred within ${Math.round(FAILED_LOGIN_WINDOW_MS / 60000)} minutes.`,
        evidence: { auditLogIds: attempts.slice(i, i + FAILED_LOGIN_THRESHOLD).map((a) => a.id) },
        confidence: 0.8,
      });
      break;
    }
  }
}

// Rule 2: approval decided suspiciously fast
const FAST_APPROVAL_THRESHOLD_MS = 30 * 1000;

function approvalRequestIdOf(log: { metadata: unknown }): string | undefined {
  const id = (log.metadata as { approvalRequestId?: unknown } | null)?.approvalRequestId;
  return typeof id === "string" ? id : undefined;
}

async function detectFastApprovals(since: Date): Promise<void> {
  const requested = await repo.getRecentAuditLogs(since, ["APPROVAL_REQUESTED"]);
  const decided = await repo.getRecentAuditLogs(since, ["APPROVAL_DECIDED"]);

  for (const req of requested) {
    const requestId = approvalRequestIdOf(req);
    if (!req.resourceId || !requestId) continue;

    // Match decisions on THIS approval request, not just the same election:
    // an election can have several requests (activation, then publication),
    // and pairing with an earlier request's decision gave a negative gap that
    // was always reported as "fast".
    const decision = decided.find((d) => approvalRequestIdOf(d) === requestId);
    if (!decision) continue;

    const deltaMs = decision.createdAt.getTime() - req.createdAt.getTime();
    if (deltaMs < 0 || deltaMs > FAST_APPROVAL_THRESHOLD_MS) continue;

    const existing = await repo.findExistingInsight(
      "FAST_APPROVAL", req.resourceId, new Date(Date.now() - DEDUPE_WINDOW_MS)
    );
    if (existing) continue;

    await repo.createInsight({
      eventType: "FAST_APPROVAL",
      resourceType: req.resourceType ?? undefined,
      resourceId: req.resourceId,
      features: { deltaMs, approvalRequestId: requestId },
      riskLevel: "MEDIUM",
      recommendation: "Confirm the reviewing officer had adequate time to evaluate this request.",
      reasoning: `A decision was recorded ${Math.round(deltaMs / 1000)} seconds after the request was made.`,
      evidence: { requestedLogId: req.id, decidedLogId: decision.id },
      confidence: 0.6,
    });
  }
}

// Rule 3: sensitive actions outside normal working hours (06:00-22:00) in the
// SACCO's own time zone (GOVERNANCE_TIMEZONE, default Africa/Nairobi). Using
// UTC hours meant 06:00-22:00 UTC, which is 09:00-01:00 in Nairobi.
const SENSITIVE_ACTIONS = ["ELECTION_ACTIVATED", "ELECTION_CANCELLED", "RESULTS_PUBLISHED", "MEMBERSHIP_SYNC_COMPLETED"];
const WORKING_HOURS = { start: 6, end: 22 };

function localHour(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(date);
  return Number(hour);
}

async function detectOffHoursActivity(since: Date): Promise<void> {
  const logs = await repo.getRecentAuditLogs(since, SENSITIVE_ACTIONS);
  const timeZone = env.GOVERNANCE_TIMEZONE;

  for (const log of logs) {
    const hour = localHour(log.createdAt, timeZone);
    if (hour >= WORKING_HOURS.start && hour < WORKING_HOURS.end) continue;

    const existing = await repo.findExistingInsight(
      "OFF_HOURS_ACTIVITY", log.id, new Date(Date.now() - DEDUPE_WINDOW_MS)
    );
    if (existing) continue;

    const hh = String(hour).padStart(2, "0");
    await repo.createInsight({
      eventType: "OFF_HOURS_ACTIVITY",
      resourceType: log.resourceType ?? undefined,
      resourceId: log.id,
      features: { localHour: hour, timeZone, action: log.action },
      riskLevel: "LOW",
      recommendation: "Verify this action was performed by an authorized user during expected working hours.",
      reasoning: `"${log.action}" was performed at ${hh}:00 (${timeZone}), outside the usual 06:00-22:00 working window.`,
      evidence: { auditLogId: log.id },
      confidence: 0.5,
    });
  }
}

export async function runScan(triggeredById: string): Promise<{ scannedSince: Date }> {
  const since = new Date(Date.now() - SCAN_WINDOW_MS);

  await Promise.all([
    detectRapidFailedLogins(since),
    detectFastApprovals(since),
    detectOffHoursActivity(since),
  ]);

  await writeAuditLog({
    actorId: triggeredById, action: "GOVERNANCE_SCAN_COMPLETED", outcome: "SUCCESS",
    metadata: { windowStart: since.toISOString() },
  });

  return { scannedSince: since };
}

export async function listInsights(query: ListInsightsQuery) {
  const [insights, totalCount] = await repo.listInsights(query);
  return {
    insights: insights.map(toAIInsightDto),
    pagination: { page: query.page, pageSize: query.pageSize, totalCount, totalPages: Math.ceil(totalCount / query.pageSize) },
  };
}

export async function getInsightById(id: string): Promise<AIInsightDto> {
  const insight = await repo.findInsightById(id);
  if (!insight) throw new NotFoundError("Insight");
  return toAIInsightDto(insight);
}

// Human-in-the-Loop: acknowledging never triggers any automatic action.
export async function acknowledgeInsight(userId: string, id: string): Promise<AIInsightDto> {
  const insight = await repo.findInsightById(id);
  if (!insight) throw new NotFoundError("Insight");
  const updated = await repo.acknowledgeInsight(id, userId);
  return toAIInsightDto(updated);
}

export async function getElectionReport(electionId: string) {
  const data = await repo.getElectionReportData(electionId);
  if (!data.election) throw new NotFoundError("Election");
  return {
    electionId: data.election.id,
    name: data.election.name,
    status: data.election.status,
    positionCount: data.positionCount,
    candidateCount: data.candidateCount,
    participationCount: data.participationCount,
    openInsightCount: data.insightCount,
  };
}