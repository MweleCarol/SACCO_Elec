"use client";

import { useState } from "react";
import { Sparkles, ChevronRight, X } from "lucide-react";
import { CopilotChatPanel } from "@/components/copilot/CopilotChatPanel";

interface CopilotTeaserCardProps {
  description: string;
  greeting: string;
  suggestedQuestions: string[];
}

export function CopilotTeaserCard({
  description,
  greeting,
  suggestedQuestions,
}: CopilotTeaserCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--sevs-navy)]" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
            AI Copilot
          </h3>
        </div>
        <p className="mb-3 text-sm text-[var(--sevs-text-body)]">
          {description}
        </p>
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm font-semibold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
        >
          Ask a question...
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-2xl bg-white shadow-lg sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-1/2 sm:h-[70vh] sm:w-96 sm:-translate-y-1/2 sm:rounded-2xl">
            <div className="flex items-center justify-end px-4 pt-3">
              <button onClick={() => setOpen(false)} aria-label="Close Copilot">
                <X className="h-5 w-5 text-[var(--sevs-text-muted)]" />
              </button>
            </div>
            <div className="min-h-0 flex-1 px-4 pb-4">
              <CopilotChatPanel
                title="AI Copilot"
                subtitle="Ask me anything about this election."
                greeting={greeting}
                suggestedQuestions={suggestedQuestions}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
