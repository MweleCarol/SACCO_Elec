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

// Ordered ascending by createdAt for chain walking — the reverse of the
// list-for-browsing order above, since the chain must be verified in the
// order it was actually written.
export function listForVerification(dateFrom?: Date, dateTo?: Date): Promise<AuditLog[]> {
  return prisma.auditLog.findMany({
    where: {
      ...(dateFrom || dateTo
        ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
        : {}),
    },
    orderBy: { createdAt: "asc" },
  });
}