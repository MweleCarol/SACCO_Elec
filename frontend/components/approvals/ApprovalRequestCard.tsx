"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import clsx from "clsx";
import type { ApprovalRequest, UserRole } from "@/types/api";
import { useDecideApproval } from "@/hooks/useApprovals";
import { formatDateTime } from "@/lib/electionStatus";
import { formatRoleLabel } from "@/lib/format";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";
import { ToneBadge } from "@/components/voter/ElectionStatusBadge";
import { ReasonDialog } from "@/components/ui/ReasonDialog";

export const ACTION_LABEL: Record<string, string> = {
  ELECTION_ACTIVATION: "Open voting",
  ELECTION_CANCELLATION: "Cancel the election",
  ELECTION_RESCHEDULE: "Change the voting dates",
  RESULT_PUBLICATION: "Publish the results",
};

const STATUS: Record<ApprovalRequest["status"], { label: string; tone: "amber" | "green" | "red" | "gray" | "blue" }> = {
  PENDING: { label: "Waiting", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
  EXECUTED: { label: "Carried out", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  EXPIRED: { label: "Expired", tone: "gray" },
};

// "in 3 days", "in 5 hours", "in 20 minutes"
function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}

interface Props {
  request: ApprovalRequest;
  role: UserRole;
  userId: string;
  // On the Approvals page the election is named and linked; on the election's
  // own page it is not repeated.
  showElection?: boolean;
  onDone: (message: string) => void;
}

// One approval request: what is asked, by whom, progress towards the number
// of approvals needed, every decision so far with its comment, and the
// reader's own Approve / Reject buttons when they may decide.
// The rule throughout: N approvals from staff other than the requester; any
// single rejection closes the request.
export function ApprovalRequestCard({ request: r, role, userId, showElection = false, onDone }: Props) {
  const decide = useDecideApproval();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const what = ACTION_LABEL[r.actionType] ?? r.actionType.toLowerCase().replace(/_/g, " ");
  const open = r.status === "PENDING";
  const mine = r.requestedById === userId;
  const myDecision = r.decisions?.find((d) => d.approverId === userId);
  const staff = role === "ELECTION_OFFICER" || role === "ELECTION_ADMINISTRATOR";
  const canDecide = open && staff && !mine && !myDecision;
  const remaining = Math.max(r.requiredApprovals - r.approveCount, 0);
  const status = STATUS[r.status];

  async function submit(decision: "APPROVE" | "REJECT", comment: string) {
    try {
      const result = await decide.mutateAsync({ requestId: r.id, decision, comment: comment || undefined });
      setDialog(null);
      if (decision === "REJECT") onDone(`You rejected the request to ${what.toLowerCase()}. It is closed, and the requester has been told your reason.`);
      else if (result.status === "EXECUTED") onDone(`Approved. That was the last approval needed: ${what.toLowerCase()} is done.`);
      else onDone(`Your approval was recorded (${result.approveCount} of ${result.requiredApprovals}).`);
    } catch {
      // shown in the dialog
    }
  }

  const dialogError = decide.isError
    ? getApiFieldErrors(decide.error)[0]?.message ?? getApiErrorMessage(decide.error)
    : null;

  return (
    <article
      aria-labelledby={`req-${r.id}`}
      className={clsx(
        "rounded-2xl border bg-white p-4 shadow-sm sm:p-5",
        open ? "border-amber-200" : "border-[var(--sevs-border)]"
      )}
    >
      {/* What, where, who */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`req-${r.id}`} className="text-base font-bold text-[var(--sevs-navy)]">
            {what}
            {showElection && r.election && (
              <>
                <span className="font-normal text-[var(--sevs-text-muted)]"> · </span>
                <Link href={`/elections/${r.election.id}`} className="underline-offset-2 hover:underline">
                  {r.election.name}
                </Link>
              </>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--sevs-text-muted)]">
            Requested by {mine ? "you" : r.requestedBy ? `${r.requestedBy.fullName} (${formatRoleLabel(r.requestedBy.role)})` : "a staff member"} ·{" "}
            {formatDateTime(r.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ToneBadge label={status.label} tone={status.tone} />
          {open && (
            <span className="flex items-center gap-1 text-xs text-amber-900">
              <Clock className="h-3 w-3" aria-hidden="true" /> Expires {timeLeft(r.expiresAt)}
            </span>
          )}
        </div>
      </div>

      {/* The details being approved */}
      {r.payload && "startDate" in r.payload && (
        <dl className="mt-3 grid gap-1 rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-sm text-[var(--sevs-text-body)] sm:grid-cols-[auto_1fr] sm:gap-x-3">
          {r.payload.previousStartDate && (
            <>
              <dt className="font-semibold">Now</dt>
              <dd>
                <s>{formatDateTime(r.payload.previousStartDate)} – {formatDateTime(r.payload.previousEndDate!)}</s>
              </dd>
            </>
          )}
          <dt className="font-semibold">New dates</dt>
          <dd>{formatDateTime(r.payload.startDate)} – {formatDateTime(r.payload.endDate)}</dd>
        </dl>
      )}
      {r.payload && "reason" in r.payload && (
        <p className="mt-3 rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-sm text-[var(--sevs-text-body)]">
          <span className="font-semibold">Reason given:</span> {r.payload.reason}
        </p>
      )}

      {/* Progress: one segment per approval needed */}
      <div className="mt-3">
        <p className="mb-1 text-sm text-[var(--sevs-text-body)]">
          <strong>{r.approveCount} of {r.requiredApprovals}</strong> approvals
          {r.rejectCount > 0 && <span className="text-red-700"> · rejected</span>}
        </p>
        <div
          role="progressbar"
          aria-label={`${what}: approvals received`}
          aria-valuemin={0}
          aria-valuemax={r.requiredApprovals}
          aria-valuenow={r.approveCount}
          aria-valuetext={`${r.approveCount} of ${r.requiredApprovals} approvals${r.rejectCount ? ", rejected" : ""}`}
          className="flex gap-1"
        >
          {Array.from({ length: r.requiredApprovals }, (_, i) => (
            <span
              key={i}
              className={clsx(
                "h-2 flex-1 rounded-full",
                i < r.approveCount ? "bg-green-600" : r.rejectCount > 0 ? "bg-red-200" : "bg-gray-200"
              )}
            />
          ))}
        </div>
      </div>

      {/* Decisions so far */}
      {r.decisions && r.decisions.length > 0 && (
        <ol aria-label="Decisions" className="mt-3 space-y-2">
          {r.decisions.map((d) => (
            <li key={d.approverId} className="flex items-start gap-2 text-sm">
              {d.decision === "APPROVE" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden="true" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-[var(--sevs-text-body)]">
                  <strong>{d.approverId === userId ? "You" : d.approverName}</strong>{" "}
                  <span className="text-[var(--sevs-text-muted)]">({formatRoleLabel(d.approverRole)})</span>{" "}
                  {d.decision === "APPROVE" ? "approved" : "rejected"}
                  <span className="text-xs text-[var(--sevs-text-muted)]"> · {formatDateTime(d.decidedAt)}</span>
                </p>
                {d.comment && <p className="mt-0.5 break-words text-[var(--sevs-text-muted)]">“{d.comment}”</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* What happens next, for this reader */}
      {open && (
        <p className="mt-3 text-sm text-[var(--sevs-text-body)]">
          {mine
            ? `You made this request, so you cannot decide on it. ${remaining} more approval${remaining === 1 ? "" : "s"} needed from other staff.`
            : myDecision
              ? `You approved this. ${remaining} more approval${remaining === 1 ? "" : "s"} needed from others.`
              : canDecide
                ? "Check the details, then approve or reject. One rejection closes the request."
                : `${remaining} more approval${remaining === 1 ? "" : "s"} needed from officers or administrators.`}
        </p>
      )}
      {r.status === "EXPIRED" && (
        <p className="mt-3 text-sm text-[var(--sevs-text-muted)]">Not enough approvals within 7 days. It can be requested again.</p>
      )}

      {canDecide && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setDialog("approve")}
            className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
          >
            Approve<span className="sr-only">: {what}{r.election ? `, ${r.election.name}` : ""}</span>
          </button>
          <button
            onClick={() => setDialog("reject")}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            Reject<span className="sr-only">: {what}{r.election ? `, ${r.election.name}` : ""}</span>
          </button>
        </div>
      )}

      {dialog === "approve" && (
        <ReasonDialog
          title={`Approve: ${what}?`}
          message={
            r.approveCount + 1 >= r.requiredApprovals
              ? "Yours is the last approval needed, so this happens as soon as you confirm."
              : `${r.requiredApprovals - r.approveCount - 1} more approval(s) will still be needed after yours.`
          }
          label="Comment"
          hint="Optional. Recorded with your decision."
          confirmLabel="Approve"
          isLoading={decide.isPending}
          error={dialogError}
          onCancel={() => {
            decide.reset();
            setDialog(null);
          }}
          onConfirm={(c) => void submit("APPROVE", c)}
        />
      )}
      {dialog === "reject" && (
        <ReasonDialog
          title={`Reject: ${what}?`}
          message="One rejection closes the request for everyone. The requester is told your reason and would have to ask again."
          label="Reason"
          hint="The requester will see this."
          required
          minLength={10}
          tone="danger"
          confirmLabel="Reject"
          isLoading={decide.isPending}
          error={dialogError}
          onCancel={() => {
            decide.reset();
            setDialog(null);
          }}
          onConfirm={(c) => void submit("REJECT", c)}
        />
      )}
    </article>
  );
}