import type { BallotRecord } from "@/types/ballot";
import type { Election } from "@/types/election";
import { StatusBadge } from "@/components/ui/StatusBadge";

// Props for the row displaying a voter's activity
interface VotingActivityRowProps {
  ballot: BallotRecord;
  election?: Election;
}

// Component to display a single row of voting activity, including election title, vote date/time, receipt hash, and status badge.
export function VotingActivityRow({ ballot, election }: VotingActivityRowProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
      <div>
        <h4 className="font-bold text-[var(--sevs-navy)]">{election?.title ?? "Unknown election"}</h4>
        <p className="mt-1 text-xs text-[var(--sevs-text-muted)]">
          Voted{" "}
          {new Date(ballot.votedAt).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          at{" "}
          {new Date(ballot.votedAt).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <p className="mt-1 font-mono text-[10px] text-[var(--sevs-text-muted)]">
          Receipt: {ballot.receiptHash}
        </p>
      </div>
      <StatusBadge status={ballot.status} />
    </div>
  );
}