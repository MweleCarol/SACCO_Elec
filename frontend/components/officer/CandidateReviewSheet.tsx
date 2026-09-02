"use client";

import { useState } from "react";
import { X, Check, XCircle, MinusCircle } from "lucide-react";
import type { Candidate } from "@/types/candidate";
import {
  CANDIDATE_CHECKLIST,
  type CheckVerdict,
} from "@/types/candidate-review";
import {
  getOrCreateReview,
  setVerdict,
  setRejectionReason,
  isReviewComplete,
  hasAnyFailure,
} from "@/services/mock/candidate-review";
import { mockElections } from "@/services/mock/elections";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { requestApprovalWithOfficerPreApproved } from "@/services/mock/approvals";
import { rejectCandidate } from "@/services/mock/candidates";

interface CandidateReviewSheetProps {
  candidate: Candidate;
  onClose: () => void;
  onDecided: () => void;
}

const VERDICT_CYCLE: CheckVerdict[] = ["NOT_REVIEWED", "PASS", "FAIL"];

export function CandidateReviewSheet({
  candidate,
  onClose,
  onDecided,
}: CandidateReviewSheetProps) {
  const [, rerender] = useState(0);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState<"APPROVED" | "REJECTED" | null>(
    null,
  );

  const review = getOrCreateReview(candidate.id);
  const election = mockElections.find((e) => e.id === candidate.electionId);
  const position = election?.positions.find(
    (p) => p.id === candidate.positionId,
  );
  const complete = isReviewComplete(candidate.id);
  const anyFailure = hasAnyFailure(candidate.id);

  function cycleVerdict(key: string) {
    const current = review.verdicts[key];
    const next =
      VERDICT_CYCLE[
        (VERDICT_CYCLE.indexOf(current) + 1) % VERDICT_CYCLE.length
      ];
    setVerdict(candidate.id, key, next);
    rerender((n) => n + 1);
  }

  function handleConfirm() {
    if (confirming === "REJECTED") {
      setRejectionReason(candidate.id, reason);
      rejectCandidate(candidate.id); // immediate — rejection needs no DAT co-approval
    } else {
      requestApprovalWithOfficerPreApproved(
        "CANDIDATE_APPROVAL",
        candidate.id,
        `${candidate.name} — ${position?.title ?? "Candidate"}`,
        "Election Officer", // swap for the real signed-in officer's name once available in this component's props
      );
      // candidate.status stays PENDING here — it only becomes APPROVED once
      // an Administrator completes the second DAT stage on the Approvals page.
    }
    setConfirming(null);
    onDecided();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-[var(--sevs-bg)] shadow-xl sm:rounded-l-3xl">
        <div className="flex items-center justify-between border-b border-[var(--sevs-border)] bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-bold text-[var(--sevs-navy)]">
              {candidate.name}
            </h2>
            <p className="text-xs text-[var(--sevs-text-muted)]">
              {position?.title ?? "—"} · {election?.title ?? "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          <p className="text-xs font-semibold text-[var(--sevs-text-muted)]">
            Tap each item to mark Pass / Fail. All items must be reviewed before
            approval.
          </p>

          {CANDIDATE_CHECKLIST.map((item, i) => {
            const verdict = review.verdicts[item.key];
            return (
              <button
                key={item.key}
                onClick={() => cycleVerdict(item.key)}
                className="flex w-full items-start gap-3 rounded-2xl border border-[var(--sevs-border)] bg-white p-4 text-left shadow-sm"
              >
                <span className="mt-0.5 shrink-0">
                  {verdict === "PASS" && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                  {verdict === "FAIL" && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  {verdict === "NOT_REVIEWED" && (
                    <MinusCircle className="h-5 w-5 text-gray-300" />
                  )}
                </span>
                <span className="min-w-0">
                  <p className="text-sm font-bold text-[var(--sevs-navy)]">
                    {i + 1}. {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--sevs-text-muted)]">
                    {item.helpText}
                  </p>
                </span>
              </button>
            );
          })}

          {anyFailure && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <label className="text-xs font-bold uppercase tracking-wide text-red-700">
                Rejection reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain which checks failed and why, for the audit record..."
                className="mt-2 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-[var(--sevs-border)] bg-white p-4 sm:p-5">
          <button
            onClick={() => setConfirming("REJECTED")}
            disabled={!anyFailure}
            className="flex-1 rounded-lg border border-red-200 py-2.5 text-sm font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reject
          </button>
          <button
            onClick={() => setConfirming("APPROVED")}
            disabled={!complete || anyFailure}
            className="flex-1 rounded-lg bg-[var(--sevs-navy)] py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit for Approval
          </button>
        </div>
        {!complete && !anyFailure && (
          <p className="bg-white px-5 pb-4 text-center text-xs text-[var(--sevs-text-muted)]">
            {
              CANDIDATE_CHECKLIST.filter(
                (c) => review.verdicts[c.key] === "NOT_REVIEWED",
              ).length
            }{" "}
            check(s) still pending review.
          </p>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title={
            confirming === "APPROVED"
              ? "Approve this candidate?"
              : "Reject this candidate?"
          }
          message={
            confirming === "APPROVED"
              ? `All 12 checks passed for ${candidate.name}. This records your verification and submits the candidate for Administrator co-approval — you won't need to approve again.`
              : `${candidate.name} will be rejected based on the failed check(s) and reason provided. This decision is recorded in the audit log.`
          }
          confirmLabel={
            confirming === "APPROVED" ? "Submit for Approval" : "Reject"
          }
          tone={confirming === "REJECTED" ? "danger" : "default"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
