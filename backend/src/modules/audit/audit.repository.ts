import { prisma } from "../../config/prisma";
import { AuditLog, Prisma } from "@prisma/client";

export function findById(id: string): Promise<AuditLog | null> {
  return prisma.auditLog.findUnique({ where: { id } });
}

export interface ListAuditLogsFilters {
  actorId?: string; action?: string; resourceType?: string; resourceId?: string;
  electionId?: string; dateFrom?: Date; dateTo?: Date; page: number; pageSize: number;
}

export function listLogs(filters: ListAuditLogsFilters) {
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
    ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
    ...(filters.electionId ? { electionId: filters.electionId } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { createdAt: { ...(filters.dateFrom ? { gte: filters.dateFrom } : {}), ...(filters.dateTo ? { lte: filters.dateTo } : {}) } }
      : {}),
  };

  return prisma.$transaction([
    prisma.auditLog.findMany({
      where, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);
}

// One batch of the chain in write order (oldest first). `after` is the last row
// of the previous batch, so memory use stays bounded however long the chain is.
export function listVerificationBatch(params: {
  dateFrom?: Date;
  dateTo?: Date;
  after?: { createdAt: Date; id: string };
  take: number;
}): Promise<AuditLog[]> {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (params.dateFrom) and.push({ createdAt: { gte: params.dateFrom } });
  if (params.dateTo) and.push({ createdAt: { lte: params.dateTo } });
  if (params.after) {
    and.push({
      OR: [
        { createdAt: { gt: params.after.createdAt } },
        { createdAt: params.after.createdAt, id: { gt: params.after.id } },
      ],
    });
  }

  return prisma.auditLog.findMany({
    where: and.length ? { AND: and } : {},
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: params.take,
  });
}

export function countByActorAndActions(actorId: string, actions: string[], since: Date): Promise<number> {
  return prisma.auditLog.count({
    where: { actorId, action: { in: actions }, createdAt: { gte: since } },
  });
}