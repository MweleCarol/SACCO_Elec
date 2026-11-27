"use client";

import { useInfiniteQuery, useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import * as ai from "@/services/ai.service";
import type { RiskLevel } from "@/types/api";

const KEY = ["insights"] as const;
const PAGE_SIZE = 10;

// Open (unreviewed) insights per risk level, for the summary tiles.
export function useOpenInsightCounts() {
  const levels: RiskLevel[] = ["HIGH", "MEDIUM", "LOW"];
  const results = useQueries({
    queries: levels.map((riskLevel) => ({
      queryKey: [...KEY, "count", riskLevel],
      queryFn: () => ai.listInsights({ riskLevel, acknowledged: false, pageSize: 1 }),
    })),
  });
  const counts = Object.fromEntries(levels.map((l, i) => [l, results[i]?.data?.pagination.totalCount])) as Record<
    RiskLevel,
    number | undefined
  >;
  return { counts, isLoading: results.some((r) => r.isLoading) };
}

// One list, newest first, loaded 10 at a time.
export function useInsights(acknowledged: boolean | undefined) {
  return useInfiniteQuery({
    queryKey: [...KEY, "list", acknowledged ?? "all"],
    queryFn: ({ pageParam }) => ai.listInsights({ acknowledged, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
  });
}

export function useInsightActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  return {
    acknowledge: useMutation({ mutationFn: ai.acknowledgeInsight, onSuccess: refresh }),
    scan: useMutation({ mutationFn: ai.runInsightScan, onSuccess: refresh }),
  };
}