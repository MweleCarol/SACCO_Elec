"use client";

import { useState } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";
import type { Anomaly } from "@/types/ai-governance";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left sm:p-5"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-[var(--sevs-navy)]">{anomaly.title}</p>
            <StatusBadge status={anomaly.severity} />
          </div>
          <p className="mt-1 text-sm text-[var(--sevs-text-body)]">{anomaly.description}</p>
          <p className="mt-1 text-xs text-[var(--sevs-text-muted)]">
            {anomaly.relatedModule} · {new Date(anomaly.detectedAt).toLocaleDateString()}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-[var(--sevs-border)] px-4 py-4 sm:px-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Evidence</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[var(--sevs-text-body)]">
            {anomaly.explainability.evidence.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Recommended Action</p>
          <p className="mt-1 text-sm text-[var(--sevs-text-body)]">{anomaly.explainability.recommendedAction}</p>
        </div>
      )}
    </div>
  );
}