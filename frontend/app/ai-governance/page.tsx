"use client";

import { Topbar } from "@/components/layout/Topbar";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { OfficerCopilotView } from "@/components/copilot/OfficerCopilotView";
import { AdminCopilotView } from "@/components/copilot/AdminCopilotView";

export default function AiGovernancePage() {
  const { member, isLoading } = useCurrentMember();

  if (isLoading) return null;
  if (!member || !["ELECTION_OFFICER", "ADMINISTRATOR", "AUDITOR"].includes(member.role)) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <>
      <Topbar title="AI Copilot" subtitle="AI governance assistant for election management" />

      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs font-semibold text-amber-800 sm:px-8">
        AI provides insights and recommendations. Humans make the decisions.
      </div>

      {member.role === "ELECTION_OFFICER" && <OfficerCopilotView />}
      {member.role === "ADMINISTRATOR" && <AdminCopilotView />}
      {member.role === "AUDITOR" && <AdminCopilotView isReadOnly />}
    </>
  );
}