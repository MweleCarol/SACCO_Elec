export type BallotStatus = "SUBMITTED" | "CONFIRMED";

/** Identity-linked: proves a member voted, without revealing what they chose. */
export interface VoterParticipation {
  id: string;
  memberId: string;
  electionId: string;
  votedAt: string;
  status: BallotStatus;
  receiptHash: string; // given to the voter; does not encode their selections
}

/** Anonymous: the actual selections, deliberately carrying no member reference. */
export interface AnonymousBallot {
  id: string;
  ballotReference: string; // matches VoterParticipation.receiptHash conceptually, not literally joinable to memberId
  electionId: string;
  selections: Record<string, string>; // positionId -> candidateId
  castAt: string;
}