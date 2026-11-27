"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, ScanSearch } from "lucide-react";
import type { AIInsight, RiskLevel } from "@/types/api";
import { useInsightActions, useInsights, useOpenInsightCounts } from "@/hooks/useAi";
import { getApiErrorMessage } from "@/services/api/errors";
import { ToneBadge } from "@/components/voter/ElectionStatusBadge";
import { EmptyState, ErrorPanel, LoadingCards } from "@/components/ui/LoadState";

const RISK: Record<RiskLevel, { label: string; tone: "red" | "amber" | "gray"; bar: string }> = {
  HIGH: { label: "High risk", tone: "red", bar: "bg-red-600" },
  MEDIUM: { label: "Medium risk", tone: "amber", bar: "bg-amber-500" },
  LOW: { label: "Low risk", tone: "gray", bar: "bg-gray-400" },
};

// What each automatic check looks for, in plain words.
const EVENT_LABEL: Record<string, string> = {
  RAPID_FAILED_LOGINS: "Repeated failed sign-ins",
  FAST_APPROVAL: "Very fast approval decision",
  OFF_HOURS_ACTIVITY: "Activity outside working hours",
};

type Tab = "open" | "reviewed" | "all";
const TABS: { id: Tab; label: string; acknowledged: boolean | undefined }[] = [
  { id: "open", label: "Needs review", acknowledged: false },
  { id: "reviewed", label: "Reviewed", acknowledged: true },
  { id: "all", label: "All", acknowledged: undefined },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// Flags raised by the automatic checks over the audit trail. A person reviews
// each one; marking it reviewed never triggers any action by itself.
export function InsightsPanel({ canReview, canScan, onNotice }: { canReview: boolean; canScan: boolean; onNotice: (m: string) => void }) {
  const [tab, setTab] = useState<Tab>("open");
  const current = TABS.find((t) => t.id === tab)!;
  const insights = useInsights(current.acknowledged);
  const { counts } = useOpenInsightCounts();
  const actions = useInsightActions();
  const items = insights.data?.pages.flatMap((p) => p.insights) ?? [];
  const total = insights.data?.pages[0]?.pagination.totalCount ?? 0;

  async function scan() {
    try {
      await actions.scan.mutateAsync();
      onNotice("Scan finished. Any new flags appear under Needs review.");
    } catch (err) {
      onNotice(getApiErrorMessage(err));
    }
  }

  return (
    <section aria-labelledby="insights-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="insights-heading" className="text-lg font-bold text-[var(--sevs-navy)]">Governance insights</h2>
          <p className="text-sm text-[var(--sevs-text-muted)]">Automatic checks of the audit trail. A person reviews every flag.</p>
        </div>
        {canScan && (
          <button
            type="button"
            onClick={scan}
            disabled={actions.scan.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)] disabled:opacity-60"
          >
            {actions.scan.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-4 w-4" aria-hidden="true" />}
            {actions.scan.isPending ? "Scanning…" : "Run scan now"}
          </button>
        )}
      </div>

      {/* Open flags by risk */}
      <dl className="grid grid-cols-3 gap-3">
        {(["HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((level) => (
          <div key={level} className="relative overflow-hidden rounded-xl border border-[var(--sevs-border)] bg-white px-4 py-3 shadow-sm">
            <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${RISK[level].bar}`} />
            <dt className="text-xs font-semibold text-[var(--sevs-text-muted)]">{RISK[level].label}</dt>
            <dd className="mt-1 text-2xl font-extrabold text-[var(--sevs-navy)]">
              {counts[level] ?? "–"}
              <span className="sr-only"> open</span>
            </dd>
          </div>
        ))}
      </dl>

      <div role="group" aria-label="Show" className="inline-flex rounded-lg border border-[var(--sevs-border)] bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-bold ${
              tab === t.id ? "bg-[var(--sevs-navy)] text-white" : "text-[var(--sevs-text-muted)] hover:text-[var(--sevs-navy)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {insights.isLoading && <LoadingCards count={3} label="Loading insights…" />}
      {insights.isError && <ErrorPanel message={getApiErrorMessage(insights.error)} onRetry={() => insights.refetch()} />}
      {insights.isSuccess && items.length === 0 && (
        <EmptyState title={tab === "open" ? "Nothing needs review" : "No insights yet"}>
          {tab === "open" ? "No open flags. The checks have not found anything unusual." : "Flags from the automatic checks will appear here."}
        </EmptyState>
      )}

      {items.length > 0 && (
        <>
          <p className="text-xs text-[var(--sevs-text-muted)]" aria-live="polite">
            Showing {items.length} of {total}
          </p>
          <ul className="space-y-3">
            {items.map((i) => (
              <InsightCard key={i.id} insight={i} canReview={canReview} />
            ))}
          </ul>
          {insights.hasNextPage && (
            <button
              type="button"
              onClick={() => insights.fetchNextPage()}
              disabled={insights.isFetchingNextPage}
              className="w-full rounded-lg border border-[var(--sevs-border)] bg-white py-2.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50 disabled:opacity-60"
            >
              {insights.isFetchingNextPage ? "Loading…" : "Show more"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function InsightCard({ insight, canReview }: { insight: AIInsight; canReview: boolean }) {
  const { acknowledge } = useInsightActions();
  const [error, setError] = useState<string | null>(null);
  const risk = insight.riskLevel ? RISK[insight.riskLevel] : null;
  const reviewed = insight.acknowledgedAt !== null;

  async function review() {
    setError(null);
    try {
      await acknowledge.mutateAsync(insight.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <li className="relative overflow-hidden rounded-xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:p-5">
      {risk && <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${risk.bar}`} />}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sevs-text-muted)]" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--sevs-navy)]">{EVENT_LABEL[insight.eventType] ?? insight.eventType}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--sevs-text-muted)]">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {when(insight.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {risk && <ToneBadge label={risk.label} tone={risk.tone} />}
          {reviewed && <ToneBadge label="Reviewed" tone="green" />}
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--sevs-text-body)]">{insight.reasoning}</p>
      <p className="mt-2 rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-sm text-[var(--sevs-text-body)]">
        <span className="font-bold text-[var(--sevs-navy)]">Suggested check: </span>
        {insight.recommendation}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--sevs-text-muted)]">
          {reviewed ? `Reviewed ${when(insight.acknowledgedAt!)}` : "Waiting for a person to review"}
        </p>
        {canReview && !reviewed && (
          <button
            type="button"
            onClick={review}
            disabled={acknowledge.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sevs-border)] px-3 py-1.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {acknowledge.isPending ? "Saving…" : "Mark as reviewed"}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </li>
  );
}