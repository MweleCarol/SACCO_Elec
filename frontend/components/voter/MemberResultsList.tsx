"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { useElectionList } from "@/hooks/useElections";
import { useResultsFor } from "@/hooks/useResults";
import { formatDateTime, memberPhase } from "@/lib/electionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { EmptyState, ErrorPanel, LoadingCards } from "@/components/ui/LoadState";

// Every election whose results have been published, newest first, with the
// winners so members can see the outcome at a glance.
export function MemberResultsList() {
  const elections = useElectionList();
  const published = (elections.data ?? [])
    .filter((e) => memberPhase(e) === "RESULTS")
    .sort((a, b) => new Date(b.resultsPublishedAt!).getTime() - new Date(a.resultsPublishedAt!).getTime());
  const { byElection } = useResultsFor(published.map((e) => e.id));

  return (
    <>
      <Topbar title="Results" subtitle="Official results of SACCO elections" />
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8">
        {elections.isLoading && <LoadingCards count={2} label="Loading results…" />}
        {elections.isError && <ErrorPanel message={getApiErrorMessage(elections.error)} onRetry={() => elections.refetch()} />}
        {elections.isSuccess && published.length === 0 && (
          <EmptyState title="No results have been published yet">
            Results appear here once voting has closed and the results have been approved and published.
          </EmptyState>
        )}

        <ul className="space-y-4">
          {published.map((e) => {
            const winners = (byElection.get(e.id) ?? []).filter((r) => r.isWinner);
            return (
              <li key={e.id}>
                <article className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)] text-white">
                      <Trophy className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-lg font-bold text-[var(--sevs-navy)]">{e.name}</h2>
                      <p className="text-sm text-[var(--sevs-text-muted)]">Published {formatDateTime(e.resultsPublishedAt!)}</p>
                      {winners.length > 0 && (
                        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                          {winners.map((w) => (
                            <div key={w.id} className="min-w-0">
                              <dt className="inline text-[var(--sevs-text-muted)]">{w.positionName}: </dt>
                              <dd className="inline font-semibold text-[var(--sevs-navy)]">{w.candidateName}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <Link
                        href={`/results/${e.id}`}
                        className="mt-4 inline-block rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
                      >
                        View full results<span className="sr-only">: {e.name}</span>
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}