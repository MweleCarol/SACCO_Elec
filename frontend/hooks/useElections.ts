"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import * as electionsService from "@/services/elections.service";
import * as votingService from "@/services/voting.service";
import type { Election } from "@/types/api";

// Query keys in one place, so screens refresh together after a vote.
export const queryKeys = {
  elections: ["elections"] as const,
  election: (id: string) => ["elections", id] as const,
  participation: (electionId: string) => ["participation", electionId] as const,
  ballot: (electionId: string) => ["ballot", electionId] as const,
};

export function useElectionList() {
  return useQuery({
    queryKey: queryKeys.elections,
    queryFn: () => electionsService.listElections(),
    select: (data) => data.elections,
  });
}

export function useElection(id: string) {
  return useQuery({ queryKey: queryKeys.election(id), queryFn: () => electionsService.getElection(id) });
}

export function useParticipation(electionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.participation(electionId),
    queryFn: () => votingService.getParticipation(electionId),
    enabled,
  });
}

// "Have I voted?" for several elections at once, keyed by election id.
// (Only ACTIVE elections need asking on the dashboard; the activity page asks
// for every election the member could have voted in.)
export function useParticipationFor(elections: Election[]) {
  const results = useQueries({
    queries: elections.map((e) => ({
      queryKey: queryKeys.participation(e.id),
      queryFn: () => votingService.getParticipation(e.id),
    })),
  });
  const byElection = new Map<string, { hasVoted: boolean; votedAt: string | null }>();
  results.forEach((r, i) => {
    if (r.data) byElection.set(elections[i].id, r.data);
  });
  return { byElection, isLoading: results.some((r) => r.isLoading) };
}