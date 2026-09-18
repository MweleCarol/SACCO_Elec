export interface CandidateResult {
  candidateId: string;
  candidateName: string;
  votes: number;
  isWinner: boolean;
  photoUrl?: string;
}

export interface PositionResult {
  positionId: string;
  positionTitle: string;
  totalVotesCast: number;
  candidates: CandidateResult[];
}

/** One point in the cumulative votes-over-time series, for the participation line chart. */
export interface VoteTimelinePoint {
  /** Display label for the x-axis, e.g. "8 AM". */
  time: string;
  /** Cumulative votes cast by this point in time. */
  votes: number;
}

export interface ElectionResult {
  electionId: string;
  publishedAt: string;
  positions: PositionResult[];
  validVotes: number;
  invalidVotes: number;
  verifiedAt?: string;
  verifiedBy?: string;
  publishedBy?: string;
  /** Optional — powers the "Voter Participation" chart. Absent for older/legacy results. */
  voteTimeline?: VoteTimelinePoint[];
}

export interface ResultHighlight {
  label: string;
  value: string;
}