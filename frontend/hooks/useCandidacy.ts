"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as candidacyService from "@/services/candidacy.service";
import * as electionsService from "@/services/elections.service";

const MINE = ["candidacies", "mine"] as const;

export function useMyCandidacies(enabled = true) {
  return useQuery({
    queryKey: MINE,
    queryFn: candidacyService.listMyCandidacies,
    enabled,
  });
}

export function usePositions(electionId: string, enabled = true) {
  return useQuery({
    queryKey: ["positions", electionId],
    queryFn: () => electionsService.listPositions(electionId),
    enabled,
  });
}

export function useCandidates(electionId: string, enabled = true) {
  return useQuery({
    queryKey: ["candidates", electionId],
    queryFn: () => electionsService.listCandidates(electionId),
    enabled,
  });
}

export function useNominateSelf(electionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { positionId: string; manifesto: string }) =>
      candidacyService.nominateSelf(electionId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MINE }),
  });
}

export function useWithdrawCandidacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: candidacyService.withdrawCandidacy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MINE });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
