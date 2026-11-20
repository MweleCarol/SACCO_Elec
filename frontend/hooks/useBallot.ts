"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as votingService from "@/services/voting.service";
import { queryKeys } from "@/hooks/useElections";
import type { BallotSelection } from "@/types/api";

export function useBallot(electionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ballot(electionId),
    queryFn: () => votingService.getBallot(electionId),
    enabled,
    staleTime: Infinity, // the ballot cannot change once voting has started
  });
}

export function useCastVote(electionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (selections: BallotSelection[]) => votingService.castVote(electionId, selections),
    onSuccess: (data) => {
      // Every screen now shows "You voted" without reloading.
      queryClient.setQueryData(queryKeys.participation(electionId), { hasVoted: true, votedAt: data.votedAt });
      queryClient.removeQueries({ queryKey: queryKeys.ballot(electionId) });
    },
  });
}