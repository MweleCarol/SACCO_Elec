"use client";

import { useState } from "react";
import { PositionResultsGrid } from "@/components/voter/PositionResultsGrid";
import type { PositionResult } from "@/types/result";

export function ResultsByPositionSection({ positions }: { positions: PositionResult[] }) {
  const [filter, setFilter] = useState("ALL");
  const filtered = filter === "ALL" ? positions : positions.filter((p) => p.positionId === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Results by Position</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
        >
          <option value="ALL">All Positions</option>
          {positions.map((p) => (
            <option key={p.positionId} value={p.positionId}>{p.positionTitle}</option>
          ))}
        </select>
      </div>
      <PositionResultsGrid positions={filtered} />
    </div>
  );
}