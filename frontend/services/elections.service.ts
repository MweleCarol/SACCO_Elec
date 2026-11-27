import { api } from "@/services/api/axios";
import type { ApiSuccess, ApprovalRequest, Candidate, CandidateStatus, Election, ElectionList, ElectionStatus, Position } from "@/types/api";

// Elections, positions and candidates (API_CONTRACT.md section 5).
// Members automatically get only what they may see; the backend filters.

export async function listElections(params: { status?: ElectionStatus; page?: number; pageSize?: number } = {}) {
  const res = await api.get<ApiSuccess<ElectionList>>("/elections", { params: { pageSize: 100, ...params } });
  return res.data.data;
}

export async function getElection(id: string): Promise<Election> {
  const res = await api.get<ApiSuccess<Election>>(`/elections/${id}`);
  return res.data.data;
}

export async function listPositions(electionId: string): Promise<Position[]> {
  const res = await api.get<ApiSuccess<Position[]>>(`/elections/${electionId}/positions`);
  return res.data.data;
}

export async function listCandidates(
  electionId: string,
  params: { status?: CandidateStatus; positionId?: string } = {}
): Promise<Candidate[]> {
  const res = await api.get<ApiSuccess<Candidate[]>>(`/elections/${electionId}/candidates`, { params });
  return res.data.data;
}

// ---------- Officer actions ----------

export interface NewElectionInput {
  name: string;
  description?: string;
  startDate: string; // ISO
  endDate: string; // ISO
  requiredApprovals: number;
}

export async function createElection(input: NewElectionInput): Promise<Election> {
  const res = await api.post<ApiSuccess<Election>>("/elections", input);
  return res.data.data;
}

export async function createPosition(
  electionId: string,
  input: { name: string; description?: string; order: number }
): Promise<Position> {
  const res = await api.post<ApiSuccess<Position>>(`/elections/${electionId}/positions`, input);
  return res.data.data;
}


export async function deletePosition(positionId: string): Promise<void> {
  await api.delete(`/positions/${positionId}`);
}



// Both routes go to the same handler; the body's decision decides the outcome.
export async function decideCandidate(
  candidateId: string,
  decision: "APPROVE" | "REJECT",
  comment?: string
): Promise<Candidate> {
  const path = decision === "APPROVE" ? "approve" : "reject";
  const res = await api.post<ApiSuccess<Candidate>>(`/candidates/${candidateId}/${path}`, { decision, comment });
  return res.data.data;
}

export async function submitForReview(electionId: string): Promise<Election> {
  const res = await api.post<ApiSuccess<Election>>(`/elections/${electionId}/submit-approval`, {});
  return res.data.data;
}

export async function reviewElection(electionId: string, decision: "APPROVE" | "REJECT", comment?: string): Promise<Election> {
  const res = await api.post<ApiSuccess<Election>>(`/elections/${electionId}/review-approval`, { decision, comment });
  return res.data.data;
}


export async function updateElection(
  electionId: string,
  input: Partial<{ name: string; description: string; startDate: string; endDate: string; requiredApprovals: number }>
): Promise<Election> {
  const res = await api.patch<ApiSuccess<Election>>(`/elections/${electionId}`, input);
  return res.data.data;
}

// Creates (or returns the existing) approval request; the election only opens
// once enough other officers or administrators approve it.
export async function requestActivation(electionId: string): Promise<ApprovalRequest> {
  const res = await api.post<ApiSuccess<ApprovalRequest>>(`/elections/${electionId}/activate`, {});
  return res.data.data;
}

// Asks for new voting dates. Needs approval from other officers or
// administrators; members are told the new dates once it is approved.
export async function requestReschedule(electionId: string, dates: { startDate: string; endDate: string }): Promise<ApprovalRequest> {
  const res = await api.post<ApiSuccess<ApprovalRequest>>(`/elections/${electionId}/reschedule`, dates);
  return res.data.data;
}

// Administrators only. Needs approval; members see the reason.
export async function requestCancellation(electionId: string, reason: string): Promise<ApprovalRequest> {
  const res = await api.post<ApiSuccess<ApprovalRequest>>(`/elections/${electionId}/cancel`, { reason });
  return res.data.data;
}

// Officers: a reason of at least 10 characters is required; the member sees it.
export async function withdrawCandidate(candidateId: string, reason: string): Promise<Candidate> {
  const res = await api.post<ApiSuccess<Candidate>>(`/candidates/${candidateId}/withdraw`, { reason });
  return res.data.data;
}