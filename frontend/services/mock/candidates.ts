// services/mock/candidates.ts
import type { CandidateStatus, Candidate } from "../../types/candidate";

export const mockCandidates: Candidate[] = [
  {
    id: "CAND-021",
    electionId: "el-2026-general",
    positionId: "pos-chair",
    applicantMemberId: "usr-member-grace-w", // TODO: confirm against real member.ts id
    membershipNumber: "SCCO-00456",
    name: "Grace Wanjiru",
    bio: "Board member for 4 years, focused on digital transformation and member services.",
    photoUrl: "/mock/avatars/candidate-021.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-10T09:00:00Z",
    eligibilityConfirmed: true,
    declarationConfirmed: true,
    votesReceivedDevOnly: 312,
  },
  {
    id: "CAND-022",
    electionId: "el-2026-general",
    positionId: "pos-chair",
    applicantMemberId: "usr-member-peter-o",
    membershipNumber: "SCCO-00892",
    name: "Peter Otieno",
    bio: "Finance professional advocating for expanded loan products and lower interest margins.",
    photoUrl: "/mock/avatars/candidate-022.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-10T10:15:00Z",
    eligibilityConfirmed: true,
    declarationConfirmed: true,
    votesReceivedDevOnly: 287,
  },
  {
    id: "CAND-023",
    electionId: "el-2026-general",
    positionId: "pos-chair",
    applicantMemberId: "usr-member-mercy-a",
    membershipNumber: "SCCO-01120",
    name: "Mercy Achieng",
    bio: "First-time candidate championing youth membership growth and mobile-first services.",
    photoUrl: "/mock/avatars/candidate-023.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-11T08:30:00Z",
    eligibilityConfirmed: true,
    declarationConfirmed: true,
    votesReceivedDevOnly: 150,
  },
  {
    id: "CAND-024",
    electionId: "el-2026-general",
    positionId: "pos-treasurer",
    applicantMemberId: "usr-member-daniel-k",
    membershipNumber: "SCCO-00231",
    name: "Daniel Kiprop",
    bio: "Certified accountant, previously served two terms as Assistant Treasurer.",
    photoUrl: "/mock/avatars/candidate-024.jpg",
    status: "PENDING", // matches "Candidate submitted — Candidate #024" in Recent Activity
    submittedAt: "2026-08-28T10:28:00Z",
    eligibilityConfirmed: true,
    declarationConfirmed: true,
    votesReceivedDevOnly: 0,
  },
  {
    id: "CAND-025",
    electionId: "el-2026-general",
    positionId: "pos-secretary",
    applicantMemberId: "usr-member-susan-n",
    membershipNumber: "SCCO-00678",
    name: "Susan Njeri",
    bio: "Long-serving secretary of the SACCO's Nairobi branch chapter.",
    photoUrl: "/mock/avatars/candidate-025.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-09T14:00:00Z",
    eligibilityConfirmed: true,
    declarationConfirmed: true,
    votesReceivedDevOnly: 401,
  },
  {
    id: "CAND-026",
    electionId: "el-2026-branch-delegate",
    positionId: "pos-delegate-nairobi",
    applicantMemberId: "usr-member-james-m",
    membershipNumber: "SCCO-01345",
    name: "James Mwangi",
    bio: "Regional coordinator advocating for faster branch dispute resolution.",
    photoUrl: "/mock/avatars/candidate-026.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-05T11:00:00Z",
    eligibilityConfirmed: true,
    declarationConfirmed: true,
    votesReceivedDevOnly: 61,
  },
  {
    id: "cand-agm-001",
    electionId: "el-2025-agm",
    positionId: "pos-agm-chair",
    applicantMemberId: "usr-member-james-k",
    membershipNumber: "SCCO-00231",
    name: "James Kariuki",
    bio: "Long-serving SACCO board member with a focus on transparent governance.",
    photoUrl: "/mock/avatars/placeholder.jpg",
    status: "APPROVED",
    submittedAt: "2025-10-01T09:00:00Z",
    eligibilityConfirmed: true,
    declarationConfirmed: true,
    votesReceivedDevOnly: 480,
  },
  {
    id: "cand-agm-002",
    electionId: "el-2025-agm",
    positionId: "pos-agm-chair",
    applicantMemberId: "usr-member-esther-w",
    membershipNumber: "SCCO-00347",
    name: "Esther Wambui",
    bio: "Branch delegate advocating for digital services expansion.",
    photoUrl: "/mock/avatars/placeholder.jpg",
    status: "APPROVED",
    submittedAt: "2025-10-01T09:15:00Z",
    eligibilityConfirmed: true,
    declarationConfirmed: true,
    votesReceivedDevOnly: 332,
  },
];

