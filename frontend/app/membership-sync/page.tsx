"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { mockMembershipSync, runMockSync } from "@/services/mock/membership-sync";

export default function MembershipSyncPage() {
  const { member, isLoading } = useCurrentMember();
  const [, forceRerender] = useState(0);
  const [syncing, setSyncing] = useState(false);

  if (isLoading) return null;
  if (!member || member.role !== "ADMINISTRATOR") {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  function handleSync() {
    setSyncing(true);
    // Mock only — no real connection to the SACCO Membership System exists yet.
    setTimeout(() => {
      runMockSync();
      setSyncing(false);
      forceRerender((n) => n + 1);
    }, 900);
  }

  return (
    <>
      <Topbar title="Membership Synchronization" subtitle="SACCO Membership System integration" />

      <div className="max-w-3xl space-y-6 p-4 sm:p-8">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
            SACCO Membership System
          </h3>

          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--sevs-text-muted)]">Connection Status</dt>
              <dd className="mt-1 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${mockMembershipSync.connectionStatus === "CONNECTED" ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-medium text-[var(--sevs-text-body)]">
                  {mockMembershipSync.connectionStatus === "CONNECTED" ? "Connected" : "Disconnected"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--sevs-text-muted)]">Last Synchronized</dt>
              <dd className="mt-1 text-[var(--sevs-text-body)]">
                {new Date(mockMembershipSync.lastSyncedAt).toLocaleString(undefined, {
                  day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--sevs-text-muted)]">Members Received</dt>
              <dd className="mt-1 font-bold text-[var(--sevs-navy)]">{mockMembershipSync.membersReceived.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--sevs-text-muted)]">Eligible Members</dt>
              <dd className="mt-1 font-bold text-[var(--sevs-navy)]">{mockMembershipSync.eligibleMembers.toLocaleString()}</dd>
            </div>
          </dl>

          <Button onClick={handleSync} disabled={syncing} isLoading={syncing} className="mt-6 w-full sm:w-auto sm:px-8">
            Synchronize Now
          </Button>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm">
          <h3 className="border-b border-[var(--sevs-border)] p-5 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)] sm:p-6">
            Synchronization History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[var(--sevs-text-muted)]">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Records</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sevs-border)]">
                {mockMembershipSync.history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-5 py-3 text-[var(--sevs-text-body)]">
                      {new Date(h.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-[var(--sevs-text-body)]">{h.recordsProcessed.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={h.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}