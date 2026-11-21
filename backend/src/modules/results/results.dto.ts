import { ResultStatus } from "@prisma/client";

export interface ResultDto {
  id: string;
  positionId: string;
  positionName: string;
  candidateId: string;
  candidateName: string;
  voteCount: number;
  isWinner: boolean;
  status: ResultStatus;
  publishedAt: Date | null;
}


export interface TurnoutDto {
  votesCast: number;
  // null for elections closed before the eligible-voter count was recorded.
  eligibleVoters: number | null;
  turnoutPercent: number | null; // one decimal place
  // true while voting is still open: the numbers are still changing.
  isLive: boolean;
}