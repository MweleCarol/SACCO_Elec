import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";

export async function getVoteTally(
  electionId: string
): Promise<{ positionId: string; candidateId: string; voteCount: number }[]> {
  const grouped = await prisma.vote.groupBy({
    by: ["positionId", "candidateId"],
    where: { electionId },
    _count: { candidateId: true },
  });
  return grouped.map((g) => ({
    positionId: g.positionId, candidateId: g.candidateId, voteCount: g._count.candidateId,
  }));
}

// Every APPROVED candidate per position, including ones with zero votes:
// the tally only has rows for candidates who received at least one vote.
export async function getApprovedCandidatesByPosition(electionId: string) {
  return prisma.position.findMany({
    where: { electionId },
    include: { candidates: { where: { status: "APPROVED" }, orderBy: { createdAt: "asc" } } },
  });
}

// Delete-then-recreate makes re-tallying idempotent before publication.
export async function replaceResults(
  electionId: string,
  results: { positionId: string; candidateId: string; voteCount: number; isWinner: boolean }[]
): Promise<void> {
  await prisma.$transaction([
    prisma.result.deleteMany({ where: { electionId } }),
    prisma.result.createMany({ data: results.map((r) => ({ electionId, ...r })) }),
  ]);
}

export function listResults(electionId: string) {
  return prisma.result.findMany({
    where: { electionId },
    include: { position: { select: { name: true } }, candidate: { select: { displayName: true } } },
    orderBy: [{ positionId: "asc" }, { voteCount: "desc" }],
  });
}

export function publishResults(electionId: string, tx: Prisma.TransactionClient) {
  return tx.result.updateMany({
    where: { electionId }, data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}