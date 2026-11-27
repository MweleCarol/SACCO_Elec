"use client";

import { useState } from "react";
import { Check, Trash2, UserMinus, X } from "lucide-react";
import type { Candidate, CandidateStatus, Position } from "@/types/api";
import { useElectionActions } from "@/hooks/useStaffElections";
import { getApiErrorMessage } from "@/services/api/errors";
import { CandidateAvatar } from "@/components/voter/CandidateAvatar";
import { ToneBadge } from "@/components/voter/ElectionStatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReasonDialog } from "@/components/ui/ReasonDialog";

const CANDIDATE_STATUS: Record<
  CandidateStatus,
  { label: string; tone: "amber" | "green" | "red" | "gray" }
> = {
  PENDING_REVIEW: { label: "Awaiting review", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  WITHDRAWN: { label: "Withdrawn", tone: "gray" },
};

interface Props {
  electionId: string;
  position: Position;
  candidates: Candidate[];
  canEditPositions: boolean; // officer, election still DRAFT
  canManageCandidates: boolean; // officer may review applications (before voting starts)
  applicationsOpen: boolean; // members can apply right now (election approved)
  onDone: (message: string) => void;
}

// One position with its candidates. Every candidate is a member who applied
// (self-nomination); officers approve or reject each application, and can
// remove the position while it is empty and the election is a draft.
export function PositionPanel({
  electionId,
  position: p,
  candidates,
  canEditPositions,
  canManageCandidates,
  applicationsOpen,
  onDone,
}: Props) {
  const actions = useElectionActions(electionId);
  const [rejecting, setRejecting] = useState<Candidate | null>(null);
  const [withdrawing, setWithdrawing] = useState<Candidate | null>(null);
  const approvedCount = candidates.filter((c) => c.status === "APPROVED").length;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve(c: Candidate) {
    setError(null);
    try {
      await actions.decideCandidate.mutateAsync({
        candidateId: c.id,
        decision: "APPROVE",
      });
      onDone(`${c.displayName} approved for ${p.name}.`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <section
      aria-labelledby={`pos-${p.id}`}
      className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`pos-${p.id}`} className="font-bold text-[var(--sevs-navy)]">
            {p.name}{" "}
            <span className="text-sm font-medium text-[var(--sevs-text-muted)]">
              ({candidates.length} candidate{candidates.length === 1 ? "" : "s"}
              )
            </span>
          </h3>
          {p.description && (
            <p className="text-sm text-[var(--sevs-text-muted)]">
              {p.description}
            </p>
          )}
        </div>
        {canEditPositions &&
          (candidates.length === 0 ? (
            <button
              onClick={() => setDeleting(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700"
              aria-label={`Remove position ${p.name}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <span className="shrink-0 text-xs text-[var(--sevs-text-muted)]">
              Has candidates, so it cannot be removed
            </span>
          ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {candidates.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--sevs-text-muted)]">
          {applicationsOpen
            ? "No applications yet. Members can apply for this position until voting opens."
            : "No candidates yet. Members can apply once an administrator approves the election."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--sevs-border)]">
          {candidates.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <CandidateAvatar name={c.displayName} photoUrl={c.photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--sevs-navy)]">
                    {c.displayName}
                  </p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">
                    {c.memberId
                      ? "Applied as a member"
                      : "Added by an officer (entered before member applications were required)"}
                  </p>
                </div>
                <ToneBadge {...CANDIDATE_STATUS[c.status]} />
              </div>
              {c.manifesto && (
                <details className="mt-2 pl-14 text-sm">
                  <summary className="cursor-pointer select-none font-bold text-[var(--sevs-navy)]">
                    Manifesto
                    <span className="sr-only"> of {c.displayName}</span>
                  </summary>
                  <p className="mt-1 whitespace-pre-line text-[var(--sevs-text-body)]">
                    {c.manifesto}
                  </p>
                </details>
              )}
              {canManageCandidates && c.status === "PENDING_REVIEW" && (
                <div className="mt-2 flex flex-wrap gap-2 pl-14">
                  <button
                    onClick={() => approve(c)}
                    disabled={actions.decideCandidate.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Approve<span className="sr-only"> {c.displayName}</span>
                  </button>
                  <button
                    onClick={() => setRejecting(c)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Reject<span className="sr-only"> {c.displayName}</span>
                  </button>
                </div>
              )}
              {canManageCandidates && c.status === "APPROVED" && (
                <div className="mt-2 pl-14">
                  <button
                    onClick={() => setWithdrawing(c)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sevs-border)] px-3 py-1.5 text-sm font-bold text-[var(--sevs-text-body)] hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <UserMinus className="h-4 w-4" aria-hidden="true" />
                    Withdraw<span className="sr-only"> {c.displayName}</span>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {rejecting && (
        <ReasonDialog
          title={`Reject ${rejecting.displayName}?`}
          message="A rejected candidate cannot be approved later."
          label="Reason"
          hint={
            rejecting.memberId
              ? "The member is notified and sees this reason."
              : "Recorded in the audit log."
          }
          required
          tone="danger"
          confirmLabel="Reject"
          isLoading={actions.decideCandidate.isPending}
          error={
            actions.decideCandidate.isError
              ? getApiErrorMessage(actions.decideCandidate.error)
              : null
          }
          onCancel={() => setRejecting(null)}
          onConfirm={async (comment) => {
            await actions.decideCandidate.mutateAsync({
              candidateId: rejecting.id,
              decision: "REJECT",
              comment,
            });
            onDone(`${rejecting.displayName} rejected.`);
            setRejecting(null);
          }}
        />
      )}
            {withdrawing && (
        <ReasonDialog
          title={`Withdraw ${withdrawing.displayName}?`}
          message={
            approvedCount === 1
              ? `${withdrawing.displayName} is the only approved candidate for ${p.name}. Voting cannot open until another candidate is approved for this position.`
              : `${withdrawing.displayName} will be removed from the ballot for ${p.name}. This cannot be undone.`
          }
          label="Reason"
          hint={withdrawing.memberId ? "The member is notified and sees this reason." : "Recorded in the audit log."}
          required
          minLength={10}
          tone="danger"
          confirmLabel="Withdraw"
          isLoading={actions.withdrawCandidate.isPending}
          error={actions.withdrawCandidate.isError ? getApiErrorMessage(actions.withdrawCandidate.error) : null}
          onCancel={() => {
            actions.withdrawCandidate.reset();
            setWithdrawing(null);
          }}
          onConfirm={async (reason) => {
            try {
              await actions.withdrawCandidate.mutateAsync({ candidateId: withdrawing.id, reason });
              onDone(`${withdrawing.displayName} withdrawn from ${p.name}.`);
              setWithdrawing(null);
            } catch {
              // shown in the dialog
            }
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Remove ${p.name}?`}
          message="The position is removed from the ballot."
          confirmLabel="Remove"
          tone="danger"
          isLoading={actions.deletePosition.isPending}
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            try {
              await actions.deletePosition.mutateAsync(p.id);
              onDone(`${p.name} removed.`);
            } catch (err) {
              setError(getApiErrorMessage(err));
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}
    </section>
  );
}
