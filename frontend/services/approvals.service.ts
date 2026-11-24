import { api } from "@/services/api/axios";
import type { ApiSuccess, ApprovalRequest, ApprovalStatus } from "@/types/api";

// Distributed Administration Trust requests (API_CONTRACT.md, "Approval requests").
// Officers, administrators and auditors only.

export async function listApprovalRequests(params: { status?: ApprovalStatus; page?: number; pageSize?: number } = {}) {
  const res = await api.get<ApiSuccess<{ requests: ApprovalRequest[]; pagination: { totalCount: number } }>>(
    "/approval-requests",
    { params: { pageSize: 100, ...params } }
  );
  return res.data.data;
}