"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import type { CandidateStatus, MyCandidacy } from "@/types/api";
import { useElectionList } from "@/hooks/useElections";
import { useMyCandidacies, useWithdrawCandidacy } from "@/hooks/useCandidacy";
import { formatDateTime, nominationsOpen } from "@/lib/electionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  EmptyState,
  ErrorPanel,
  LoadingCards,
} from "@/components/ui/LoadState";

const STATUS: Record<
  CandidateStatus,
  { label: string; tone: string; next: string }
> = {
  PENDING_REVIEW: {
    label: "Awaiting review",
    tone: "bg-amber-50 text-amber-900 ring-amber-600/20",
    next: "An election officer will review your nomination. You'll get a notification with the decision.",
  },
  APPROVED: {
    label: "On the ballot",
    tone: "bg-green-50 text-green-800 ring-green-600/20",
    next: "Members can now read your manifesto, and you will appear on the ballot when voting opens.",
  },
  REJECTED: {
    label: "Not approved",
    tone: "bg-red-50 text-red-800 ring-red-600/20",
    next: "The officer's reason is in your notifications. You may nominate yourself again while nominations are open.",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    tone: "bg-gray-100 text-gray-700 ring-gray-500/20",
    next: "You withdrew this nomination.",
  },
};

function MyCandidacyInner() {
  const submitted = useSearchParams().get("submitted") === "1";
  const mine = useMyCandidacies();
  const elections = useElectionList();
  const withdraw = useWithdrawCandidacy();
  const [toWithdraw, setToWithdraw] = useState<MyCandidacy | null>(null);

  const active = (mine.data ?? []).filter(
    (c) => c.status === "PENDING_REVIEW" || c.status === "APPROVED",
  );
  // Elections the member could still stand in.
  const open = (elections.data ?? []).filter(
    (e) => nominationsOpen(e) && !active.some((c) => c.electionId === e.id),
  );

  async function confirmWithdraw() {
    if (!toWithdraw) return;
    try {
      await withdraw.mutateAsync(toWithdraw.id);
      setToWithdraw(null);
    } catch {
      setToWithdraw(null); // the error is shown on the page
    }
  }

  return (
    <>
      <Topbar
        title="My Candidacy"
        subtitle="Your nominations and their status"
      />
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
        {submitted && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            Your nomination has been submitted. An election officer will review
            it.
          </p>
        )}
        {withdraw.isError && (
          <ErrorPanel message={getApiErrorMessage(withdraw.error)} />
        )}

        {mine.isLoading && (
          <LoadingCards count={2} label="Loading your nominations…" />
        )}
        {mine.isError && (
          <ErrorPanel
            message={getApiErrorMessage(mine.error)}
            onRetry={() => mine.refetch()}
          />
        )}
        {mine.isSuccess && mine.data.length === 0 && (
          <EmptyState title="You haven't nominated yourself in any election">
            {open.length > 0
              ? "Nominations are open for the elections below."
              : "You'll be able to stand when the next election is announced."}
          </EmptyState>
        )}

        <ul className="space-y-4">
          {mine.data?.map((c) => {
            const s = STATUS[c.status];
            const canWithdraw =
              (c.status === "PENDING_REVIEW" || c.status === "APPROVED") &&
              (c.election.status === "APPROVED" ||
                c.election.status === "SCHEDULED");
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-[var(--sevs-navy)]">
                      {c.position.name}
                    </p>
                    <p className="text-sm text-[var(--sevs-text-muted)]">
                      {c.election.name}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                      s.tone,
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="mt-3 text-xs text-[var(--sevs-text-muted)]">
                  Submitted {formatDateTime(c.createdAt)}
                </p>
                <p className="mt-3 rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-sm text-[var(--sevs-text-body)]">
                  <span className="font-bold">Next: </span>
                  {s.next}
                </p>
                {c.manifesto && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer select-none font-bold text-[var(--sevs-navy)]">
                      Your manifesto
                    </summary>
                    <p className="mt-2 whitespace-pre-line text-[var(--sevs-text-body)]">
                      {c.manifesto}
                    </p>
                  </details>
                )}
                {canWithdraw && (
                  <button
                    onClick={() => setToWithdraw(c)}
                    className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    Withdraw nomination
                    <span className="sr-only"> for {c.position.name}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {open.length > 0 && (
          <section aria-labelledby="open-noms">
            <h2
              id="open-noms"
              className="mb-3 text-lg font-bold text-[var(--sevs-navy)]"
            >
              Open for nominations
            </h2>
            <ul className="space-y-3">
              {open.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--sevs-border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--sevs-navy)]">
                      {e.name}
                    </p>
                    <p className="text-sm text-[var(--sevs-text-muted)]">
                      Nominations close when voting opens{" "}
                      {formatDateTime(e.startDate)}
                    </p>
                  </div>
                  <Link
                    href={`/candidates/apply/${e.id}`}
                    className="shrink-0 rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-center text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
                  >
                    Stand as a candidate
                    <span className="sr-only"> in {e.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {toWithdraw && (
        <ConfirmDialog
          title="Withdraw your nomination?"
          message={`You will no longer stand for ${toWithdraw.position.name} in ${toWithdraw.election.name}. You can nominate yourself again while nominations are open.`}
          confirmLabel="Withdraw"
          tone="danger"
          isLoading={withdraw.isPending}
          onConfirm={confirmWithdraw}
          onCancel={() => setToWithdraw(null)}
        />
      )}
    </>
  );
}

export default function MyCandidacyPage() {
  return (
    <Suspense fallback={null}>
      <MyCandidacyInner />
    </Suspense>
  );
}
