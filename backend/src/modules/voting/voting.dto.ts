export interface BallotCandidateDto {
  id: string;
  displayName: string;
  manifesto: string | null;
  photoUrl: string | null;
}

export interface BallotPositionDto {
  id: string;
  name: string;
  description: string | null;
  seats: number;
  candidates: BallotCandidateDto[];
}

export interface BallotDto {
  electionId: string;
  electionName: string;
  positions: BallotPositionDto[];
}

export interface ParticipationStatusDto {
  hasVoted: boolean;
  votedAt: Date | null;
}