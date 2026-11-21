"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import * as resultsService from "@/services/results.service";

export function useResults(electionId: string, enabled = true) {
  return useQuery({
    queryKey: ["results", electionId],
    queryFn: () => resultsService.getResults(electionId),
    enabled,
    staleTime: 5 * 60_000, // published results do not change
  });
}

export function useTurnout(electionId: string, enabled = true) {
  return useQuery({
    queryKey: ["turnout", electionId],
    queryFn: () => resultsService.getTurnout(electionId),
    enabled,
    staleTime: 5 * 60_000,
  });
}

// Results for several elections at once (winners on the results list).
export function useResultsFor(electionIds: string[]) {
  const results = useQueries({
    queries: electionIds.map((id) => ({
      queryKey: ["results", id],
      queryFn: () => resultsService.getResults(id),
      staleTime: 5 * 60_000,
    })),
  });
  const byElection = new Map(
    electionIds.map((id, i) => [id, results[i]?.data]),
  );
  return { byElection };
}
