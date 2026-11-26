"use client";

import { useId, useState, type FormEvent } from "react";
import type { Election } from "@/types/api";
import { useElectionActions } from "@/hooks/useStaffElections";
import { localInputValue } from "@/lib/dateInput";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";
import { FormField } from "@/components/ui/FormField";

type Errors = Partial<Record<"name" | "startDate" | "endDate", string>>;

// Officers correct a draft's name, description, dates or approval count.
// Only changed fields are sent. After approval, dates change through
// "Reschedule" instead, which needs approvals.
export function EditElectionDetails({
  election: e,
  onClose,
  onSaved,
}: {
  election: Election;
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const actions = useElectionActions(e.id);
  const ids = { description: useId(), approvals: useId() };
  const [name, setName] = useState(e.name);
  const [description, setDescription] = useState(e.description ?? "");
  const [startDate, setStartDate] = useState(
    localInputValue(new Date(e.startDate)),
  );
  const [endDate, setEndDate] = useState(localInputValue(new Date(e.endDate)));
  const [requiredApprovals, setRequiredApprovals] = useState(
    e.requiredApprovals,
  );
  const [errors, setErrors] = useState<Errors>({});

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const found: Errors = {};
    if (name.trim().length < 3)
      found.name = "Enter a name of at least 3 characters.";
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!startDate || isNaN(start.getTime()))
      found.startDate = "Choose when voting opens.";
    else if (start <= new Date())
      found.startDate = "Voting must open in the future.";
    if (!endDate || isNaN(end.getTime()))
      found.endDate = "Choose when voting closes.";
    else if (end <= start) found.endDate = "Voting must close after it opens.";
    setErrors(found);
    const first = (["name", "startDate", "endDate"] as const).find(
      (k) => found[k],
    );
    if (first) {
      document.getElementById(`edit-${first}`)?.focus();
      return;
    }

    const changes: Parameters<typeof actions.updateDetails.mutateAsync>[0] = {};
    if (name.trim() !== e.name) changes.name = name.trim();
    if (description.trim() !== (e.description ?? ""))
      changes.description = description.trim();
    if (start.getTime() !== new Date(e.startDate).getTime())
      changes.startDate = start.toISOString();
    if (end.getTime() !== new Date(e.endDate).getTime())
      changes.endDate = end.toISOString();
    if (requiredApprovals !== e.requiredApprovals)
      changes.requiredApprovals = requiredApprovals;
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    try {
      await actions.updateDetails.mutateAsync(changes);
      onSaved("Election details saved.");
    } catch (err) {
      const fields = getApiFieldErrors(err);
      if (fields.length)
        setErrors(
          Object.fromEntries(fields.map((f) => [f.field, f.message])) as Errors,
        );
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mt-4 space-y-1 border-t border-[var(--sevs-border)] pt-4"
    >
      <h3 className="mb-3 text-sm font-bold text-[var(--sevs-navy)]">
        Edit details
      </h3>
      <FormField
        id="edit-name"
        label="Election name"
        value={name}
        onChange={(ev) => setName(ev.target.value)}
        error={errors.name}
      />
      <div className="mb-3">
        <label
          htmlFor={ids.description}
          className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]"
        >
          Description{" "}
          <span className="font-normal text-[var(--sevs-text-muted)]">
            (optional)
          </span>
        </label>
        <textarea
          id={ids.description}
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20"
        />
      </div>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <FormField
          id="edit-startDate"
          label="Voting opens"
          type="datetime-local"
          value={startDate}
          onChange={(ev) => setStartDate(ev.target.value)}
          error={errors.startDate}
          hint="Your local time"
        />
        <FormField
          id="edit-endDate"
          label="Voting closes"
          type="datetime-local"
          value={endDate}
          onChange={(ev) => setEndDate(ev.target.value)}
          error={errors.endDate}
        />
      </div>
      <div className="mb-3">
        <label
          htmlFor={ids.approvals}
          className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]"
        >
          Approvals needed for key actions
        </label>
        <select
          id={ids.approvals}
          value={requiredApprovals}
          onChange={(ev) => setRequiredApprovals(Number(ev.target.value))}
          className="w-full rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2.5 text-sm sm:w-40"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {actions.updateDetails.isError &&
        getApiFieldErrors(actions.updateDetails.error).length === 0 && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {getApiErrorMessage(actions.updateDetails.error)}
          </p>
        )}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={actions.updateDetails.isPending}
          className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)] disabled:opacity-50"
        >
          {actions.updateDetails.isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
