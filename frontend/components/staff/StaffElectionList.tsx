"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { UserRole } from "@/types/api";
import { useElectionList } from "@/hooks/useElections";
import { usePendingApprovals } from "@/hooks/useStaffElections";
import { formatDateTime } from "@/lib/electionStatus";
import { nextStep, staffStage, STAFF_STAGE_DISPLAY, STAFF_TABS, type StaffTab } from "@/lib/staffElectionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { ToneBadge } from "@/components/voter/ElectionStatusBadge";
import { EmptyState, ErrorPanel, LoadingCards } from "@/components/ui/LoadState";

// Every election, at every stage, for officers, administrators and auditors.
// Each card says what should happen next, so the lifecycle never has to be
// remembered. Only officers can create elections.
export function StaffElectionList({ role }: { role: UserRole }) {
  const [tab, setTab] = useState<StaffTab>("ALL");
  const elections = useElectionList();
  const pending = usePendingApprovals();
  const all = elections.data ?? [];
  const canCreate = role === "ELECTION_OFFICER";

  const inTab = (key: StaffTab) => {
    const stages = STAFF_TABS.find((t) => t.key === key)!.stages;
    return stages ? all.filter((e) => stages.includes(staffStage(e))) : all;
  };
  const shown = inTab(tab);

  return (
    <>
      <Topbar
        title="Elections"
        subtitle={canCreate ? "Create and manage SACCO elections" : "Every SACCO election and where it stands"}
      />
      <div className="space-y-5 p-4 sm:p-8">
        {canCreate && (
          <Link
            href="/elections/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New election
          </Link>
        )}

        <div role="tablist" aria-label="Filter elections" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {STAFF_TABS.map(({ key, label }) => (
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
              {elections.isSuccess && <span className="ml-1.5">({inTab(key).length})</span>}
            </button>
          ))}
        </div>

        {elections.isLoading && <LoadingCards label="Loading elections…" />}
        {elections.isError && <ErrorPanel message={getApiErrorMessage(elections.error)} onRetry={() => elections.refetch()} />}
        {elections.isSuccess && shown.length === 0 && (
          <EmptyState title={tab === "ALL" ? "No elections yet" : "No elections at this stage"}>
            {tab === "ALL" && canCreate && "Create the first one with “New election”."}
          </EmptyState>
        )}

        <ul className="space-y-3">
          {shown.map((e) => {
            const stage = staffStage(e);
            const requests = pending.data?.get(e.id) ?? [];
            return (
              <li key={e.id}>
                <article className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-bold text-[var(--sevs-navy)]">{e.name}</h2>
                      <p className="mt-0.5 text-xs text-[var(--sevs-text-muted)]">
                        {formatDateTime(e.startDate)} – {formatDateTime(e.endDate)} · needs {e.requiredApprovals} approvals
                      </p>
                    </div>
                    <ToneBadge {...STAFF_STAGE_DISPLAY[stage]} />
                  </div>
                  <p className="mt-3 rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-sm text-[var(--sevs-text-body)]">
                    <span className="font-bold">Next: </span>
                    {nextStep(e, role, requests)}
                  </p>
                  <div className="mt-3 text-right">
                    <Link
                      href={`/elections/${e.id}`}
                      className="inline-block rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
                    >
                      Open<span className="sr-only">: {e.name}</span>
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}