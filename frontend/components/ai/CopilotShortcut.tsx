import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

// A small card that opens the AI Insights page, where the Copilot lives.
// One chat in one place, rather than a separate copy on each screen.
export function CopilotShortcut({ description }: { description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sevs-navy)]">
          <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
        </span>
        <h3 className="font-bold text-[var(--sevs-navy)]">SEVS Copilot</h3>
      </div>
      <p className="mb-4 text-sm text-[var(--sevs-text-body)]">{description}</p>
      <Link
        href="/ai-governance"
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
      >
        Open AI Insights and Copilot
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}