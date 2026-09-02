"use client";

import Link from "next/link";
import type { Election } from "@/types/election";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { getVotingProgress, getComputedLifecycleStatus, getDisplayStatus, isAcceptingNominations } from "@/services/mock/elections";
import { hasAppliedForElection } from "@/services/mock/candidates";

interface ElectionListCardProps {
  election: Election;
}

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`;
}

export function ElectionListCard({ election }: ElectionListCardProps) {
  const { member } = useCurrentMember();
  const progress = getVotingProgress(election);
  const status = getComputedLifecycleStatus(election);

  const cta =
    status === "ACTIVE"
      ? { label: "Vote Now", href: `/vote/${election.id}` }
      : status === "CLOSED" || status === "RESULTS_PUBLISHED" || status === "ARCHIVED"
      ? { label: "View Results", href: `/results?election=${election.id}` }
      : { label: "View Details", href: `/elections/${election.id}` };

  const canApply =
    member &&
    isAcceptingNominations(election) &&
    !hasAppliedForElection(member.id, election.id);

  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug text-[var(--sevs-navy)]">{election.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--sevs-text-muted)]">{election.description}</p>
        </div>
        <span className="shrink-0">
          <StatusBadge status={getDisplayStatus(election)} />
        </span>
      </div>

      {status === "ACTIVE" && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[var(--sevs-text-muted)]">
            <span>Voting progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[var(--sevs-navy)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {canApply && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-amber-800">Candidate applications are open.</p>
          <Link
            href={`/candidates/apply/${election.id}`}
            className="mt-1.5 inline-block text-xs font-bold text-[var(--sevs-navy)] hover:underline"
          >
            Apply to Become a Candidate →
          </Link>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-[var(--sevs-text-muted)]">
          Closes {formatDateRange(election.startDate, election.endDate).split(" – ")[1]}
        </p>
        <Link
          href={cta.href}
          className="shrink-0 whitespace-nowrap rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}