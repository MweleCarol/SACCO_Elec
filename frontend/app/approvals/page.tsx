"use client";

import { useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import type { ApprovalRequest } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovalHistory, useOpenApprovals } from "@/hooks/useApprovals";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { EmptyState, ErrorPanel, LoadingCards } from "@/components/ui/LoadState";
import { ApprovalRequestCard } from "@/components/approvals/ApprovalRequestCard";

type Tab = "mine" | "others" | "history";

// Sensitive actions (opening voting, changing dates, cancelling, publishing
// results) need approvals from staff other than the person who asked.
// Officers and administrators decide here; auditors watch, read-only.
export default function ApprovalsPage() {
  const { user } = useAuth();
  const open = useOpenApprovals();
  const history = useApprovalHistory();
  const [tab, setTab] = useState<Tab | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!user) return null;
  if (user.role === "MEMBER") {
    return (
      <>
        <Topbar title="Approvals" subtitle="Staff only" />
        <div className="p-4 sm:p-8">
          <p className="text-[var(--sevs-text-muted)]">This page is for election staff.</p>
        </div>
      </>
    );
  }

  const canDecide = user.role === "ELECTION_OFFICER" || user.role === "ELECTION_ADMINISTRATOR";
  const all = open.data ?? [];
  // Requests this person can still approve or reject.
  const needsMe = (r: ApprovalRequest) =>
    canDecide && r.requestedById !== user.id && !r.decisions?.some((d) => d.approverId === user.id);
  const forMe = all.filter(needsMe);
  const waiting = all.filter((r) => !needsMe(r));
  const past = history.data?.pages.flatMap((p) => p.requests) ?? [];
  const pastTotal = history.data?.pages[0]?.pagination.totalCount ?? 0;

  const tabs: { id: Tab; label: string; count?: number }[] = canDecide
    ? [
        { id: "mine", label: "Needs your decision", count: forMe.length },
        { id: "others", label: "Waiting on others", count: waiting.length },
        { id: "history", label: "History" },
      ]
    : [
        { id: "others", label: "Waiting", count: waiting.length },
        { id: "history", label: "History" },
      ];
  const current: Tab = tab ?? (canDecide ? "mine" : "others");

  // Left/Right arrows move between tabs, as screen-reader users expect.
  function onTabKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]!;
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }
  const list = current === "mine" ? forMe : current === "others" ? waiting : past;

  return (
    <>
      <Topbar title="Approvals" subtitle={canDecide ? "Sensitive actions need a second pair of eyes" : "Read-only view of every approval"} />
      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
        <p className="flex items-start gap-2 rounded-xl border border-[var(--sevs-border)] bg-white px-4 py-3 text-sm text-[var(--sevs-text-body)] shadow-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sevs-navy)]" aria-hidden="true" />
          <span>
            Opening voting, changing dates, cancelling and publishing results each need the number of approvals set on
            the election, from staff <strong>other than the person who asked</strong>. One rejection closes the request.
            Requests expire after 7 days.
          </span>
        </p>

        <div aria-live="polite">
          {notice && (
            <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}
        </div>

        <div role="tablist" aria-label="Approval requests" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={current === t.id}
              tabIndex={current === t.id ? 0 : -1}
              onKeyDown={(e) => onTabKey(e, i)}
              aria-controls="approvals-panel"
              onClick={() => setTab(t.id)}
              className={clsx(
                "inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold",
                current === t.id
                  ? "border-[var(--sevs-navy)] bg-[var(--sevs-navy)] text-white"
                  : "border-[var(--sevs-border)] bg-white text-[var(--sevs-text-muted)] hover:text-[var(--sevs-navy)]"
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-xs",
                    current === t.id ? "bg-white/20 text-white" : t.id === "mine" && t.count > 0 ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div id="approvals-panel" role="tabpanel" aria-labelledby={`tab-${current}`} className="space-y-3">
          {(current === "history" ? history.isLoading : open.isLoading) && <LoadingCards count={2} label="Loading requests…" />}
          {current !== "history" && open.isError && <ErrorPanel message={getApiErrorMessage(open.error)} onRetry={() => open.refetch()} />}
          {current === "history" && history.isError && <ErrorPanel message={getApiErrorMessage(history.error)} onRetry={() => history.refetch()} />}

          {list.length === 0 && (current === "history" ? history.isSuccess : open.isSuccess) && (
            <EmptyState
              title={current === "mine" ? "Nothing needs your decision" : current === "others" ? "Nothing waiting" : "No decided requests yet"}
            >
              {current === "mine"
                ? "When another officer or administrator asks for a sensitive action, it appears here and you are notified."
                : current === "others"
                  ? "Requests you made, or already decided, appear here until they are complete."
                  : "Approved, rejected and expired requests are kept here for the record."}
            </EmptyState>
          )}

          {list.map((r) => (
            <ApprovalRequestCard key={r.id} request={r} role={user.role} userId={user.id} showElection onDone={setNotice} />
          ))}

          {current === "history" && history.hasNextPage && (
            <button
              type="button"
              onClick={() => history.fetchNextPage()}
              disabled={history.isFetchingNextPage}
              className="w-full rounded-lg border border-[var(--sevs-border)] bg-white py-2.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50 disabled:opacity-60"
            >
              {history.isFetchingNextPage ? "Loading…" : `Show more (${past.length} of ${pastTotal})`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}