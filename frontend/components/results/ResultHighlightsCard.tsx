import { Lightbulb } from "lucide-react";
import type { ResultHighlight } from "@/types/result";

export function ResultHighlightsCard({
  highlights,
}: {
  highlights: ResultHighlight[];
}) {
  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
          Key Highlights
        </h3>
      </div>
      <ul className="space-y-2 text-sm text-[var(--sevs-text-body)]">
        {highlights.map((h) => (
          <li key={h.label} className="flex gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--sevs-text-muted)]" />
            <span>
              <span className="font-semibold text-[var(--sevs-navy)]">
                {h.label}
              </span>
              {h.value && `: ${h.value}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
