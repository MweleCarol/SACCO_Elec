import Link from "next/link";
import type { Election } from "@/types/election";
import { getVotingProgress } from "@/services/mock/elections";

// Props for the VoterElectionCard component
interface VoterElectionCardProps {
  election: Election;
}

// VoterElectionCard component that displays information about an election, including title, description, voting progress, and a link to vote.
export function VoterElectionCard({ election }: VoterElectionCardProps) {
  const progress = getVotingProgress(election);
  const closesAt = new Date(election.endDate);

  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--sevs-navy)]">{election.title}</h3>
          <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">{election.description}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          LIVE
        </span>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[var(--sevs-text-muted)]">
          <span>Voting progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[var(--sevs-navy)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-[var(--sevs-text-muted)]">
          Closes{" "}
          {closesAt.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <Link
          href={`/vote/${election.id}`}
          className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
        >
          Vote Now
        </Link>
      </div>
    </div>
  );
}