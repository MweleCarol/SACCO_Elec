
export type CandidateStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export interface Candidate {
  id: string;
  electionId: string;
  positionId: string;
  applicantMemberId: string; // NEW — links the candidate record back to the member who applied
  membershipNumber: string;
  name: string;
  bio: string;
  photoUrl: string;
  status: CandidateStatus;
  submittedAt: string;
  eligibilityConfirmed: boolean; // NEW — the member's own attestation, not the officer's verification
  declarationConfirmed: boolean; // NEW
  documentUrl?: string; // NEW — mock only, no real file upload/storage exists yet
  votesReceivedDevOnly: number; // NEW — for development/testing purposes only, not used in production
}