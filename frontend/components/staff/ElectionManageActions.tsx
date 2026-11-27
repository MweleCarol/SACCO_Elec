"use client";

import { useState, type FormEvent } from "react";
import { CalendarClock, Ban } from "lucide-react";
import type { ApprovalRequest, Election, UserRole } from "@/types/api";
import { useElectionActions } from "@/hooks/useStaffElections";
import { localInputValue } from "@/lib/dateInput";
import { formatDateTime } from "@/lib/electionStatus";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";
import { FormField } from "@/components/ui/FormField";
import { ReasonDialog } from "@/components/ui/ReasonDialog";

// Changes that need approval once an election has been announced:
// new voting dates (officers) and cancellation (administrators).
// Both happen only before voting starts; after that, the election is closed.
const ANNOUNCED = ["APPROVED", "SCHEDULED"];
const CANCELLABLE = ["DRAFT", "APPROVED", "SCHEDULED"];

interface Props {
  election: Election;
  role: UserRole;
  pending: ApprovalRequest[];
  onDone: (message: string) => void;
}

export function ElectionManageActions({ election: e, role, pending, onDone }: Props) {
  const [mode, setMode] = useState<"idle" | "reschedule" | "cancel">("idle");
  const actions = useElectionActions(e.id);
  const has = (type: ApprovalRequest["actionType"]) => pending.some((r) => r.actionType === type);

  const canReschedule = role === "ELECTION_OFFICER" && ANNOUNCED.includes(e.status) && !has("ELECTION_RESCHEDULE");
  const canCancel = role === "ELECTION_ADMINISTRATOR" && CANCELLABLE.includes(e.status) && !has("ELECTION_CANCELLATION");
  if (!canReschedule && !canCancel) return null;

  const announced = e.approvedAt !== null;

  return (
    <div className="mt-4 border-t border-[var(--sevs-border)] pt-4">
      {mode !== "reschedule" && (
        <div className="flex flex-wrap gap-2">
          {canReschedule && (
            <button
              type="button"
              onClick={() => setMode("reschedule")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" /> Change voting dates
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => setMode("cancel")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
            >
              <Ban className="h-4 w-4" aria-hidden="true" /> Cancel election
            </button>
          )}
        </div>
      )}

      {mode === "reschedule" && (
        <RescheduleForm
          election={e}
          onClose={() => setMode("idle")}
          onSent={(m) => {
            setMode("idle");
            onDone(m);
          }}
        />
      )}

      {mode === "cancel" && (
        <ReasonDialog
          title={`Cancel "${e.name}"?`}
          message={
            announced
              ? `Members can already see this election. Once ${e.requiredApprovals} other officer${e.requiredApprovals === 1 ? "" : "s"} or administrator${e.requiredApprovals === 1 ? "" : "s"} approve, it is cancelled for good and every member is told, with your reason. Applications for it end.`
              : `This draft was never shown to members. Once ${e.requiredApprovals} other officer${e.requiredApprovals === 1 ? "" : "s"} or administrator${e.requiredApprovals === 1 ? "" : "s"} approve, it is cancelled for good.`
          }
          label="Reason"
          hint={announced ? "Members will see this reason." : "Recorded in the audit log."}
          required
          minLength={10}
          tone="danger"
          confirmLabel="Ask to cancel"
          isLoading={actions.requestCancellation.isPending}
          error={actions.requestCancellation.isError ? getApiErrorMessage(actions.requestCancellation.error) : null}
          onCancel={() => {
            actions.requestCancellation.reset();
            setMode("idle");
          }}
          onConfirm={async (reason) => {
            try {
              const r = await actions.requestCancellation.mutateAsync(reason);
              setMode("idle");
              onDone(`Cancellation requested. It needs ${r.requiredApprovals} approval${r.requiredApprovals === 1 ? "" : "s"} from other staff; they have been notified.`);
            } catch {
              // shown in the dialog
            }
          }}
        />
      )}
    </div>
  );
}

type Errors = Partial<Record<"startDate" | "endDate", string>>;

function RescheduleForm({ election: e, onClose, onSent }: { election: Election; onClose: () => void; onSent: (m: string) => void }) {
  const actions = useElectionActions(e.id);
  const [startDate, setStartDate] = useState(localInputValue(new Date(e.startDate)));
  const [endDate, setEndDate] = useState(localInputValue(new Date(e.endDate)));
  const [errors, setErrors] = useState<Errors>({});

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const found: Errors = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!startDate || isNaN(start.getTime())) found.startDate = "Choose when voting opens.";
    else if (start <= new Date()) found.startDate = "Voting must open in the future.";
    if (!endDate || isNaN(end.getTime())) found.endDate = "Choose when voting closes.";
    else if (end <= start) found.endDate = "Voting must close after it opens.";
    // The date fields hold minutes only, so compare to the minute.
    const sameMinute = (a: Date, b: string) => Math.floor(a.getTime() / 60000) === Math.floor(new Date(b).getTime() / 60000);
    if (!found.startDate && !found.endDate && sameMinute(start, e.startDate) && sameMinute(end, e.endDate)) {
      found.startDate = "These are the current dates. Change at least one of them.";
    }
    setErrors(found);
    const first = (["startDate", "endDate"] as const).find((k) => found[k]);
    if (first) {
      document.getElementById(`resched-${first}`)?.focus();
      return;
    }
    try {
      const r = await actions.requestReschedule.mutateAsync({ startDate: start.toISOString(), endDate: end.toISOString() });
      onSent(`New dates requested. They take effect after ${r.requiredApprovals} approval${r.requiredApprovals === 1 ? "" : "s"} from other staff, who have been notified.`);
    } catch (err) {
      const fields = getApiFieldErrors(err);
      if (fields.length) {
        setErrors(Object.fromEntries(fields.map((f) => [f.field, f.message])) as Errors);
        document.getElementById(`resched-${fields[0]!.field}`)?.focus();
      }
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-1">
      <h3 className="text-sm font-bold text-[var(--sevs-navy)]">Change voting dates</h3>
      <p className="mb-3 text-sm text-[var(--sevs-text-muted)]">
        Now: {formatDateTime(e.startDate)} – {formatDateTime(e.endDate)}. The new dates need {e.requiredApprovals} approval
        {e.requiredApprovals === 1 ? "" : "s"} from other staff. Members are told once they are approved.
      </p>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <FormField id="resched-startDate" label="Voting opens" type="datetime-local" value={startDate} onChange={(ev) => setStartDate(ev.target.value)} error={errors.startDate} hint="Your local time" />
        <FormField id="resched-endDate" label="Voting closes" type="datetime-local" value={endDate} onChange={(ev) => setEndDate(ev.target.value)} error={errors.endDate} />
      </div>
      {actions.requestReschedule.isError && getApiFieldErrors(actions.requestReschedule.error).length === 0 && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{getApiErrorMessage(actions.requestReschedule.error)}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <button type="submit" disabled={actions.requestReschedule.isPending} className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)] disabled:opacity-50">
          {actions.requestReschedule.isPending ? "Sending…" : "Ask for approval"}
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}