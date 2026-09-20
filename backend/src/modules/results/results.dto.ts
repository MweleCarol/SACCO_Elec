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