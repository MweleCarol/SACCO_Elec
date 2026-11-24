"use client";

// Officers create an election as a DRAFT, with its positions. Candidates are
// added on the election's page, then it goes to an administrator for review.
import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, Plus, Trash2 } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useCreateElection } from "@/hooks/useStaffElections";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/LoadState";

type Errors = Partial<Record<"name" | "startDate" | "endDate" | "requiredApprovals" | "positions", string>>;

// "2026-11-25T09:00" in the officer's own time zone, for datetime-local inputs.
function localInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewElectionPage() {
  const { member, isLoading } = useCurrentMember();
  const router = useRouter();
  const create = useCreateElection();
  const ids = { description: useId(), approvals: useId(), approvalsHint: useId(), positions: useId() };

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [requiredApprovals, setRequiredApprovals] = useState(2);
  const [positions, setPositions] = useState<{ key: number; name: string; description: string }[]>([
    { key: 1, name: "", description: "" },
  ]);
  const [errors, setErrors] = useState<Errors>({});

  if (isLoading) return null;
  if (member?.role !== "ELECTION_OFFICER") {
    return (
      <>
        <Topbar title="New election" subtitle="" />
        <div className="p-4 sm:p-8">
          <ErrorPanel message="Only election officers can create elections." backHref="/elections" />
        </div>
      </>
    );
  }

  const named = positions.filter((p) => p.name.trim());

  function validate(): Errors {
    const e: Errors = {};
    if (name.trim().length < 3) e.name = "Enter a name of at least 3 characters.";
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!start) e.startDate = "Choose when voting opens.";
    else if (start <= new Date()) e.startDate = "Voting must open in the future.";
    if (!end) e.endDate = "Choose when voting closes.";
    else if (start && end <= start) e.endDate = "Voting must close after it opens.";
    if (!(requiredApprovals >= 1 && requiredApprovals <= 10)) e.requiredApprovals = "Choose between 1 and 10.";
    if (named.some((p) => p.name.trim().length < 2)) e.positions = "Each position name needs at least 2 characters.";
    const lower = named.map((p) => p.name.trim().toLowerCase());
    if (new Set(lower).size !== lower.length) e.positions = "Two positions have the same name.";
    return e;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    const first = (["name", "startDate", "endDate", "requiredApprovals", "positions"] as const).find((k) => found[k]);
    if (first) {
      const target = first === "requiredApprovals" ? ids.approvals : first === "positions" ? ids.positions : first;
      document.getElementById(target)?.focus();
      return;
    }
    try {
      const { election, failedPositions } = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        requiredApprovals,
        positions: named.map((p) => ({ name: p.name.trim(), description: p.description.trim() || undefined })),
      });
      const params = new URLSearchParams({ created: "1" });
      if (failedPositions.length) params.set("unsaved", failedPositions.join(", "));
      router.push(`/elections/${election.id}?${params}`);
    } catch (err) {
      const fields = getApiFieldErrors(err);
      if (fields.length) setErrors(Object.fromEntries(fields.map((f) => [f.field, f.message])) as Errors);
    }
  }

  const minDate = localInputValue(new Date(Date.now() + 5 * 60_000));

  return (
    <>
      <Topbar title="New election" subtitle="Saved as a draft. Nothing is visible to members yet." />

      <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
        <Link href="/elections" className="text-sm font-bold text-[var(--sevs-navy)] hover:underline">
          ← All elections
        </Link>

        <section aria-labelledby="details-heading" className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h2 id="details-heading" className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
            Election
          </h2>
          <FormField
            id="name"
            label="Election name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 2027 Annual General Election"
            error={errors.name}
          />
          <div className="mb-3">
            <label htmlFor={ids.description} className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">
              Description <span className="font-normal text-[var(--sevs-text-muted)]">(optional)</span>
            </label>
            <textarea
              id={ids.description}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What members are electing, and why"
              className="w-full rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FormField
              id="startDate"
              label="Voting opens"
              type="datetime-local"
              min={minDate}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={errors.startDate}
              hint="Your local time"
            />
            <FormField
              id="endDate"
              label="Voting closes"
              type="datetime-local"
              min={startDate || minDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={errors.endDate}
              hint="Closes automatically at this time"
            />
          </div>
          <div>
            <label htmlFor={ids.approvals} className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">
              Approvals needed for key actions
            </label>
            <select
              id={ids.approvals}
              value={requiredApprovals}
              onChange={(e) => setRequiredApprovals(Number(e.target.value))}
              aria-describedby={ids.approvalsHint}
              aria-invalid={errors.requiredApprovals ? true : undefined}
              className="w-full rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20 sm:w-40"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p id={ids.approvalsHint} className="mt-1 flex items-start gap-1.5 text-xs text-[var(--sevs-text-muted)]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Opening voting, cancelling, rescheduling and publishing results each need this many approvals from
              other officers or administrators. The person who asks cannot approve their own request. 2 is recommended.
            </p>
            {errors.requiredApprovals && (
              <p role="alert" className="mt-1 text-xs text-red-600">{errors.requiredApprovals}</p>
            )}
          </div>
        </section>

        <section aria-labelledby={ids.positions} className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h2 id={ids.positions} tabIndex={-1} className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)] outline-none">
            Positions
          </h2>
          <p className="mb-4 text-xs text-[var(--sevs-text-muted)]">
            In ballot order. Members choose one candidate per position. You can change positions while the election is a draft.
          </p>
          <ol className="space-y-3">
            {positions.map((p, i) => (
              <li key={p.key} className="rounded-xl border border-[var(--sevs-border)] p-3">
                <div className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-2.5 w-5 shrink-0 text-sm font-bold text-[var(--sevs-text-muted)]">{i + 1}.</span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="sr-only" htmlFor={`pos-name-${p.key}`}>Position {i + 1} name</label>
                    <input
                      id={`pos-name-${p.key}`}
                      value={p.name}
                      onChange={(e) => setPositions((all) => all.map((x) => (x.key === p.key ? { ...x, name: e.target.value } : x)))}
                      placeholder="Position name, e.g. Chairperson"
                      className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20"
                    />
                    <label className="sr-only" htmlFor={`pos-desc-${p.key}`}>Position {i + 1} description (optional)</label>
                    <input
                      id={`pos-desc-${p.key}`}
                      value={p.description}
                      onChange={(e) => setPositions((all) => all.map((x) => (x.key === p.key ? { ...x, description: e.target.value } : x)))}
                      placeholder="Short description (optional)"
                      className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20"
                    />
                  </div>
                  {positions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPositions((all) => all.filter((x) => x.key !== p.key))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove position ${i + 1}${p.name ? ` (${p.name})` : ""}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {errors.positions && <p role="alert" className="mt-2 text-xs text-red-600">{errors.positions}</p>}
          <button
            type="button"
            onClick={() => setPositions((all) => [...all, { key: Date.now(), name: "", description: "" }])}
            className="mt-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add position
          </button>
        </section>

        {create.isError && getApiFieldErrors(create.error).length === 0 && (
          <ErrorPanel message={getApiErrorMessage(create.error)} />
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/elections"
            className="rounded-lg border border-[var(--sevs-border)] px-5 py-2.5 text-center text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
          >
            Cancel
          </Link>
          <div className="sm:w-52">
            <Button type="submit" isLoading={create.isPending}>
              Save as draft
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}