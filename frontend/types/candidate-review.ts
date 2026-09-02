export type CheckVerdict = "PASS" | "FAIL" | "NOT_REVIEWED";

export interface ChecklistItem {
  key: string;
  label: string;
  helpText: string;
}

export interface CandidateReview {
  candidateId: string;
  verdicts: Record<string, CheckVerdict>;
  rejectionReason?: string;
}

export const CANDIDATE_CHECKLIST: ChecklistItem[] = [
  { key: "eligibility", label: "Member eligibility", helpText: "Registered SACCO member with an active membership." },
  { key: "membership_number", label: "Membership number", helpText: "Exists and matches SACCO membership records." },
  { key: "identity", label: "Identity details", helpText: "Name and ID details match the registered member record." },
  { key: "duration", label: "Membership duration", helpText: "Meets the minimum membership period required by bylaws/election rules." },
  { key: "good_standing", label: "Good standing", helpText: "No outstanding financial or disciplinary obligations." },
  { key: "position_eligibility", label: "Position eligibility", helpText: "Meets requirements for the specific position contested." },
  { key: "qualifications", label: "Qualifications", helpText: "Required academic/professional/leadership qualifications provided and valid." },
  { key: "documents", label: "Required documents", helpText: "All supporting documents submitted and readable/valid." },
  { key: "duplicate_candidacy", label: "Duplicate candidacy", helpText: "Not registered for incompatible or multiple prohibited positions." },
  { key: "nomination_validity", label: "Nomination validity", helpText: "Submitted within the election period, following prescribed procedure." },
  { key: "disqualification", label: "Conflict/disqualification", helpText: "No recorded condition that disqualifies the candidate." },
  { key: "verification_status", label: "Verification status", helpText: "Required verification by the appropriate officer/process completed." },
];