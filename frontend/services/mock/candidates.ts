import type { CandidateStatus, Candidate } from "../../types/candidate";

export const mockCandidates: Candidate[] = [
  {
    id: "CAND-021",
    electionId: "el-2026-general",
    positionId: "pos-chair",
    membershipNumber: "SCCO-00456",
    name: "Grace Wanjiru",
    bio: "Board member for 4 years, focused on digital transformation and member services.",
    photoUrl: "/mock/avatars/candidate-021.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-10T09:00:00Z",
    votesReceivedDevOnly: 312,
  },
  {
    id: "CAND-022",
    electionId: "el-2026-general",
    positionId: "pos-chair",
    membershipNumber: "SCCO-00892",
    name: "Peter Otieno",
    bio: "Finance professional advocating for expanded loan products and lower interest margins.",
    photoUrl: "/mock/avatars/candidate-022.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-10T10:15:00Z",
    votesReceivedDevOnly: 287,
  },
  {
    id: "CAND-023",
    electionId: "el-2026-general",
    positionId: "pos-chair",
    membershipNumber: "SCCO-01120",
    name: "Mercy Achieng",
    bio: "First-time candidate championing youth membership growth and mobile-first services.",
    photoUrl: "/mock/avatars/candidate-023.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-11T08:30:00Z",
    votesReceivedDevOnly: 150,
  },
  {
    id: "CAND-024",
    electionId: "el-2026-general",
    positionId: "pos-treasurer",
    membershipNumber: "SCCO-00231",
    name: "Daniel Kiprop",
    bio: "Certified accountant, previously served two terms as Assistant Treasurer.",
    photoUrl: "/mock/avatars/candidate-024.jpg",
    status: "PENDING", // matches "Candidate submitted — Candidate #024" in Recent Activity
    submittedAt: "2026-08-28T10:28:00Z",
    votesReceivedDevOnly: 0,
  },
  {
    id: "CAND-025",
    electionId: "el-2026-general",
    positionId: "pos-secretary",
    membershipNumber: "SCCO-00678",
    name: "Susan Njeri",
    bio: "Long-serving secretary of the SACCO's Nairobi branch chapter.",
    photoUrl: "/mock/avatars/candidate-025.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-09T14:00:00Z",
    votesReceivedDevOnly: 401,
  },
  {
    id: "CAND-026",
    electionId: "el-2026-branch-delegate",
    positionId: "pos-delegate-nairobi",
    membershipNumber: "SCCO-01345",
    name: "James Mwangi",
    bio: "Regional coordinator advocating for faster branch dispute resolution.",
    photoUrl: "/mock/avatars/candidate-026.jpg",
    status: "APPROVED",
    submittedAt: "2026-08-05T11:00:00Z",
    votesReceivedDevOnly: 61,
  },
  {
  id: "cand-agm-001",
  electionId: "el-2025-agm",
  positionId: "pos-agm-chair",
  membershipNumber: "SCCO-00231",
  name: "James Kariuki",
  bio: "Long-serving SACCO board member with a focus on transparent governance.",
  photoUrl: "/mock/avatars/placeholder.jpg",
  status: "APPROVED",
  submittedAt: "2025-10-01T09:00:00Z",
  votesReceivedDevOnly: 480,
},
{
  id: "cand-agm-002",
  electionId: "el-2025-agm",
  positionId: "pos-agm-chair",
  membershipNumber: "SCCO-00347",
  name: "Esther Wambui",
  bio: "Branch delegate advocating for digital services expansion.",
  photoUrl: "/mock/avatars/placeholder.jpg",
  status: "APPROVED",
  submittedAt: "2025-10-01T09:15:00Z",
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