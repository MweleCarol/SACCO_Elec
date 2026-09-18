import { Users2, Vote, CheckSquare, AlertTriangle } from "lucide-react";

interface ResultsSummaryStatsProps {
  eligibleVoters: number;
  totalVotesCast: number;
  turnoutPct: number;
  validVotes: number;
  invalidVotes: number;
}

export function ResultsSummaryStats({ eligibleVoters, totalVotesCast, turnoutPct, validVotes, invalidVotes }: ResultsSummaryStatsProps) {
  const invalidPct = totalVotesCast > 0 ? Math.round((invalidVotes / totalVotesCast) * 1000) / 10 : 0;
  const validPct = totalVotesCast > 0 ? Math.round((validVotes / totalVotesCast) * 1000) / 10 : 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm">
        <Users2 className="h-4 w-4 text-[var(--sevs-navy)]" />
        <p className="mt-2 text-xl font-extrabold text-[var(--sevs-navy)]">{eligibleVoters.toLocaleString()}</p>
        <p className="text-xs text-[var(--sevs-text-muted)]">Eligible Voters</p>
      </div>
      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm">
        <Vote className="h-4 w-4 text-[var(--sevs-navy)]" />
        <p className="mt-2 text-xl font-extrabold text-[var(--sevs-navy)]">{totalVotesCast.toLocaleString()}</p>
        <p className="text-xs text-[var(--sevs-text-muted)]">Total Votes Cast · {turnoutPct}% turnout</p>
      </div>
      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm">
        <CheckSquare className="h-4 w-4 text-green-600" />
        <p className="mt-2 text-xl font-extrabold text-green-700">{validVotes.toLocaleString()}</p>
        <p className="text-xs text-[var(--sevs-text-muted)]">Valid Votes · {validPct}%</p>
      </div>
      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <p className="mt-2 text-xl font-extrabold text-red-600">{invalidVotes.toLocaleString()}</p>
        <p className="text-xs text-[var(--sevs-text-muted)]">Invalid Votes · {invalidPct}%</p>
      </div>
    </div>
  );
}