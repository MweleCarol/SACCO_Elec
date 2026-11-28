"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as approvalsService from "@/services/approvals.service";

const KEY = ["approval-requests"] as const;

// Every request still waiting, the one expiring soonest first.
export function useOpenApprovals() {
  return useQuery({
    queryKey: [...KEY, "open"],
    queryFn: () => approvalsService.listApprovalRequests({ open: true, pageSize: 100 }),
    select: (d) => d.requests,
  });
}

// Decided and expired requests, newest first, 10 at a time.
export function useApprovalHistory() {
  return useInfiniteQuery({
    queryKey: [...KEY, "history"],
    queryFn: ({ pageParam }) => approvalsService.listApprovalRequests({ open: false, page: pageParam, pageSize: 10 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
  });
}

// Approving can change an election (open voting, new dates, cancel), so the
// election data is refreshed as well as every approvals list.
export function useDecideApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { requestId: string; decision: "APPROVE" | "REJECT"; comment?: string }) =>
      approvalsService.decideApprovalRequest(v.requestId, v.decision, v.comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}