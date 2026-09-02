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

export function createCandidate(data: {
  electionId: string; positionId: string; displayName: string;
  manifesto?: string; photoUrl?: string; memberId?: string;
}): Promise<Candidate> {
  return prisma.candidate.create({ data });
}

export function updateCandidate(
  id: string, data: Partial<{ displayName: string; manifesto: string; photoUrl: string }>
): Promise<Candidate> {
  return prisma.candidate.update({ where: { id }, data });
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