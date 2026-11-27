"use client";

import { useState } from "react";
import { Info, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { askCopilot } from "@/services/ai.service";
import { Topbar } from "@/components/layout/Topbar";
import { AssistantChat } from "@/components/ai/AssistantChat";
import { InsightsPanel } from "@/components/ai/InsightsPanel";

const COPILOT_SUGGESTIONS = [
  "Summarise the state of our elections",
  "Are there any high-risk flags I should look at first?",
  "What happened in the audit log this week?",
  "Which elections are waiting for approval?",
];

// Staff AI workspace: governance insights (everyone on staff) and the
// Copilot chat (officers and administrators; the backend refuses auditors).
export default function AiGovernancePage() {
  const { user } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);

  if (!user) return null;
  if (user.role === "MEMBER") {
    return (
      <>
        <Topbar title="AI Insights" subtitle="Staff only" />
        <div className="p-4 sm:p-8">
          <p className="text-[var(--sevs-text-muted)]">This page is for election staff. Use the Need help? button for questions about SEVS.</p>
        </div>
      </>
    );
  }

  const isAuditor = user.role === "AUDITOR";

  return (
    <>
      <Topbar title="AI Insights" subtitle={isAuditor ? "Automatic checks of the audit trail (read-only)" : "Governance checks and your AI Copilot"} />

      <div className="space-y-6 p-4 sm:p-8">
        <p className="flex items-start gap-2 rounded-xl border border-[var(--sevs-border)] bg-white px-4 py-3 text-sm text-[var(--sevs-text-body)] shadow-sm">
          <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sevs-navy)]" aria-hidden="true" />
          <span>
            <strong className="text-[var(--sevs-navy)]">People decide, AI advises.</strong> The AI never sees ballots or how
            anyone voted, and it cannot approve, reject or change anything.
          </span>
        </p>

        <div aria-live="polite">
          {notice && (
            <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{notice}</p>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <InsightsPanel
              canReview={!isAuditor}
              canScan={user.role === "ELECTION_ADMINISTRATOR"}
              onNotice={setNotice}
            />
          </div>
          <div className="xl:sticky xl:top-6 xl:col-span-2">
            {isAuditor ? (
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sevs-navy)]" aria-hidden="true" />
                <div>
                  <h2 className="font-bold text-[var(--sevs-navy)]">Copilot</h2>
                  <p className="mt-1 text-sm text-[var(--sevs-text-body)]">
                    The Copilot chat is for election officers and administrators. Auditors keep an independent, read-only
                    view of the insights and the audit trail.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[620px]">
                <AssistantChat
                  title="SEVS Copilot"
                  subtitle="Operational summaries for election staff"
                  greeting="Ask me about election status, audit activity this week, or open governance flags. I work from summaries only: no ballots, no individual votes."
                  suggestions={COPILOT_SUGGESTIONS}
                  notice="AI-generated · Advisory only · No access to ballots"
                  ask={askCopilot}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}