"use client";

import { useSearchParams } from "next/navigation";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { ResultsCard } from "@/components/voter/ResultsCard";
import { mockResults } from "@/services/mock/results";
import { mockElections } from "@/services/mock/elections";

// This shows the results for all elections, or a specific election if the `election` query param is present. 
// This is a mock implementation and will be replaced with real data fetching in the future.
export default function ResultsPage() {
  const { member, isLoading } = useCurrentMember();
  const searchParams = useSearchParams();
  const focusedElectionId = searchParams.get("election");

  if (isLoading) return null;

  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">
            Log in
          </a>{" "}
          to view results.
        </p>
      </div>
    );
  }

  const resultsToShow = focusedElectionId
    ? mockResults.filter((r) => r.electionId === focusedElectionId)
    : mockResults;

  return (
    <>
      <Topbar title="Results" subtitle="Published outcomes for closed elections" />

      <div className="space-y-10 p-8">
        {resultsToShow.length === 0 && (
          <p className="text-sm text-[var(--sevs-text-muted)]">
            No published results yet. Results appear here once an election closes and its outcome
            is officially published.
          </p>
        )}

        {resultsToShow.map((result) => {
          const election = mockElections.find((e) => e.id === result.electionId);
          return (
            <div key={result.electionId}>
              <h2 className="mb-1 text-lg font-bold text-[var(--sevs-navy)]">
                {election?.title ?? "Unknown election"}
              </h2>
              <p className="mb-4 text-sm text-[var(--sevs-text-muted)]">
                Published{" "}
                {new Date(result.publishedAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <div className="space-y-4">
                {result.positions.map((position) => (
                  <ResultsCard key={position.positionId} result={position} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}