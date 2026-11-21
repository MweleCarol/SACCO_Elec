"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useElectionList, useParticipationFor } from "@/hooks/useElections";
import { formatDateTime, memberPhase } from "@/lib/electionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { ElectionStatusBadge } from "@/components/voter/ElectionStatusBadge";
import {
  EmptyState,
  ErrorPanel,
  LoadingCards,
} from "@/components/ui/LoadState";

// Which elections the member voted in, and when. Never what they chose: the
// system stores votes separately from names, so it cannot show that.
export default function MyVotingActivityPage() {
  const elections = useElectionList();
  // Only elections that have opened could have a vote.
  const votable = (elections.data ?? []).filter((e) =>
    ["OPEN", "ENDED", "RESULTS"].includes(memberPhase(e)),
  );
  const participation = useParticipationFor(votable);

  const voted = votable
    .map((e) => ({
      election: e,
      votedAt: participation.byElection.get(e.id)?.votedAt ?? null,
    }))
    .filter((r) => r.votedAt)
    .sort(
      (a, b) => new Date(b.votedAt!).getTime() - new Date(a.votedAt!).getTime(),
    );

  const loading = elections.isLoading || participation.isLoading;

  return (
    <>
      <Topbar
        title="My Voting Activity"
        subtitle="Elections you have voted in"
      />
      <div className="space-y-4 p-4 sm:p-8">
        <p className="text-sm text-[var(--sevs-text-muted)]">
          This list shows that you voted, not who you voted for. Your choices
          are kept secret, even from SACCO officials.
        </p>

        {loading && (
          <LoadingCards count={2} label="Loading your voting activity…" />
        )}
        {elections.isError && (
          <ErrorPanel
            message={getApiErrorMessage(elections.error)}
            onRetry={() => elections.refetch()}
          />
        )}
        {!loading && elections.isSuccess && voted.length === 0 && (
          <EmptyState title="You haven't voted in any elections yet">
            <Link
              href="/elections"
              className="font-bold text-[var(--sevs-navy)] hover:underline"
            >
              See elections
            </Link>
          </EmptyState>
        )}

        <ul className="space-y-3">
          {voted.map(({ election, votedAt }) => (
            <li
              key={election.id}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--sevs-border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-green-600"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="font-bold text-[var(--sevs-navy)]">
                    {election.name}
                  </p>
                  <p className="text-sm text-[var(--sevs-text-muted)]">
                    Voted on {formatDateTime(votedAt!)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <ElectionStatusBadge election={election} />
                {memberPhase(election) === "RESULTS" && (
                  <Link
                    href={`/results/${election.id}`}
                    className="text-sm font-bold text-[var(--sevs-navy)] hover:underline"
                  >
                    View results
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
