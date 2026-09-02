"use client";
// app/elections/page.tsx
import Link from "next/link";
import { useState } from "react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { ElectionListCard } from "@/components/voter/ElectionListCard";
import { getMemberVisibleElections, getComputedLifecycleStatus } from "@/services/mock/elections";
import type { LifecycleStatus } from "@/types/election";
import { ElectionManagementTable } from "@/components/officer/ElectionManagementTable";

type TabKey = "ALL" | "ACTIVE" | "UPCOMING" | "CLOSED";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "UPCOMING", label: "Upcoming" },
  { key: "CLOSED", label: "Closed" },
];

function matchesTab(lifecycle: LifecycleStatus, tab: TabKey): boolean {
  if (tab === "ALL") return true;
  if (tab === "ACTIVE") return lifecycle === "ACTIVE";
  if (tab === "UPCOMING") return lifecycle === "SCHEDULED";
  return lifecycle === "CLOSED" || lifecycle === "RESULTS_PUBLISHED" || lifecycle === "ARCHIVED";
}

export default function VoterElectionsPage() {
  const { member, isLoading } = useCurrentMember();
  const [tab, setTab] = useState<TabKey>("ALL");

  if (isLoading) return null;

  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">
            Log in
          </a>{" "}
          to view elections.
        </p>
      </div>
    );
  }

  const isOfficerOrAdmin = member.role === "ELECTION_OFFICER" || member.role === "ADMINISTRATOR";

  if (isOfficerOrAdmin) {
    return (
      <>
        <Topbar title="Elections" subtitle="Create and manage SACCO elections" />
        <div className="space-y-5 p-4 sm:p-8">
          <Link
            href="/elections/new"
            className="inline-block rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
          >
            + New Election
          </Link>
          <ElectionManagementTable />
        </div>
      </>
    );
  }

  const elections = getMemberVisibleElections()
    .map((e) => ({ election: e, lifecycle: getComputedLifecycleStatus(e) }))
    .filter(({ lifecycle }) => matchesTab(lifecycle, tab))
    .map(({ election }) => election);

  return (
    <>
      <Topbar title="Elections" subtitle="Elections you're eligible to participate in" />

      <div className="space-y-6 p-8">
        <div className="flex gap-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
                tab === key
                  ? "border-[var(--sevs-navy)] bg-[var(--sevs-navy)] text-white"
                  : "border-[var(--sevs-border)] bg-white text-[var(--sevs-text-muted)] hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {elections.length === 0 && (
            <p className="text-sm text-[var(--sevs-text-muted)]">No elections match this filter.</p>
          )}
          {elections.map((election) => (
            <ElectionListCard key={election.id} election={election} />
          ))}
        </div>
      </div>
    </>
  );
}