import type { PositionResult } from "@/types/result";

interface ResultsCardProps {
  result: PositionResult;
}

export function ResultsCard({ result }: ResultsCardProps) {
  const sorted = [...result.candidates].sort((a, b) => b.votes - a.votes);

  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
          {result.positionTitle}
        </h3>
        <span className="text-xs text-[var(--sevs-text-muted)]">
          {result.totalVotesCast.toLocaleString()} votes cast
        </span>
      </div>

      <div className="space-y-4">
        {sorted.map((candidate) => {
          const pct = result.totalVotesCast > 0 ? Math.round((candidate.votes / result.totalVotesCast) * 100) : 0;
          return (
            <div key={candidate.candidateId}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className={`font-bold ${candidate.isWinner ? "text-[var(--sevs-navy)]" : "text-[var(--sevs-text-body)]"}`}>
                  {candidate.candidateName}
                  {candidate.isWinner && (
                    <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                      WINNER
                    </span>
                  )}
                </span>
                <span className="text-[var(--sevs-text-muted)]">
                  {candidate.votes.toLocaleString()} ({pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${candidate.isWinner ? "bg-green-500" : "bg-[var(--sevs-navy)]/40"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}