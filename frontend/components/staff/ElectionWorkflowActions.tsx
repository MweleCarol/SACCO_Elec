"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Send } from "lucide-react";
import type { Election, Position, UserRole } from "@/types/api";
import { useElectionActions } from "@/hooks/useStaffElections";
import { getApiErrorMessage } from "@/services/api/errors";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { ErrorPanel } from "@/components/ui/LoadState";

interface Props {
  election: Election;
  role: UserRole;
  positions: Position[];
  onDone: (message: string) => void;
}

// The one lifecycle step that belongs to the person reading the page:
// officers submit a draft for review; administrators approve it or send it
// back. Later steps (activation, closing, results) come in the next stage.
export function ElectionWorkflowActions({
  election,
  role,
  positions,
  onDone,
}: Props) {
  const actions = useElectionActions(election.id);
  const [dialog, setDialog] = useState<"submit" | "approve" | "return" | null>(
    null,
  );

  if (role === "ELECTION_OFFICER" && election.status === "DRAFT") {
    const ready = positions.length > 0;
    return (
      <div className="mt-4 space-y-3 border-t border-[var(--sevs-border)] pt-4">
        <ul className="space-y-1 text-sm">
          <li className="flex items-start gap-2">
            {ready ? (
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
              {ready
                ? `${positions.length} position${positions.length === 1 ? "" : "s"} on the ballot`
                : "Add at least one position"}
            </span>
          </li>
          <li className="flex items-start gap-2 text-[var(--sevs-text-muted)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Candidates come later: members apply once an administrator
              approves the election.
            </span>
          </li>
        </ul>
        {actions.submitForReview.isError && (
          <ErrorPanel
            message={getApiErrorMessage(actions.submitForReview.error)}
          />
        )}
        <button
          onClick={() => setDialog("submit")}
          disabled={!ready}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Submit for admin review
        </button>
        {dialog === "submit" && (
                    <ConfirmDialog
            title="Submit for admin review?"
            message="An administrator will check the election. Positions cannot be changed after this. Once it is approved, members can apply as candidates."
            confirmLabel="Submit"
            isLoading={actions.submitForReview.isPending}
            onCancel={() => setDialog(null)}
            onConfirm={async () => {
              try {
                await actions.submitForReview.mutateAsync();
                onDone("Submitted for an administrator's review.");
              } finally {
                setDialog(null);
              }
            }}
          />
        )}
      </div>
    );
  }

  if (
    role === "ELECTION_ADMINISTRATOR" &&
    election.status === "PENDING_APPROVAL"
  ) {
    return (
      <div className="mt-4 space-y-3 border-t border-[var(--sevs-border)] pt-4">
        <p className="text-sm text-[var(--sevs-text-body)]">
          Check the dates, positions and candidates below. Approving makes the
          election visible to members, who can then nominate themselves.
        </p>
        {actions.review.isError && !dialog && (
          <ErrorPanel message={getApiErrorMessage(actions.review.error)} />
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setDialog("approve")}
            className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
          >
            Approve election
          </button>
          <button
            onClick={() => setDialog("return")}
            className="rounded-lg border border-[var(--sevs-border)] px-4 py-2.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
          >
            Send back to draft
          </button>
        </div>
        {dialog === "approve" && (
          <ReasonDialog
            title="Approve this election?"
            message="Members will be able to see it and nominate themselves. Opening voting still needs separate approvals later."
            label="Comment"
            hint="The officer who prepared it is notified. Also recorded in the audit log."
            confirmLabel="Approve"
            isLoading={actions.review.isPending}
            error={
              actions.review.isError
                ? getApiErrorMessage(actions.review.error)
                : null
            }
            onCancel={() => setDialog(null)}
            onConfirm={async (comment) => {
              await actions.review.mutateAsync({
                decision: "APPROVE",
                comment: comment || undefined,
              });
              setDialog(null);
              onDone("Election approved. Members can now see it.");
            }}
          />
        )}
        {dialog === "return" && (
          <ReasonDialog
            title="Send back to draft?"
            message="The election returns to the officer to fix. Say what needs changing."
            label="What needs changing"
            hint="The officer who prepared it is notified with this note. Also recorded in the audit log."
            required
            confirmLabel="Send back"
            isLoading={actions.review.isPending}
            error={
              actions.review.isError
                ? getApiErrorMessage(actions.review.error)
                : null
            }
            onCancel={() => setDialog(null)}
            onConfirm={async (comment) => {
              await actions.review.mutateAsync({ decision: "REJECT", comment });
              setDialog(null);
              onDone("Sent back to draft.");
            }}
          />
        )}
      </div>
    );
  }

  return null;
}
