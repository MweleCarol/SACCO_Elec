import { prisma } from "../../config/prisma";
import { Election, ElectionStatus, Prisma } from "@prisma/client";

export function findElectionById(id: string): Promise<Election | null> {
  return prisma.election.findUnique({ where: { id } });
}

export interface ListElectionsFilters {
  status?: ElectionStatus;
  page: number;
  pageSize: number;
}

export async function listElections(
  filters: ListElectionsFilters
): Promise<{ elections: Election[]; totalCount: number }> {
  const where: Prisma.ElectionWhereInput = filters.status ? { status: filters.status } : {};

  const [elections, totalCount] = await prisma.$transaction([
    prisma.election.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.election.count({ where }),
  ]);

  return { elections, totalCount };
}

export function createElection(data: {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  requiredApprovals: number;
  createdById: string;
}): Promise<Election> {
  return prisma.election.create({ data });
}

export function updateElection(
  id: string,
  data: Partial<{ name: string; description: string; startDate: Date; endDate: Date; requiredApprovals: number }>,
  updatedById: string
): Promise<Election> {
  return prisma.election.update({ where: { id }, data: { ...data, updatedById } });
}

// Every lifecycle transition goes through this one function — it's the
// only place `status` gets written after creation, which is what makes
// "every transition is checked against ELECTION_TRANSITIONS first"
// actually true in practice, not just in comments.
export function setElectionStatus(
  id: string,
  status: ElectionStatus,
  updatedById: string,
  timestampField?: "activatedAt" | "closedAt" | "resultsPublishedAt" | "archivedAt"
): Promise<Election> {
  return prisma.election.update({
    where: { id },
    data: {
      status,
      updatedById,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
    },
  });
}