export interface CandidateResult {
  candidateId: string;
  candidateName: string;
  votes: number;
  isWinner: boolean;
}

export interface PositionResult {
  positionId: string;
  positionTitle: string;
  totalVotesCast: number;
  candidates: CandidateResult[];
}

export interface ElectionResult {
  electionId: string;
  publishedAt: string; // ISO date string
  positions: PositionResult[];
}