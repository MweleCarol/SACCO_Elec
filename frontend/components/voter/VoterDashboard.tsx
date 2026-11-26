"use client";

import Link from "next/link";
import { CalendarClock, CheckSquare, Vote } from "lucide-react";
import type { Member } from "@/types/member";
import { useElectionList, useParticipationFor } from "@/hooks/useElections";
import { memberPhase, formatDateTime, timeUntil } from "@/lib/electionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { StatCard } from "@/components/dashboard/StatCard";
import { ElectionListCard } from "@/components/voter/ElectionListCard";
import {
  EmptyState,
  ErrorPanel,
  LoadingCards,
} from "@/components/ui/LoadState";
import { TwoFactorSuggestion } from "@/components/account/TwoFactorSuggestion";

interface VoterDashboardProps {
  user: Member;
}

// The member's home page. It answers "is there anything I need to do?" first.
// Members never see turnout or running counts here (decided: turnout is shown
// to members only with the published results).
export function VoterDashboard({ user }: VoterDashboardProps) {
  const elections = useElectionList();
  const all = elections.data ?? [];
  const open = all.filter((e) => memberPhase(e) === "OPEN");
  const upcoming = all
    .filter((e) => memberPhase(e) === "UPCOMING")
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  const participation = useParticipationFor(open);

  const awaiting = open.filter(
    (e) => participation.byElection.get(e.id)?.hasVoted === false,
  );
  const votedCount = open.filter(
    (e) => participation.byElection.get(e.id)?.hasVoted,
  ).length;

  if (elections.isLoading)
    return (
      <div className="p-4 sm:p-8">
        <LoadingCards label="Loading your dashboard…" />
      </div>
    );
  if (elections.isError) {
    return (
      <div className="p-4 sm:p-8">
        <ErrorPanel
          message={getApiErrorMessage(elections.error)}
          onRetry={() => elections.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-8">
      {awaiting.length > 0 && (
        <section
          aria-labelledby="awaiting-heading"
          className="flex flex-col gap-4 rounded-2xl bg-[var(--sevs-navy)] p-5 text-white sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 id="awaiting-heading" className="text-lg font-bold">
              {awaiting.length === 1
                ? `${awaiting[0]!.name} is waiting for your vote`
                : `${awaiting.length} elections are waiting for your vote`}
            </h2>
            <p className="mt-1 text-sm text-white/80">
              Voting closes {formatDateTime(awaiting[0]!.endDate)} (
              {timeUntil(awaiting[0]!.endDate)}).
            </p>
          </div>
          <Link
            href={`/vote/${awaiting[0]!.id}`}
            className="shrink-0 rounded-lg bg-white px-5 py-2.5 text-center text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-100"
          >
            Vote now
          </Link>
        </section>
      )}

      <TwoFactorSuggestion />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          label="Open for voting"
          value={open.length}
          hint="Elections you can vote in now"
          icon={<Vote className="h-4 w-4 text-[var(--sevs-navy)]" />}
        />
        <StatCard
          label="Voted"
          value={
            participation.isLoading ? "…" : `${votedCount} of ${open.length}`
          }
          hint="Of the elections open now"
          icon={<CheckSquare className="h-4 w-4 text-[var(--sevs-navy)]" />}
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          hint={
            !upcoming[0]
              ? "None announced yet"
              : new Date(upcoming[0].startDate) > new Date()
                ? `Next opens ${timeUntil(upcoming[0].startDate)}`
                : "Waiting for officials to open voting"
          }
          icon={<CalendarClock className="h-4 w-4 text-[var(--sevs-navy)]" />}
        />
      </div>

      <section aria-labelledby="open-heading">
        <h2
          id="open-heading"
          className="mb-4 text-lg font-bold text-[var(--sevs-navy)]"
        >
          Open now
        </h2>
        {open.length === 0 ? (
          <EmptyState title="No elections are open for voting right now">
            You&apos;ll get a notification as soon as voting opens,{" "}
            {user.name.split(" ")[0]}.
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {open.map((e) => (
              <ElectionListCard
                key={e.id}
                election={e}
                participation={participation.byElection.get(e.id)}
              />
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading">
          <div className="mb-4 flex items-baseline justify-between">
            <h2
              id="upcoming-heading"
              className="text-lg font-bold text-[var(--sevs-navy)]"
            >
              Coming up
            </h2>
            <Link
              href="/elections"
              className="text-sm font-bold text-[var(--sevs-navy)] hover:underline"
            >
              All elections
            </Link>
          </div>
          <div className="space-y-4">
            {upcoming.slice(0, 3).map((e) => (
              <ElectionListCard key={e.id} election={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
