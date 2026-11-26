"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, PlayCircle } from "lucide-react";
import type { Candidate, Election, Position } from "@/types/api";
import { useElectionActions } from "@/hooks/useStaffElections";
import { formatDateTime } from "@/lib/electionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorPanel } from "@/components/ui/LoadState";

interface Props {
  election: Election;
  positions: Position[];
  candidates: Candidate[];
  onDone: (message: string) => void;
}

// Officers ask to open voting once the ballot is complete. The checklist uses
// the same rules as the backend, so the button is only enabled when the
// request can succeed, and it says exactly what is missing otherwise.
export function ActivationPanel({
  election: e,
  positions,
  candidates,
  onDone,
}: Props) {
  const actions = useElectionActions(e.id);
  const [confirming, setConfirming] = useState(false);
  const now = new Date();

  const approvedFor = (positionId: string) =>
    candidates.filter(
      (c) => c.positionId === positionId && c.status === "APPROVED",
    ).length;
  const missing = positions.filter((p) => approvedFor(p.id) === 0);
  const awaitingReview = candidates.filter(
    (c) => c.status === "PENDING_REVIEW",
  ).length;
  const ended = new Date(e.endDate) <= now;
  const startPassed = new Date(e.startDate) <= now;
  const ready = positions.length > 0 && missing.length === 0 && !ended;

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--sevs-border)] pt-4">
      <h3 className="text-sm font-bold text-[var(--sevs-navy)]">
        Ready to open voting?
      </h3>
      <ul className="space-y-1 text-sm">
        {positions.map((p) => {
          const n = approvedFor(p.id);
          return (
            <li key={p.id} className="flex items-start gap-2">
              {n > 0 ? (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-green-700"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
              )}
              <span>
                {p.name}:{" "}
                {n > 0
                  ? `${n} approved candidate${n === 1 ? "" : "s"}`
                  : "no approved candidate yet"}
              </span>
            </li>
          );
        })}
        {awaitingReview > 0 && (
          <li className="flex items-start gap-2 text-[var(--sevs-text-muted)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {awaitingReview} application
              {awaitingReview === 1 ? " is" : "s are"} still awaiting review
              below. Anyone not approved before voting opens will not be on the
              ballot.
            </span>
          </li>
        )}
        {ended ? (
          <li className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <span>
              The voting period ended {formatDateTime(e.endDate)}. The election
              must be rescheduled first.
            </span>
          </li>
        ) : startPassed ? (
          <li className="flex items-start gap-2 text-[var(--sevs-text-muted)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              The start time has passed, so voting opens as soon as the request
              is approved.
            </span>
          </li>
        ) : null}
      </ul>

      {actions.requestActivation.isError && (
        <ErrorPanel
          message={getApiErrorMessage(actions.requestActivation.error)}
        />
      )}
      <button
        onClick={() => setConfirming(true)}
        disabled={!ready}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        Request to open voting
      </button>

      {confirming && (
        <ConfirmDialog
          title="Request to open voting?"
          message={`${e.requiredApprovals} other officer${e.requiredApprovals === 1 ? "" : "s"} or administrator${
            e.requiredApprovals === 1 ? "" : "s"
          } must approve. Voting then opens ${startPassed ? "straight away" : formatDateTime(e.startDate)}, and the ballot can no longer change.`}
          confirmLabel="Send request"
          isLoading={actions.requestActivation.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            try {
              await actions.requestActivation.mutateAsync();
              onDone(
                "Request sent. Other officers or administrators can now approve it.",
              );
            } finally {
              setConfirming(false);
            }
          }}
        />
      )}
    </div>
  );
}
