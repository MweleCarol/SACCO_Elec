import { Candidate, CandidateStatus } from "@prisma/client";

export interface CandidateDto {
  id: string;
  electionId: string;
  positionId: string;
  memberId: string | null;
  displayName: string;
  manifesto: string | null;
  photoUrl: string | null;
  status: CandidateStatus;
  withdrawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toCandidateDto(candidate: Candidate): CandidateDto {
  return {
    id: candidate.id,
    electionId: candidate.electionId,
    positionId: candidate.positionId,
    memberId: candidate.memberId,
    displayName: candidate.displayName,
    manifesto: candidate.manifesto,
    photoUrl: candidate.photoUrl,
    status: candidate.status,
    withdrawnAt: candidate.withdrawnAt,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}