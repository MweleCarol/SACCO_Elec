import { prisma } from "../../config/prisma";
import { Election, ElectionStatus, Prisma } from "@prisma/client";

export function findElectionById(id: string): Promise<Election | null> {
  return prisma.election.findUnique({ where: { id } });
}

export interface ListElectionsFilters {
  status?: ElectionStatus;
  // Extra condition ANDed with `status`; used to limit what members can list.
  visibilityWhere?: Prisma.ElectionWhereInput;
  page: number;
  pageSize: number;
}

export async function listElections(
  filters: ListElectionsFilters,
): Promise<{ elections: Election[]; totalCount: number }> {
  const where: Prisma.ElectionWhereInput = {
    AND: [
      filters.status ? { status: filters.status } : {},
      filters.visibilityWhere ?? {},
    ],
  };

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
  data: Partial<{
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    requiredApprovals: number;
  }>,
  updatedById: string,
): Promise<Election> {
  return prisma.election.update({
    where: { id },
    data: { ...data, updatedById },
  });
}

// Every lifecycle transition goes through this one function — it's the
// only place `status` gets written after creation, which is what makes
// "every transition is checked against ELECTION_TRANSITIONS first"
// actually true in practice, not just in comments.
export function setElectionStatus(
  id: string,
  status: ElectionStatus,
  updatedById: string,
  timestampField?:
    | "approvedAt"
    | "activatedAt"
    | "closedAt"
    | "resultsPublishedAt"
    | "archivedAt",
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

// ACTIVE elections whose voting window has ended. Used by the scheduler.
export function findEndedActiveElections(now: Date): Promise<Election[]> {
  return prisma.election.findMany({
    where: { status: "ACTIVE", endDate: { lte: now } },
    orderBy: { endDate: "asc" },
  });
}

// Closes the election only if it is still ACTIVE and past its end date.
// Same claim pattern as DAT resolution: if an officer closed it a moment
// earlier, count is 0 and the scheduler does nothing.
export async function closeIfEnded(
  id: string,
  now: Date,
  eligibleVoterCount: number,
): Promise<boolean> {
  const result = await prisma.election.updateMany({
    where: { id, status: "ACTIVE", endDate: { lte: now } },
    data: {
      status: "CLOSED",
      closedAt: now,
      updatedById: null,
      eligibleVoterCount,
    },
  });
  return result.count > 0;
}



// Manual close by an officer: same fields as setElectionStatus(..., "closedAt")
// plus the eligible-voter snapshot used for turnout.
export function markClosed(id: string, officerId: string, eligibleVoterCount: number): Promise<Election> {
  return prisma.election.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date(), updatedById: officerId, eligibleVoterCount },
  });
}

// Members who may vote: the same rule as verification.service checkEligibility.
export function countEligibleVoters(): Promise<number> {
  return prisma.user.count({ where: { role: "MEMBER", membershipStatus: "ACTIVE" } });
}

// Each position with how many APPROVED candidates it has, in ballot order.
// Takes the client so it can run inside the activation transaction too.
export function ballotReadiness(electionId: string, client: Prisma.TransactionClient = prisma) {
  return client.position.findMany({
    where: { electionId },
    orderBy: { order: "asc" },
    select: { name: true, _count: { select: { candidates: { where: { status: "APPROVED" } } } } },
  });
}

// Used before an election goes for review: a ballot needs positions.
export function countPositions(electionId: string): Promise<number> {
  return prisma.position.count({ where: { electionId } });
}