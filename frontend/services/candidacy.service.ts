import { api } from "@/services/api/axios";
import type { ApiSuccess, Candidate, MyCandidacy } from "@/types/api";

// A member standing for election (API_CONTRACT.md, "Self-nomination").

export async function listMyCandidacies(): Promise<MyCandidacy[]> {
  const res = await api.get<ApiSuccess<MyCandidacy[]>>("/candidates/mine");
  return res.data.data;
}

export async function nominateSelf(
  electionId: string,
  input: { positionId: string; manifesto: string },
): Promise<Candidate> {
  const res = await api.post<ApiSuccess<Candidate>>(
    `/elections/${electionId}/nominations`,
    input,
  );
  return res.data.data;
}

export async function withdrawCandidacy(
  candidateId: string,
): Promise<Candidate> {
  const res = await api.post<ApiSuccess<Candidate>>(
    `/candidates/${candidateId}/withdraw`,
    {},
  );
  return res.data.data;
}
