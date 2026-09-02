import { CANDIDATE_CHECKLIST, type CandidateReview, type CheckVerdict } from "@/types/candidate-review";

function emptyVerdicts(): Record<string, CheckVerdict> {
  return Object.fromEntries(CANDIDATE_CHECKLIST.map((c) => [c.key, "NOT_REVIEWED" as CheckVerdict]));
}

export const mockCandidateReviews: CandidateReview[] = [
  // cand-024 illustrates a real gap: everything checks out except documents.
  {
    candidateId: "cand-024",
    verdicts: {
      ...emptyVerdicts(),
      eligibility: "PASS",
      membership_number: "PASS",
      identity: "PASS",
      duration: "PASS",
      good_standing: "PASS",
      position_eligibility: "PASS",
      qualifications: "PASS",
      documents: "FAIL",
      duplicate_candidacy: "PASS",
      nomination_validity: "PASS",
      disqualification: "PASS",
      verification_status: "NOT_REVIEWED",
    },
  },
];

export function getOrCreateReview(candidateId: string): CandidateReview {
  let review = mockCandidateReviews.find((r) => r.candidateId === candidateId);
  if (!review) {
    review = { candidateId, verdicts: emptyVerdicts() };
    mockCandidateReviews.push(review);
  }
  return review;
}

export function setVerdict(candidateId: string, checkKey: string, verdict: CheckVerdict): void {
  const review = getOrCreateReview(candidateId);
  review.verdicts[checkKey] = verdict;
}

export function setRejectionReason(candidateId: string, reason: string): void {
  getOrCreateReview(candidateId).rejectionReason = reason;
}

export function isReviewComplete(candidateId: string): boolean {
  const review = getOrCreateReview(candidateId);
  return CANDIDATE_CHECKLIST.every((c) => review.verdicts[c.key] !== "NOT_REVIEWED");
}

export function hasAnyFailure(candidateId: string): boolean {
  const review = getOrCreateReview(candidateId);
  return CANDIDATE_CHECKLIST.some((c) => review.verdicts[c.key] === "FAIL");
}