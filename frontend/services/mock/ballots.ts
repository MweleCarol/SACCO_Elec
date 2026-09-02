import type { VoterParticipation, AnonymousBallot } from "@/types/ballot";

export const mockVoterParticipation: VoterParticipation[] = [
  {
    id: "part-001",
    memberId: "usr-member-grace-001", // TODO: confirm against your real member.ts id
    electionId: "el-2026-branch-delegate",
    votedAt: "2026-08-25T14:12:00Z",
    status: "CONFIRMED",
    receiptHash: "4d8f1a2c9e6b...mock",
  },
];

export const mockAnonymousBallots: AnonymousBallot[] = [];

export function getParticipationByMember(memberId: string): VoterParticipation[] {
  return mockVoterParticipation.filter((p) => p.memberId === memberId);
}

export function hasVotedInElection(memberId: string, electionId: string): boolean {
  return mockVoterParticipation.some((p) => p.memberId === memberId && p.electionId === electionId);
}

/**
 * Records a vote as two deliberately unlinked writes — a participation
 * record (who voted) and an anonymous ballot (what was chosen). In a real
 * backend these would be separate services/transactions with no shared
 * foreign key; here they're kept in separate mock arrays to preserve that
 * same conceptual boundary, even though both still run in the same
 * process. Returns the receipt shown to the voter.
 */
export function castVote(memberId: string, electionId: string, selections: Record<string, string>): string {
  const receiptHash = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  mockVoterParticipation.push({
    id: `part-${Date.now()}`,
    memberId,
    electionId,
    votedAt: new Date().toISOString(),
    status: "CONFIRMED",
    receiptHash,
  });

  mockAnonymousBallots.push({
    id: `ballot-${Date.now()}`,
    ballotReference: receiptHash,
    electionId,
    selections,
    castAt: new Date().toISOString(),
  });

  return receiptHash;
}