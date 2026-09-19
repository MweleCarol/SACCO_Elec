import type { PositionResult } from "@/types/result";

export function ResultsByPositionSummary({ positions }: { positions: PositionResult[] }) {
  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Results by Position</h3>
        <a href="#candidates-results" className="text-xs font-bold text-[var(--sevs-navy)] hover:underline">
          View All
        </a>
      </div>

      <div className="space-y-4">
        {positions.map((p) => {
          const winner = p.candidates.find((c) => c.isWinner) ?? [...p.candidates].sort((a, b) => b.votes - a.votes)[0];
          const pct = winner && p.totalVotesCast > 0 ? Math.round((winner.votes / p.totalVotesCast) * 1000) / 10 : 0;

          return (
            <div key={p.positionId}>
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-[var(--sevs-navy)]">{p.positionTitle}</p>
                <p className="text-xs font-semibold text-[var(--sevs-text-muted)]">{pct}%</p>
              </div>
              {winner && <p className="text-xs text-[var(--sevs-text-muted)]">{winner.votes.toLocaleString()} votes</p>}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-[var(--sevs-navy)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}