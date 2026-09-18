"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockResults } from "@/services/mock/results";
import { mockElections } from "@/services/mock/elections";

function ResultsPageInner() {
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

      <div className="space-y-4 p-4 sm:p-8">
        {resultsToShow.length === 0 && (
          <p className="text-sm text-[var(--sevs-text-muted)]">
            No published results yet. Results appear here once an election closes and its outcome
            is officially published.
          </p>
        )}

        {resultsToShow.map((result) => {
          const election = mockElections.find((e) => e.id === result.electionId);
          const winners = result.positions
            .map((p) => p.candidates.find((c) => c.isWinner)?.candidateName)
            .filter(Boolean);

          return (
            <Link
              key={result.electionId}
              href={`/results/${result.electionId}`}
              className="block rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm hover:bg-[var(--sevs-bg)] sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-[var(--sevs-navy)]">
                  {election?.title ?? "Unknown election"}
                </h2>
                <StatusBadge status="Published" />
              </div>
              <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">
                Published{" "}
                {new Date(result.publishedAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              {winners.length > 0 && (
                <p className="mt-3 text-sm text-[var(--sevs-text-body)]">
                  <span className="font-semibold text-[var(--sevs-navy)]">Winners:</span> {winners.join(", ")}
                </p>
              )}
              <p className="mt-3 text-sm font-bold text-[var(--sevs-navy)]">View full results →</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsPageInner />
    </Suspense>
  );
}