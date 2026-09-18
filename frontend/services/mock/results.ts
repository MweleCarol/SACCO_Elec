import type { ElectionResult, ResultHighlight } from "@/types/result";
import { mockElections } from "@/services/mock/elections";

export const mockResults: ElectionResult[] = [
  {
    electionId: "el-2025-agm",
    publishedAt: "2026-09-02T16:45:00Z",
    validVotes: 872,
    invalidVotes: 3,
    verifiedAt: "2026-09-02T14:10:00Z",
    verifiedBy: "Jane Wanjiku",
    publishedBy: "Patrick Okoth",
    voteTimeline: [
      { time: "8 AM", votes: 180 },
      { time: "10 AM", votes: 310 },
      { time: "12 PM", votes: 430 },
      { time: "2 PM", votes: 560 },
      { time: "4 PM", votes: 680 },
      { time: "6 PM", votes: 875 },
    ],
    positions: [
      {
        positionId: "pos-agm-chair",
        positionTitle: "Chairperson",
        totalVotesCast: 872,
        candidates: [
          { candidateId: "cand-agm-chair-1", candidateName: "Jane Wanjiku", votes: 342, isWinner: true, photoUrl: "https://i.pravatar.cc/150?u=cand-agm-chair-1" },
          { candidateId: "cand-agm-chair-2", candidateName: "John Kamau", votes: 298, isWinner: false, photoUrl: "https://i.pravatar.cc/150?u=cand-agm-chair-2" },
          { candidateId: "cand-agm-chair-3", candidateName: "Mary Njeri", votes: 232, isWinner: false, photoUrl: "https://i.pravatar.cc/150?u=cand-agm-chair-3" },
        ],
      },
      {
        positionId: "pos-agm-treasurer",
        positionTitle: "Treasurer",
        totalVotesCast: 874,
        candidates: [
          { candidateId: "cand-agm-treasurer-1", candidateName: "Peter Mwangi", votes: 468, isWinner: true, photoUrl: "https://i.pravatar.cc/150?u=cand-agm-treasurer-1" },
          { candidateId: "cand-agm-treasurer-2", candidateName: "Grace Achieng", votes: 312, isWinner: false, photoUrl: "https://i.pravatar.cc/150?u=cand-agm-treasurer-2" },
          { candidateId: "cand-agm-treasurer-3", candidateName: "David Otieno", votes: 94, isWinner: false, photoUrl: "https://i.pravatar.cc/150?u=cand-agm-treasurer-3" },
        ],
      },
      {
        positionId: "pos-agm-secretary",
        positionTitle: "Secretary",
        totalVotesCast: 875,
        candidates: [
          { candidateId: "cand-agm-secretary-1", candidateName: "Alice Wambui", votes: 421, isWinner: true, photoUrl: "https://i.pravatar.cc/150?u=cand-agm-secretary-1" },
          { candidateId: "cand-agm-secretary-2", candidateName: "Brian Kariuki", votes: 287, isWinner: false, photoUrl: "https://i.pravatar.cc/150?u=cand-agm-secretary-2" },
          { candidateId: "cand-agm-secretary-3", candidateName: "Esther Muthoni", votes: 167, isWinner: false, photoUrl: "https://i.pravatar.cc/150?u=cand-agm-secretary-3" },
        ],
      },
    ],
  },
];

export function getResultByElection(electionId: string): ElectionResult | undefined {
  return mockResults.find((r) => r.electionId === electionId);
}

export function getElectionResultSummary(electionId: string) {
  const result = mockResults.find((r) => r.electionId === electionId);
  const election = mockElections.find((e) => e.id === electionId);
  if (!result || !election) return null;

  const turnout = election.totalEligibleVoters > 0
    ? Math.round((election.totalVotesCast / election.totalEligibleVoters) * 100)
    : 0;

  return {
    result,
    election,
    turnout,
    notVoted: Math.max(0, election.totalEligibleVoters - election.totalVotesCast),
  };
}


export function getVoteTimeline(electionId: string): { time: string; votes: number }[] {
  return getResultByElection(electionId)?.voteTimeline ?? [];
}

export function getResultHighlights(electionId: string): ResultHighlight[] {
  const result = getResultByElection(electionId);
  if (!result) return [];

  const shareByPosition = result.positions.map((p) => {
    const winner = p.candidates.find((c) => c.isWinner);
    const sharePct = winner && p.totalVotesCast > 0 ? Math.round((winner.votes / p.totalVotesCast) * 1000) / 10 : 0;
    return { position: p.positionTitle, sharePct };
  });

  const highest = shareByPosition.reduce((a, b) => (b.sharePct > a.sharePct ? b : a), shareByPosition[0]);
  const lowest = shareByPosition.reduce((a, b) => (b.sharePct < a.sharePct ? b : a), shareByPosition[0]);

  const totalVotesCast = result.validVotes + result.invalidVotes;
  const invalidPct = totalVotesCast > 0 ? Math.round((result.invalidVotes / totalVotesCast) * 1000) / 10 : 0;

  const highlights: ResultHighlight[] = [];
  if (highest) highlights.push({ label: "Highest turnout", value: `${highest.position} (${highest.sharePct}%)` });
  if (lowest && lowest.position !== highest?.position) {
    highlights.push({ label: "Lowest turnout", value: `${lowest.position} (${lowest.sharePct}%)` });
  }
  highlights.push({ label: "Total invalid votes", value: `${result.invalidVotes} (${invalidPct}%)` });
  highlights.push({ label: "Results verified and published", value: "" });

  return highlights;
}