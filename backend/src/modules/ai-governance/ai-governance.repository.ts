import { prisma } from "../../config/prisma";
import { AuditLog, RiskLevel } from "@prisma/client";

export function getRecentAuditLogs(since: Date, actions?: string[]): Promise<AuditLog[]> {
  return prisma.auditLog.findMany({
    where: { createdAt: { gte: since }, ...(actions ? { action: { in: actions } } : {}) },
    orderBy: { createdAt: "asc" },
  });
}

// Dedupe guard: don't re-flag the exact same resource for the exact same
// event type within the lookback window every time a scan runs.
export function findExistingInsight(eventType: string, resourceId: string, since: Date) {
  return prisma.aIInsight.findFirst({
    where: { eventType, resourceId, createdAt: { gte: since } },
  });
}

export function createInsight(data: {
  eventType: string; resourceType?: string; resourceId?: string; features: object;
  riskLevel?: RiskLevel; recommendation: string; reasoning: string; evidence: object; confidence?: number;
}) {
  return prisma.aIInsight.create({ data });
}

export function findInsightById(id: string) {
  return prisma.aIInsight.findUnique({ where: { id } });
}

export function listInsights(filters: {
  riskLevel?: RiskLevel; eventType?: string; acknowledgedOnly?: boolean; page: number; pageSize: number;
}) {
  const where = {
    ...(filters.riskLevel ? { riskLevel: filters.riskLevel } : {}),
    ...(filters.eventType ? { eventType: filters.eventType } : {}),
    ...(filters.acknowledgedOnly !== undefined
      ? filters.acknowledgedOnly
        ? { acknowledgedAt: { not: null } }
        : { acknowledgedAt: null }
      : {}),
  };
  return prisma.$transaction([
    prisma.aIInsight.findMany({
      where, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.aIInsight.count({ where }),
  ]);
}

export function acknowledgeInsight(id: string, userId: string) {
  return prisma.aIInsight.update({ where: { id }, data: { acknowledgedBy: userId, acknowledgedAt: new Date() } });
}

// --- Data for the Copilot's context and the reports endpoint — aggregates ONLY, never Vote/Participation rows ---

export async function getElectionCountsByStatus() {
  const grouped = await prisma.election.groupBy({ by: ["status"], _count: { status: true } });
  return Object.fromEntries(grouped.map((g) => [g.status, g._count.status]));
}

export async function getRecentAuditOutcomeCounts(since: Date) {
  const grouped = await prisma.auditLog.groupBy({
    by: ["outcome"], where: { createdAt: { gte: since } }, _count: { outcome: true },
  });
  return Object.fromEntries(grouped.map((g) => [g.outcome, g._count.outcome]));
}

export async function getOpenInsightCountsByRisk() {
  const grouped = await prisma.aIInsight.groupBy({
    by: ["riskLevel"], where: { acknowledgedAt: null }, _count: { riskLevel: true },
  });
  return Object.fromEntries(grouped.map((g) => [g.riskLevel ?? "UNSPECIFIED", g._count.riskLevel]));
}

export function getRecentUnacknowledgedInsights(limit: number) {
  return prisma.aIInsight.findMany({
    where: { acknowledgedAt: null }, orderBy: { createdAt: "desc" }, take: limit,
    select: { eventType: true, riskLevel: true, recommendation: true, createdAt: true },
  });
}

export async function getElectionReportData(electionId: string) {
  const [election, positionCount, candidateCount, participationCount, insightCount] = await Promise.all([
    prisma.election.findUnique({ where: { id: electionId } }),
    prisma.position.count({ where: { electionId } }),
    prisma.candidate.count({ where: { electionId } }),
    prisma.participation.count({ where: { electionId } }),
    prisma.aIInsight.count({ where: { resourceId: electionId } }),
  ]);
  return { election, positionCount, candidateCount, participationCount, insightCount };
}