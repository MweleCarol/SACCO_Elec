"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as approvalsService from "@/services/approvals.service";
import * as electionsService from "@/services/elections.service";
import { queryKeys } from "@/hooks/useElections";
import type { ApprovalRequest } from "@/types/api";

// Pending approval requests, keyed by election, so lists and pages can say
// "Activation: 1 of 2 approvals". One request covers every election.
export function usePendingApprovals(enabled = true) {
  return useQuery({
    queryKey: ["approval-requests", "PENDING"],
    queryFn: () => approvalsService.listApprovalRequests({ status: "PENDING" }),
    select: (data) => {
      const byElection = new Map<string, ApprovalRequest[]>();
      for (const r of data.requests) {
        if (!r.electionId) continue;
        byElection.set(r.electionId, [...(byElection.get(r.electionId) ?? []), r]);
      }
      return byElection;
    },
    enabled,
  });
}

// Creates the election, then its positions in order. If a position fails,
// the election already exists, so the caller is told which positions were
// not saved and can add them on the election's page.
export function useCreateElection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: electionsService.NewElectionInput & { positions: { name: string; description?: string }[] }) => {
      const { positions, ...electionInput } = input;
      const election = await electionsService.createElection(electionInput);
      const failedPositions: string[] = [];
      for (const [order, p] of positions.entries()) {
        try {
          await electionsService.createPosition(election.id, { ...p, order });
        } catch {
          failedPositions.push(p.name);
        }
      }
      return { election, failedPositions };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.elections }),
  });
}