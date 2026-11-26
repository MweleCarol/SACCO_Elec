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
        byElection.set(r.electionId, [
          ...(byElection.get(r.electionId) ?? []),
          r,
        ]);
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
    mutationFn: async (
      input: electionsService.NewElectionInput & {
        positions: { name: string; description?: string }[];
      },
    ) => {
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.elections }),
  });
}

// Every change on the election page refreshes the same data, so the page,
// the list and the member views never disagree.
function useRefreshElection(electionId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.election(electionId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.elections }),
      queryClient.invalidateQueries({ queryKey: ["positions", electionId] }),
      queryClient.invalidateQueries({ queryKey: ["candidates", electionId] }),
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] }),
    ]);
}

export function useElectionActions(electionId: string) {
  const refresh = useRefreshElection(electionId);
  const opts = { onSuccess: refresh };
  return {
    addPosition: useMutation({
      mutationFn: (input: {
        name: string;
        description?: string;
        order: number;
      }) => electionsService.createPosition(electionId, input),
      ...opts,
    }),
    deletePosition: useMutation({
      mutationFn: electionsService.deletePosition,
      ...opts,
    }),

    decideCandidate: useMutation({
      mutationFn: (v: {
        candidateId: string;
        decision: "APPROVE" | "REJECT";
        comment?: string;
      }) =>
        electionsService.decideCandidate(v.candidateId, v.decision, v.comment),
      ...opts,
    }),
    submitForReview: useMutation({
      mutationFn: () => electionsService.submitForReview(electionId),
      ...opts,
    }),
    updateDetails: useMutation({
      mutationFn: (
        input: Parameters<typeof electionsService.updateElection>[1],
      ) => electionsService.updateElection(electionId, input),
      ...opts,
    }),
    requestActivation: useMutation({
      mutationFn: () => electionsService.requestActivation(electionId),
      ...opts,
    }),
    decideRequest: useMutation({
      mutationFn: (v: {
        requestId: string;
        decision: "APPROVE" | "REJECT";
        comment?: string;
      }) =>
        approvalsService.decideApprovalRequest(
          v.requestId,
          v.decision,
          v.comment,
        ),
      ...opts,
    }),
    review: useMutation({
      mutationFn: (v: { decision: "APPROVE" | "REJECT"; comment?: string }) =>
        electionsService.reviewElection(electionId, v.decision, v.comment),
      ...opts,
    }),
  };
}
