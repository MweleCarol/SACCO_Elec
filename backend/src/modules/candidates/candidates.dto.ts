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

// What members receive: no memberId. That is an internal user id linking the
// candidate to a member account, which other members have no use for.
export type PublicCandidateDto = Omit<CandidateDto, "memberId">;

export function toPublicCandidateDto(candidate: Candidate): PublicCandidateDto {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { memberId, ...rest } = toCandidateDto(candidate);
  return rest;
}


// A member's own nomination, with enough context to show it on its own page.
export interface MyCandidacyDto extends CandidateDto {
  election: { id: string; name: string; status: string; startDate: Date; endDate: Date };
  position: { id: string; name: string };
}