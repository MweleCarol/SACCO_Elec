export type BallotStatus = "SUBMITTED" | "CONFIRMED";

export interface BallotRecord {
  id: string;
  electionId: string;
  memberId: string;
  votedAt: string; // ISO date string
  status: BallotStatus;
  receiptHash: string; // mock tamper-evident receipt, not the vote itself
}