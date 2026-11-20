import { api } from "@/services/api/axios";
import type { ApiSuccess, Ballot, BallotSelection, Participation } from "@/types/api";

// Members only (API_CONTRACT.md section 5, "Voting").

export async function getBallot(electionId: string): Promise<Ballot> {
  const res = await api.get<ApiSuccess<Ballot>>(`/elections/${electionId}/ballot`);
  return res.data.data;
}

export async function getParticipation(electionId: string): Promise<Participation> {
  const res = await api.get<ApiSuccess<Participation>>(`/elections/${electionId}/participation/me`);
  return res.data.data;
}

export async function castVote(electionId: string, selections: BallotSelection[]): Promise<{ votedAt: string }> {
  const res = await api.post<ApiSuccess<{ votedAt: string }>>(`/elections/${electionId}/ballot`, { selections });
  return res.data.data;
}