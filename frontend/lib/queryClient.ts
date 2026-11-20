import { QueryClient } from "@tanstack/react-query";
import { getApiStatus } from "@/services/api/errors";

// Shared settings for every API read in the app.
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // reuse data for 30 s before refetching in the background
        refetchOnWindowFocus: true, // a member returning to the tab sees fresh status
        // A 4xx (already voted, not allowed, not found) will give the same answer
        // again, so show it at once. Retry network/server errors once.
        retry: (failureCount, error) => {
          const status = getApiStatus(error);
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 1;
        },
      },
      mutations: { retry: false }, // never repeat a vote or any other write automatically
    },
  });
}