import { prisma } from "../../config/prisma";
import { Candidate, CandidateStatus, Prisma } from "@prisma/client";

export function findCandidateById(id: string): Promise<Candidate | null> {
  return prisma.candidate.findUnique({ where: { id } });
}

export function listCandidatesByElection(
  electionId: string,
  filters: { status?: CandidateStatus; positionId?: string }
): Promise<Candidate[]> {
  const where: Prisma.CandidateWhereInput = {
    electionId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.positionId ? { positionId: filters.positionId } : {}),
  };
  return prisma.candidate.findMany({ where, orderBy: { createdAt: "asc" } });
}



export function setCandidateStatus(
  id: string, status: CandidateStatus, withdrawnAt?: Date
): Promise<Candidate> {
  return prisma.candidate.update({
    where: { id },
    data: { status, ...(withdrawnAt ? { withdrawnAt } : {}) },
  });
}

// Used at registration time to confirm the given positionId actually
// belongs to the election a candidate is being registered under — without
// this check, a client could register a candidate under one election's
// position ID while nominally submitting to a different election.
export async function positionBelongsToElection(positionId: string, electionId: string): Promise<boolean> {
  const position = await prisma.position.findUnique({ where: { id: positionId } });
  return position !== null && position.electionId === electionId;
}



// Creates a self-nomination unless the member already has one awaiting
// review or approved in this election. The member's row is locked first, so
// two quick submissions cannot both pass the check. Returns null on a
// duplicate.
export async function createSelfNomination(data: {
  electionId: string; positionId: string; memberId: string; displayName: string; manifesto: string;
}): Promise<Candidate | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${data.memberId} FOR UPDATE`;
    const existing = await tx.candidate.findFirst({
      where: {
        electionId: data.electionId,
        memberId: data.memberId,
        status: { in: ["PENDING_REVIEW", "APPROVED"] },
      },
    });
    if (existing) return null;
    return tx.candidate.create({ data: { ...data, status: "PENDING_REVIEW" } });
  });
}

export function listCandidaciesForMember(memberId: string, electionWhere: Prisma.ElectionWhereInput) {
  return prisma.candidate.findMany({
    where: { memberId, election: electionWhere },
    include: {
      election: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
      position: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}