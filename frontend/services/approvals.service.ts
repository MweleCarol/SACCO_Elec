import { api } from "@/services/api/axios";
import type { ApiSuccess, ApprovalRequest, ApprovalRequestList, ApprovalStatus } from "@/types/api";

// Distributed Administration Trust requests (API_CONTRACT.md, "Approval requests").
// Officers, administrators and auditors only.

export async function listApprovalRequests(
  params: { status?: ApprovalStatus; open?: boolean; page?: number; pageSize?: number } = {}
): Promise<ApprovalRequestList> {
  const res = await api.get<ApiSuccess<ApprovalRequestList>>("/approval-requests", {
    params: {
      status: params.status,
      open: params.open === undefined ? undefined : String(params.open),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 100,
    },
  });
  return res.data.data;
}

// A rejection needs a comment of at least 10 characters (the requester sees it).
export async function decideApprovalRequest(
  requestId: string,
  decision: "APPROVE" | "REJECT",
  comment?: string
): Promise<ApprovalRequest> {
  const res = await api.post<ApiSuccess<ApprovalRequest>>(`/approval-requests/${requestId}/decide`, { decision, comment });
  return res.data.data;
}