import { prisma } from "../../config/prisma";
import { Election, Position, Candidate } from "@prisma/client";

export function findElectionById(id: string): Promise<Election | null> {
  return prisma.election.findUnique({ where: { id } });
}

export async function getBallotStructure(
  electionId: string
): Promise<(Position & { candidates: Candidate[] })[]> {
  return prisma.position.findMany({
    where: { electionId },
    orderBy: { order: "asc" },
    include: { candidates: { where: { status: "APPROVED" } } },
  });
}

export function findParticipation(electionId: string, userId: string) {
  return prisma.participation.findUnique({
    where: { electionId_userId: { electionId, userId } },
  });
}

// Every submitted candidate must be APPROVED and belong to the position it was
// submitted under, within this election. This blocks voting for a candidate
// registered under another position, or one rejected or withdrawn after the
// ballot was fetched.
export async function validateSelections(
  electionId: string,
  selections: { positionId: string; candidateId: string }[]
): Promise<{ valid: boolean; invalidReason?: string }> {
  const positions = await prisma.position.findMany({
    where: { electionId },
    include: { candidates: { where: { status: "APPROVED" } } },
  });

  const positionIds = new Set(positions.map((p) => p.id));
  const submittedPositionIds = new Set(selections.map((s) => s.positionId));

  if (positionIds.size !== submittedPositionIds.size) {
    return { valid: false, invalidReason: "You must select exactly one candidate for every position." };
  }
  for (const id of submittedPositionIds) {
    if (!positionIds.has(id)) return { valid: false, invalidReason: "One or more positions are invalid for this election." };
  }

  for (const selection of selections) {
    const position = positions.find((p) => p.id === selection.positionId)!;
    const candidateValid = position.candidates.some((c) => c.id === selection.candidateId);
    if (!candidateValid) {
      return { valid: false, invalidReason: "One or more candidate selections are invalid." };
    }
  }

  return { valid: true };
}

// Participation is created FIRST inside the transaction: its unique constraint
// on (electionId, userId) is the real, concurrency-safe one-vote guarantee. If
// two requests race, Postgres lets one Participation insert succeed and rolls
// back the other transaction, including its Vote inserts.
export async function recordVote(
  electionId: string,
  userId: string,
  votes: { positionId: string; candidateId: string; encryptedPayload: string; anonymousToken: string }[]
): Promise<Date> {
  const participation = await prisma.$transaction(async (tx) => {
    const created = await tx.participation.create({ data: { electionId, userId } });

    // Vote rows get a constant timestamp, the election's start. A real castAt
    // would be identical or within milliseconds of Participation.votedAt, which
    // lets anyone who can read the database match a voter to their votes.
    const election = await tx.election.findUniqueOrThrow({
      where: { id: electionId },
      select: { startDate: true },
    });

    await tx.vote.createMany({
      data: votes.map((v) => ({
        electionId,
        positionId: v.positionId,
        candidateId: v.candidateId,
        encryptedPayload: v.encryptedPayload,
        anonymousToken: v.anonymousToken,
        castAt: election.startDate,
      })),
    });

    return created;
  });

  return participation.votedAt;
}