import { api } from "@/services/api/axios";
import type { ApiSuccess, Candidate, CandidateStatus, Election, ElectionList, ElectionStatus, Position } from "@/types/api";

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