"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { Election, Participation } from "@/types/api";
import { formatDateTime, memberPhase, timeUntil } from "@/lib/electionStatus";
import { ElectionStatusBadge } from "@/components/voter/ElectionStatusBadge";

interface ElectionListCardProps {
  election: Election;
  // Only known for elections that are open; undefined while loading.
  participation?: Participation;
}

// One election as a member sees it. No live turnout (members only learn
// turnout with the published results), and the button always says what the
// member can actually do next.
export function ElectionListCard({ election, participation }: ElectionListCardProps) {
  const phase = memberPhase(election);
  const voted = participation?.hasVoted === true;

  const timing =
    phase === "OPEN"
      ? `Closes ${formatDateTime(election.endDate)} (${timeUntil(election.endDate)})`
      : phase === "UPCOMING"
        ? `Opens ${formatDateTime(election.startDate)}`
        : `Voting ended ${formatDateTime(election.closedAt ?? election.endDate)}`;

  const cta =
    phase === "OPEN" && !voted && participation
      ? { label: "Vote now", href: `/vote/${election.id}`, primary: true }
      : phase === "RESULTS"
        ? { label: "View results", href: `/results/${election.id}`, primary: false }
        : { label: "View details", href: `/elections/${election.id}`, primary: false };

  return (
    <article className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-bold leading-snug text-[var(--sevs-navy)]">{election.name}</h3>
          {election.description && (
            <p className="mt-1 line-clamp-2 break-words text-sm text-[var(--sevs-text-muted)]">{election.description}</p>
          )}
        </div>
        <span className="shrink-0">
          <ElectionStatusBadge election={election} />
        </span>
      </div>

      {phase === "OPEN" && voted && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          You have voted in this election.
        </p>
      )}
      {phase === "ENDED" && (
        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-[var(--sevs-text-muted)]">
          Votes are being counted. Results will appear here once they are approved and published.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-[var(--sevs-text-muted)]">{timing}</p>
        <Link
          href={cta.href}
          className={
            cta.primary
              ? "shrink-0 rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
              : "shrink-0 rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
          }
        >
          {cta.label}
          <span className="sr-only">: {election.name}</span>
        </Link>
      </div>
    </article>
  );
}