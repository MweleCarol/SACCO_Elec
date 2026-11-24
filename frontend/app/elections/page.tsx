"use client";
// app/elections/page.tsx
import { useState } from "react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useElectionList, useParticipationFor } from "@/hooks/useElections";
import { Topbar } from "@/components/layout/Topbar";
import { ElectionListCard } from "@/components/voter/ElectionListCard";
import { EmptyState, ErrorPanel, LoadingCards } from "@/components/ui/LoadState";
import { memberPhase, type MemberPhase } from "@/lib/electionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { StaffElectionList } from "@/components/staff/StaffElectionList";

type TabKey = "OPEN" | "UPCOMING" | "PAST" | "ALL";

const TABS: { key: TabKey; label: string; phases: MemberPhase[] }[] = [
  { key: "OPEN", label: "Open now", phases: ["OPEN"] },
  { key: "UPCOMING", label: "Upcoming", phases: ["UPCOMING"] },
  { key: "PAST", label: "Past", phases: ["ENDED", "RESULTS", "CANCELLED"] },
  { key: "ALL", label: "All", phases: ["OPEN", "UPCOMING", "ENDED", "RESULTS", "CANCELLED"] },
];

export default function ElectionsPage() {
  const { member, isLoading } = useCurrentMember();

  if (isLoading || !member) return null; // AppShell shows the loading/redirect state

  // Officers, administrators and auditors see every election at every stage.
  if (member.role !== "MEMBER") return <StaffElectionList role={member.role} />;

  return <MemberElections canVote />;
}

// The member view: elections grouped by what the member can do now.
function MemberElections({ canVote }: { canVote: boolean }) {
  const [tab, setTab] = useState<TabKey>("OPEN");
  const elections = useElectionList();
  const all = elections.data ?? [];
  // "Have I voted?" is only asked for elections open right now.
  const open = all.filter((e) => memberPhase(e) === "OPEN");
  const participation = useParticipationFor(canVote ? open : []);

  const phases = TABS.find((t) => t.key === tab)!.phases;
  const shown = all
    .filter((e) => phases.includes(memberPhase(e)))
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  return (
    <>
      <Topbar title="Elections" subtitle="SACCO elections you can take part in" />

      <div className="space-y-6 p-4 sm:p-8">
        <div role="tablist" aria-label="Filter elections" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map(({ key, label, phases: tabPhases }) => {
            const count = all.filter((e) => tabPhases.includes(memberPhase(e))).length;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`shrink-0 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-bold transition ${
                  tab === key
                    ? "border-[var(--sevs-navy)] bg-[var(--sevs-navy)] text-white"
                    : "border-[var(--sevs-border)] bg-white text-[var(--sevs-text-muted)] hover:bg-gray-50"
                }`}
              >
                {label}
                {elections.isSuccess && <span className="ml-1.5">({count})</span>}
              </button>
            );
          })}
        </div>

        {elections.isLoading && <LoadingCards label="Loading elections…" />}
        {elections.isError && (
          <ErrorPanel message={getApiErrorMessage(elections.error)} onRetry={() => elections.refetch()} />
        )}

        {elections.isSuccess && shown.length === 0 && (
          <EmptyState title={tab === "OPEN" ? "No elections are open for voting right now" : "No elections here"}>
            {tab === "OPEN" && "You'll get a notification as soon as voting opens."}
          </EmptyState>
        )}

        <div className="space-y-4">
          {shown.map((election) => (
            <ElectionListCard
              key={election.id}
              election={election}
              participation={participation.byElection.get(election.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}