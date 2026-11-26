"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import type { ApprovalRequest, UserRole } from "@/types/api";
import { useElectionActions } from "@/hooks/useStaffElections";
import { formatDateTime } from "@/lib/electionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { ReasonDialog } from "@/components/ui/ReasonDialog";

const WHAT: Record<string, string> = {
  ELECTION_ACTIVATION: "Open voting",
  ELECTION_CANCELLATION: "Cancel the election",
  ELECTION_RESCHEDULE: "Change the voting dates",
  RESULT_PUBLICATION: "Publish the results",
};

interface Props {
  request: ApprovalRequest;
  electionId: string;
  role: UserRole;
  userId: string;
  onDone: (message: string) => void;
}

// A pending request on this election, with its progress. Officers and
// administrators other than the requester can approve or reject it here (the
// Approvals page lists every request). Any rejection stops the request.
export function PendingRequestCard({
  request: r,
  electionId,
  role,
  userId,
  onDone,
}: Props) {
  const actions = useElectionActions(electionId);
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  // Remembers this user's decision so the buttons disappear straight away.
  // (After a page reload the server still refuses a second decision.)
  const [decided, setDecided] = useState(false);
  const mine = r.requestedById === userId;
  const canDecide =
    !mine && (role === "ELECTION_OFFICER" || role === "ELECTION_ADMINISTRATOR");
  const remaining = Math.max(r.requiredApprovals - r.approveCount, 0);
  const what = WHAT[r.actionType] ?? "Request";

  async function decide(decision: "APPROVE" | "REJECT", comment: string) {
    const result = await actions.decideRequest.mutateAsync({
      requestId: r.id,
      decision,
      comment: comment || undefined,
    });
    setDialog(null);
    setDecided(true);
    if (decision === "REJECT")
      onDone(
        `You rejected the request to ${what.toLowerCase()}. It is now closed.`,
      );
    else if (result.status === "EXECUTED")
      onDone(
        `Approved. Enough approvals were reached: ${what.toLowerCase()} is done.`,
      );
    else
      onDone(
        `Your approval was recorded (${result.approveCount} of ${result.requiredApprovals}).`,
      );
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Waiting for approval: {what}
        </p>
        <p className="text-xs text-amber-900">
          Expires {formatDateTime(r.expiresAt)}
        </p>
      </div>

      <p className="mt-2 text-sm text-amber-950">
        <strong>
          {r.approveCount} of {r.requiredApprovals}
        </strong>{" "}
        approvals
      </p>
      <div
        role="progressbar"
        aria-label={`${what}: approvals`}
        aria-valuemin={0}
        aria-valuemax={r.requiredApprovals}
        aria-valuenow={r.approveCount}
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white"
      >
        <div
          className="h-full rounded-full bg-amber-600"
          style={{ width: `${(r.approveCount / r.requiredApprovals) * 100}%` }}
        />
      </div>

      {r.payload && "startDate" in r.payload && (
        <p className="mt-2 text-sm text-amber-950">
          New dates: {formatDateTime(r.payload.startDate)} –{" "}
          {formatDateTime(r.payload.endDate)}
        </p>
      )}
      {r.payload && "reason" in r.payload && (
        <p className="mt-2 text-sm text-amber-950">
          Reason: {r.payload.reason}
        </p>
      )}

      <p className="mt-2 text-sm text-amber-950">
        {decided
          ? `You approved this request. ${Math.max(r.requiredApprovals - r.approveCount, 0)} more approval${r.requiredApprovals - r.approveCount === 1 ? "" : "s"} needed from others.`
          : mine
            ? `You made this request, so you cannot approve it. ${remaining} more approval${remaining === 1 ? "" : "s"} needed from other officers or administrators.`
            : canDecide
              ? "Approve if you have checked it. Any one rejection stops the request."
              : `${remaining} more approval${remaining === 1 ? "" : "s"} needed from officers or administrators.`}
      </p>

      {actions.decideRequest.isError && !dialog && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-red-800"
        >
          {getApiErrorMessage(actions.decideRequest.error)}
        </p>
      )}

      {canDecide && !decided && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setDialog("approve")}
            className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
          >
            Approve
          </button>
          <button
            onClick={() => setDialog("reject")}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            Reject
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
          hint="Recorded in the audit log."
          confirmLabel="Approve"
          isLoading={actions.decideRequest.isPending}
          error={
            actions.decideRequest.isError
              ? getApiErrorMessage(actions.decideRequest.error)
              : null
          }
          onCancel={() => setDialog(null)}
          onConfirm={(c) => decide("APPROVE", c).catch(() => {})}
        />
      )}
      {dialog === "reject" && (
        <ReasonDialog
          title={`Reject: ${what}?`}
          message="One rejection closes the request. The officer would have to ask again."
          label="Reason"
          hint="Recorded in the audit log."
          required
          tone="danger"
          confirmLabel="Reject"
          isLoading={actions.decideRequest.isPending}
          error={
            actions.decideRequest.isError
              ? getApiErrorMessage(actions.decideRequest.error)
              : null
          }
          onCancel={() => setDialog(null)}
          onConfirm={(c) => decide("REJECT", c).catch(() => {})}
        />
      )}
    </div>
  );
}
