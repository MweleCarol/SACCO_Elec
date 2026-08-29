import type { ElectionResult } from "@/types/result";

export const mockResults: ElectionResult[] = [
  {
    electionId: "el-2025-agm",
    publishedAt: "2025-11-11T09:00:00Z",
    positions: [
      {
        positionId: "pos-agm-chair",
        positionTitle: "Chairperson",
        totalVotesCast: 812,
        candidates: [
          { candidateId: "cand-agm-001", candidateName: "James Kariuki", votes: 480, isWinner: true },
          { candidateId: "cand-agm-002", candidateName: "Esther Wambui", votes: 332, isWinner: false },
        ],
      },
    ],
  },
];

export function getResultByElection(electionId: string): ElectionResult | undefined {
  return mockResults.find((r) => r.electionId === electionId);
}