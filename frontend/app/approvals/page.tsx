"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { DatBadge } from "@/components/officer/DatBadge";
import { ApprovalReviewSheet } from "@/components/officer/ApprovalReviewSheet";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { mockApprovals, getCurrentStageIndex } from "@/services/mock/approvals";
import type { Approval } from "@/types/approval";

type TabKey = "PENDING" | "MINE" | "CO_APPROVAL" | "HISTORY";
const TABS: { key: TabKey; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "MINE", label: "My Approvals" },
  { key: "CO_APPROVAL", label: "Awaiting Co-Approval" },
  { key: "HISTORY", label: "History" },
];

export default function ApprovalsPage() {
  const { member, isLoading } = useCurrentMember();
  const [tab, setTab] = useState<TabKey>("PENDING");
  const [reviewing, setReviewing] = useState<Approval | null>(null);
  const [, forceRerender] = useState(0);

  if (isLoading) return null;
  if (!member || !["ELECTION_OFFICER", "ADMINISTRATOR"].includes(member.role)) {
    return <div className="p-8"><p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p></div>;
  }

  const actingRole = member.role as "ELECTION_OFFICER" | "ADMINISTRATOR";

  const list = mockApprovals.filter((a) => {
    const stageIndex = getCurrentStageIndex(a);
    const myTurn = stageIndex !== -1 && a.stages[stageIndex].role === actingRole;
    const iDecidedAStage = a.stages.some((s) => s.approverName === member.name);

    if (tab === "PENDING") return a.status === "PENDING" && myTurn;
    if (tab === "MINE") return iDecidedAStage;
    if (tab === "CO_APPROVAL") return a.status === "PENDING" && !myTurn && stageIndex !== -1;
    return a.status !== "PENDING"; // HISTORY
  });

  return (
    <>
      <Topbar title="Approvals" subtitle="Distributed Administration Trust — sensitive actions require independent co-approval" />

      <div className="space-y-5 p-4 sm:p-8">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-bold ${
                tab === key ? "border-[var(--sevs-navy)] bg-[var(--sevs-navy)] text-white" : "border-[var(--sevs-border)] bg-white text-[var(--sevs-text-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {list.length === 0 && <p className="text-sm text-[var(--sevs-text-muted)]">Nothing here.</p>}
          {list.map((a) => (
            <button
              key={a.id}
              onClick={() => setReviewing(a)}
              className="flex w-full flex-col gap-2 rounded-2xl border border-[var(--sevs-border)] bg-white p-4 text-left shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0">
                <p className="font-bold text-[var(--sevs-navy)]">{a.targetLabel}</p>
                <p className="mt-0.5 text-xs text-[var(--sevs-text-muted)]">
                  {a.type.replace(/_/g, " ")} · Requested by {a.requestedBy} · {new Date(a.requestedAt).toLocaleDateString()}
                </p>
              </div>
              <DatBadge approval={a} />
            </button>
          ))}
        </div>
      </div>

      {reviewing && (
        <ApprovalReviewSheet
          approval={reviewing}
          actingRole={actingRole}
          actingName={member.name}
          onClose={() => setReviewing(null)}
          onDecided={() => forceRerender((n) => n + 1)}
        />
      )}
    </>
  );
}