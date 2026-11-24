"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { CandidateStatus, UserRole } from "@/types/api";
import { useElection } from "@/hooks/useElections";
import { useCandidates, usePositions } from "@/hooks/useCandidacy";
import { usePendingApprovals } from "@/hooks/useStaffElections";
import { formatDateTime } from "@/lib/electionStatus";
import { nextStep, staffStage, STAFF_STAGE_DISPLAY } from "@/lib/staffElectionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { ToneBadge } from "@/components/voter/ElectionStatusBadge";
import { CandidateAvatar } from "@/components/voter/CandidateAvatar";
import { ErrorPanel, LoadingCards } from "@/components/ui/LoadState";

const CANDIDATE_STATUS: Record<CandidateStatus, { label: string; tone: "amber" | "green" | "red" | "gray" }> = {
  PENDING_REVIEW: { label: "Awaiting review", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  WITHDRAWN: { label: "Withdrawn", tone: "gray" },
};

// One election as staff see it: status, next step, dates, positions and every
// candidate in any status. Read-only for now; the officer actions (edit,
// positions, candidates, submit, activate) are added in the next stage.
export function StaffElectionDetail({ id, role }: { id: string; role: UserRole }) {
  const election = useElection(id);
  const positions = usePositions(id);
  const candidates = useCandidates(id);
  const pending = usePendingApprovals();
  const search = useSearchParams();
  const justCreated = search.get("created") === "1";
  const unsaved = search.get("unsaved");

  if (election.isLoading || positions.isLoading || candidates.isLoading) {
    return (
      <>
        <Topbar title="Election" subtitle="Loading…" />
        <div className="p-4 sm:p-8"><LoadingCards count={2} /></div>
      </>
    );
  }
  const error = election.error ?? positions.error ?? candidates.error;
  if (error || !election.data) {
    return (
      <>
        <Topbar title="Election" subtitle="" />
        <div className="p-4 sm:p-8">
          <ErrorPanel message={getApiErrorMessage(error, "This election could not be found.")} backHref="/elections" />
        </div>
      </>
    );
  }

  const e = election.data;
  const stage = staffStage(e);
  const requests = pending.data?.get(e.id) ?? [];
  const forPosition = (positionId: string) => (candidates.data ?? []).filter((c) => c.positionId === positionId);

  return (
    <>
      <Topbar title={e.name} subtitle="Election details" />
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
        <Link href="/elections" className="text-sm font-bold text-[var(--sevs-navy)] hover:underline">
          ← All elections
        </Link>

        {justCreated && (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Election saved as a draft. Members cannot see it until an administrator approves it.
          </p>
        )}
        {unsaved && (
          <ErrorPanel message={`These positions could not be saved: ${unsaved}. Add them again on this page.`} />
        )}

        <section aria-labelledby="overview" className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id="overview" className="min-w-0 break-words text-xl font-bold text-[var(--sevs-navy)]">{e.name}</h2>
            <ToneBadge {...STAFF_STAGE_DISPLAY[stage]} />
          </div>
          {e.description && <p className="mt-2 text-sm text-[var(--sevs-text-body)]">{e.description}</p>}
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--sevs-text-muted)]">Voting opens</dt><dd className="font-medium">{formatDateTime(e.startDate)}</dd></div>
            <div><dt className="text-[var(--sevs-text-muted)]">Voting closes</dt><dd className="font-medium">{formatDateTime(e.endDate)}</dd></div>
            <div><dt className="text-[var(--sevs-text-muted)]">Approvals needed for key actions</dt><dd className="font-medium">{e.requiredApprovals}</dd></div>
            <div><dt className="text-[var(--sevs-text-muted)]">Created</dt><dd className="font-medium">{formatDateTime(e.createdAt)}</dd></div>
          </dl>
          <p className="mt-4 rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-sm text-[var(--sevs-text-body)]">
            <span className="font-bold">Next: </span>
            {nextStep(e, role, requests)}
          </p>
        </section>

        <section aria-labelledby="positions-heading">
          <h2 id="positions-heading" className="mb-3 text-lg font-bold text-[var(--sevs-navy)]">
            Positions and candidates
          </h2>
          {(positions.data ?? []).length === 0 && (
            <p className="rounded-xl bg-white px-4 py-3 text-sm text-[var(--sevs-text-muted)] ring-1 ring-[var(--sevs-border)]">
              No positions yet.
            </p>
          )}
          <div className="space-y-4">
            {(positions.data ?? []).map((p) => {
              const list = forPosition(p.id);
              return (
                <section key={p.id} aria-labelledby={`pos-${p.id}`} className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 sm:p-5">
                  <h3 id={`pos-${p.id}`} className="font-bold text-[var(--sevs-navy)]">
                    {p.name}{" "}
                    <span className="text-sm font-medium text-[var(--sevs-text-muted)]">
                      ({list.length} candidate{list.length === 1 ? "" : "s"})
                    </span>
                  </h3>
                  {p.description && <p className="text-sm text-[var(--sevs-text-muted)]">{p.description}</p>}
                  {list.length === 0 ? (
                    <p className="mt-3 text-sm text-[var(--sevs-text-muted)]">No candidates yet.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-[var(--sevs-border)]">
                      {list.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                          <CandidateAvatar name={c.displayName} photoUrl={c.photoUrl} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[var(--sevs-navy)]">{c.displayName}</p>
                            <p className="text-xs text-[var(--sevs-text-muted)]">
                              {"memberId" in c && c.memberId ? "Linked to a member account (includes self-nominations)" : "Registered by an officer"}
                            </p>
                          </div>
                          <ToneBadge {...CANDIDATE_STATUS[c.status]} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}