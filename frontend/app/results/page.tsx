"use client";

import { useState } from "react";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trophy, Info } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockResults, getElectionResultSummary } from "@/services/mock/results";
import { mockElections } from "@/services/mock/elections";
import type { CandidateResult } from "@/types/result";

function WinnerAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [failed, setFailed] = useState(!photoUrl);
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  if (failed) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)]/10 text-[10px] font-bold text-[var(--sevs-navy)] ring-2 ring-white"
        title={name}
      >
        {initials}
      </div>
    );
  }
  return (
    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-2 ring-white" title={name}>
      <Image src={photoUrl!} alt={name} fill className="object-cover" onError={() => setFailed(true)} />
    </div>
  );
}

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

  const allResultsSorted = [...mockResults].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const focusedElection = focusedElectionId ? mockElections.find((e) => e.id === focusedElectionId) : null;
  const focusedResultExists = focusedElectionId
    ? allResultsSorted.some((r) => r.electionId === focusedElectionId)
    : true;

  const resultsToShow = focusedElectionId
    ? allResultsSorted.filter((r) => r.electionId === focusedElectionId)
    : allResultsSorted;

  return (
    <>
      <Topbar title="Results" subtitle="Published outcomes for closed elections" />

      <div className="space-y-4 p-4 sm:p-8">
        {focusedElectionId && focusedResultExists && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
            <span>
              Showing results for <span className="font-semibold">{focusedElection?.title ?? "this election"}</span>
            </span>
            <Link href="/results" className="font-bold hover:underline">
              View all results
            </Link>
          </div>
        )}

        {focusedElectionId && !focusedResultExists && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">We couldn&apos;t find that result.</p>
              <p className="mt-0.5">
                It may not be published yet, or the link may be out of date.{" "}
                <Link href="/results" className="font-bold hover:underline">
                  View all published results
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {!focusedElectionId && resultsToShow.length === 0 && (
          <p className="text-sm text-[var(--sevs-text-muted)]">
            No published results yet. Results appear here once an election closes and its outcome
            is officially published.
          </p>
        )}

        {resultsToShow.map((result) => {
          const election = mockElections.find((e) => e.id === result.electionId);
          const winners: CandidateResult[] = result.positions
            .map((p) => p.candidates.find((c) => c.isWinner))
            .filter((c): c is CandidateResult => !!c);

          const summary = election ? getElectionResultSummary(election.id) : null;

          return (
            <Link
              key={result.electionId}
              href={`/results/${result.electionId}`}
              className="block rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm hover:bg-[var(--sevs-bg)] sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)] text-white">
                  <Trophy className="h-4.5 w-4.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="break-words text-lg font-bold text-[var(--sevs-navy)]">
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
                    {summary && <> · {summary.turnout}% turnout</>}
                  </p>

                  {winners.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {winners.map((w) => (
                          <WinnerAvatar key={w.candidateId} name={w.candidateName} photoUrl={w.photoUrl} />
                        ))}
                      </div>
                      <p className="min-w-0 truncate text-sm text-[var(--sevs-text-body)]">
                        <span className="font-semibold text-[var(--sevs-navy)]">Winners:</span>{" "}
                        {winners.map((w) => w.candidateName).join(", ")}
                      </p>
                    </div>
                  )}

                  <p className="mt-3 text-sm font-bold text-[var(--sevs-navy)]">View full results →</p>
                </div>
              </div>
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