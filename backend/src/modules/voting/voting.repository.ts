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

// Validates that every submitted candidateId is APPROVED and actually
// belongs to the positionId it was submitted under, within this election —
// prevents a client from voting for a candidate registered under a
// different position, or one that was rejected/withdrawn after the ballot
// was fetched but before it was submitted.
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

// The transaction that actually records a vote. Participation is created
// FIRST inside the transaction — its @@unique([electionId, userId])
// constraint is the real, DB-level, concurrency-safe one-vote guarantee.
// If two requests from the same member race each other, Postgres itself
// guarantees only one Participation insert succeeds; the loser's whole
// transaction (including its Vote inserts) rolls back automatically. This
// is why eligibility is checked twice: once early for a fast, friendly
// error, and again implicitly here via the constraint as the actual
// authoritative gate.
export async function recordVote(
  electionId: string,
  userId: string,
  votes: { positionId: string; candidateId: string; encryptedPayload: string; anonymousToken: string }[]
): Promise<Date> {
  const participation = await prisma.$transaction(async (tx) => {
    const created = await tx.participation.create({ data: { electionId, userId } });

    await tx.vote.createMany({
      data: votes.map((v) => ({
        electionId,
        positionId: v.positionId,
        candidateId: v.candidateId,
        encryptedPayload: v.encryptedPayload,
        anonymousToken: v.anonymousToken,
      })),
    });

    return created;
  });

  return participation.votedAt;
}