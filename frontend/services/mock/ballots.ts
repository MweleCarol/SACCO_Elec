import type { BallotRecord } from "@/types/ballot";

export const mockBallots: BallotRecord[] = [
  {
    id: "ballot-001",
    electionId: "el-2026-branch-delegate",
    memberId: "usr-member-004", // TODO: replace with Grace's real seeded id
    votedAt: "2026-08-25T14:12:00Z",
    status: "CONFIRMED",
    receiptHash: "4d8f1a2c9e6b...mock",
  },
];

export function getBallotsByMember(memberId: string): BallotRecord[] {
  return mockBallots.filter((b) => b.memberId === memberId);
}

export function hasVotedInElection(memberId: string, electionId: string): boolean {
  return mockBallots.some((b) => b.memberId === memberId && b.electionId === electionId);
}