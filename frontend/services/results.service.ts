import { api } from "@/services/api/axios";
import type { ApiSuccess, Result, Turnout } from "@/types/api";

// Members can read these only once results are published (403 before that).

export async function getResults(electionId: string): Promise<Result[]> {
  const res = await api.get<ApiSuccess<Result[]>>(`/elections/${electionId}/results`);
  return res.data.data;
}

export async function getTurnout(electionId: string): Promise<Turnout> {
  const res = await api.get<ApiSuccess<Turnout>>(`/elections/${electionId}/turnout`);
  return res.data.data;
}