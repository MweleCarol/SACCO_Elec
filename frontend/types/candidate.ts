
export type CandidateStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export interface Candidate {
  id: string;
  electionId: string; // Election.id
  positionId: string; // Position.id
  membershipNumber: string;
  name: string;
  bio: string;
  photoUrl: string;
  status: CandidateStatus;
  submittedAt: string; // ISO date string
  // Dev-only: NOT exposed in real UI before results publication.
  votesReceivedDevOnly: number;
}