// Mock service functions to retrieve candidates based on election or position
export function getCandidatesByElection(electionId: string): Candidate[] {
  return mockCandidates.filter((c) => c.electionId === electionId);
}

export function getCandidatesByPosition(positionId: string): Candidate[] {
  return mockCandidates.filter((c) => c.positionId === positionId && c.status === "APPROVED");
}

export function getPendingCandidateApprovals(): Candidate[] {
  return mockCandidates.filter((c) => c.status === "PENDING");
}

export function getApprovedCandidatesByElection(electionId: string): Candidate[] {
  return mockCandidates.filter((c) => c.electionId === electionId && c.status === "APPROVED");
}

/**
 * @deprecated Superseded by the DAT-corrected flow: officer review now calls
 * requestApprovalWithOfficerPreApproved (services/mock/approvals.ts) on pass,
 * and rejectCandidate() below on fail. Kept only in case something still
 * imports it directly — check before removing.
 */
export function decideCandidateApproval(id: string, decision: "APPROVED" | "REJECTED"): void {
  const candidate = mockCandidates.find((c) => c.id === id);
  if (candidate) candidate.status = decision;
}

/** Applies a fully-DAT-approved candidate decision — called from approvals.ts's effect-runner once DAT reaches 2/2. */
export function applyCandidateApproval(candidateId: string): void {
  const candidate = mockCandidates.find((c) => c.id === candidateId);
  if (candidate) candidate.status = "APPROVED";
}

/** Rejection at the officer's review stage is final and immediate — no DAT co-approval needed to reject. */
export function rejectCandidate(candidateId: string): void {
  const candidate = mockCandidates.find((c) => c.id === candidateId);
  if (candidate) candidate.status = "REJECTED";
}

export type CandidateDisplayStatus = "Pending Review" | "Awaiting Approval" | "Approved" | "Rejected";

/**
 * Derives the table-friendly status:
 * PENDING + no approval record  → "Pending Review"
 * PENDING + open DAT request    → "Awaiting Approval"
 * APPROVED                      → "Approved"
 * REJECTED                      → "Rejected"
 */
export function getCandidateDisplayStatus(candidateId: string, hasOpenApproval: boolean): CandidateDisplayStatus {
  const candidate = mockCandidates.find((c) => c.id === candidateId);
  if (!candidate) return "Pending Review";
  if (candidate.status === "APPROVED") return "Approved";
  if (candidate.status === "REJECTED") return "Rejected";
  return hasOpenApproval ? "Awaiting Approval" : "Pending Review";
}

/**
 * Member-facing application submission. Only ever creates a PENDING
 * candidate entering the officer's review queue — never triggers a DAT
 * request directly. The officer's 12-point checklist review is what later
 * creates the DAT request via requestApprovalWithOfficerPreApproved.
 */
export function submitCandidateApplication(input: {
  memberId: string;
  memberName: string;
  membershipNumber: string;
  electionId: string;
  positionId: string;
  bio: string;
  eligibilityConfirmed: boolean;
  declarationConfirmed: boolean;
  documentUrl?: string;
}): Candidate {
  const candidate: Candidate = {
    id: `cand-${Date.now()}`,
    electionId: input.electionId,
    positionId: input.positionId,
    applicantMemberId: input.memberId,
    membershipNumber: input.membershipNumber,
    name: input.memberName,
    bio: input.bio,
    photoUrl: "/mock/avatars/placeholder.jpg",
    status: "PENDING",
    submittedAt: new Date().toISOString(),
    eligibilityConfirmed: input.eligibilityConfirmed,
    declarationConfirmed: input.declarationConfirmed,
    documentUrl: input.documentUrl,
    votesReceivedDevOnly: 0,
  };
  mockCandidates.push(candidate);
  return candidate;
}

export function getApplicationsByMember(memberId: string): Candidate[] {
  return mockCandidates.filter((c) => c.applicantMemberId === memberId);
}

export function hasAppliedForElection(memberId: string, electionId: string): boolean {
  return mockCandidates.some((c) => c.applicantMemberId === memberId && c.electionId === electionId);
}