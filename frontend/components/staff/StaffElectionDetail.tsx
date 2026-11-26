"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Plus, Pencil } from "lucide-react";
import type { Position, UserRole } from "@/types/api";
import { useElection } from "@/hooks/useElections";
import { useCandidates, usePositions } from "@/hooks/useCandidacy";
import {
  useElectionActions,
  usePendingApprovals,
} from "@/hooks/useStaffElections";
import { formatDateTime } from "@/lib/electionStatus";
import {
  nextStep,
  staffStage,
  STAFF_STAGE_DISPLAY,
} from "@/lib/staffElectionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { ToneBadge } from "@/components/voter/ElectionStatusBadge";
import { ErrorPanel, LoadingCards } from "@/components/ui/LoadState";
import { ElectionWorkflowActions } from "@/components/staff/ElectionWorkflowActions";
import { PositionPanel } from "@/components/staff/PositionPanel";
import { ActivationPanel } from "@/components/staff/ActivationPanel";
import { PendingRequestCard } from "@/components/staff/PendingRequestCard";
import { EditElectionDetails } from "@/components/staff/EditElectionDetails";

// Candidates can be added and reviewed until voting starts (backend rule).
const CANDIDATE_EDITABLE = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SCHEDULED",
];

// One election as staff see it: status, next step, the action that belongs
// to the reader, positions and every candidate. Auditors get the same page
// with no buttons.
export function StaffElectionDetail({
  id,
  role,
  userId,
}: {
  id: string;
  role: UserRole;
  userId: string;
}) {
  const election = useElection(id);
  const positions = usePositions(id);
  const candidates = useCandidates(id);
  const pending = usePendingApprovals();
  const search = useSearchParams();
  const justCreated = search.get("created") === "1";
  const unsaved = search.get("unsaved");
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (election.isLoading || positions.isLoading || candidates.isLoading) {
    return (
      <>
        <Topbar title="Election" subtitle="Loading…" />
        <div className="p-4 sm:p-8">
          <LoadingCards count={2} />
        </div>
      </>
    );
  }
  const error = election.error ?? positions.error ?? candidates.error;
  if (error || !election.data) {
    return (
      <>
        <Topbar title="Election" subtitle="" />
        <div className="p-4 sm:p-8">
          <ErrorPanel
            message={getApiErrorMessage(
              error,
              "This election could not be found.",
            )}
            backHref="/elections"
          />
        </div>
      </>
    );
  }

  const e = election.data;
  const stage = staffStage(e);
  const requests = pending.data?.get(e.id) ?? [];
  const officer = role === "ELECTION_OFFICER";
  const canEditPositions = officer && e.status === "DRAFT";
  const canManageCandidates = officer && CANDIDATE_EDITABLE.includes(e.status);
  const allPositions = positions.data ?? [];
  const allCandidates = candidates.data ?? [];

  const awaitingActivation = requests.some(
    (r) => r.actionType === "ELECTION_ACTIVATION",
  );
  const showActivation =
    officer &&
    (e.status === "APPROVED" || e.status === "SCHEDULED") &&
    !awaitingActivation;

  return (
    <>
      <Topbar title={e.name} subtitle="Election details" />
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
        <Link
          href="/elections"
          className="text-sm font-bold text-[var(--sevs-navy)] hover:underline"
        >
          ← All elections
        </Link>

        {/* Confirms every action, read out by screen readers too. */}
        <div aria-live="polite">
          {(notice || justCreated) && (
            <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              {notice ??
                "Election saved as a draft. Members cannot see it until an administrator approves it."}
            </p>
          )}
        </div>
        {unsaved && !notice && (
          <ErrorPanel
            message={`These positions could not be saved: ${unsaved}. Add them again below.`}
          />
        )}

        <section
          aria-labelledby="overview"
          className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2
              id="overview"
              className="min-w-0 break-words text-xl font-bold text-[var(--sevs-navy)]"
            >
              {e.name}
            </h2>
            <div className="flex items-center gap-2">
              <ToneBadge {...STAFF_STAGE_DISPLAY[stage]} />
              {officer && e.status === "DRAFT" && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sevs-border)] px-3 py-1.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  details
                </button>
              )}
            </div>
          </div>
          {editing && (
            <EditElectionDetails
              election={e}
              onClose={() => setEditing(false)}
              onSaved={(m) => {
                setEditing(false);
                setNotice(m);
              }}
            />
          )}
          {!editing && e.description && (
            <p className="mt-2 text-sm text-[var(--sevs-text-body)]">
              {e.description}
            </p>
          )}
          {!editing && (
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--sevs-text-muted)]">Voting opens</dt>
                <dd className="font-medium">{formatDateTime(e.startDate)}</dd>
              </div>
              <div>
                <dt className="text-[var(--sevs-text-muted)]">Voting closes</dt>
                <dd className="font-medium">{formatDateTime(e.endDate)}</dd>
              </div>
              <div>
                <dt className="text-[var(--sevs-text-muted)]">
                  Approvals needed for key actions
                </dt>
                <dd className="font-medium">{e.requiredApprovals}</dd>
              </div>
              <div>
                <dt className="text-[var(--sevs-text-muted)]">Created</dt>
                <dd className="font-medium">{formatDateTime(e.createdAt)}</dd>
              </div>
            </dl>
          )}
          <div>
            <dt className="text-[var(--sevs-text-muted)]">Voting opens</dt>
            <dd className="font-medium">{formatDateTime(e.startDate)}</dd>
          </div>
          <div>
            <dt className="text-[var(--sevs-text-muted)]">Voting closes</dt>
            <dd className="font-medium">{formatDateTime(e.endDate)}</dd>
          </div>
          <div>
            <dt className="text-[var(--sevs-text-muted)]">
              Approvals needed for key actions
            </dt>
            <dd className="font-medium">{e.requiredApprovals}</dd>
          </div>
          <div>
            <dt className="text-[var(--sevs-text-muted)]">Created</dt>
            <dd className="font-medium">{formatDateTime(e.createdAt)}</dd>
          </div>

          <p className="mt-4 rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-sm text-[var(--sevs-text-body)]">
            <span className="font-bold">Next: </span>
            {nextStep(e, role, requests)}
          </p>
          <ElectionWorkflowActions
            election={e}
            role={role}
            positions={allPositions}
            onDone={setNotice}
          />
          {showActivation && (
            <ActivationPanel
              election={e}
              positions={allPositions}
              candidates={allCandidates}
              onDone={setNotice}
            />
          )}
          {requests.map((r) => (
            <PendingRequestCard
              key={r.id}
              request={r}
              electionId={e.id}
              role={role}
              userId={userId}
              onDone={setNotice}
            />
          ))}``
        </section>

        <section aria-labelledby="positions-heading">
          <h2
            id="positions-heading"
            className="mb-1 text-lg font-bold text-[var(--sevs-navy)]"
          >
            Positions and candidates
          </h2>
          <p className="mb-3 text-sm text-[var(--sevs-text-muted)]">
            {canEditPositions
              ? "Set up the positions while the election is a draft. Candidates are members who apply after an administrator approves it."
              : canManageCandidates
                ? "Positions are fixed now. Review members' applications below until voting starts."
                : "Ballot order. Candidates in every status are shown."}
          </p>
          {allPositions.length === 0 && (
            <p className="mb-3 rounded-xl bg-white px-4 py-3 text-sm text-[var(--sevs-text-muted)] ring-1 ring-[var(--sevs-border)]">
              No positions yet.
            </p>
          )}
          <div className="space-y-4">
            {allPositions.map((p) => (
              <PositionPanel
                key={p.id}
                electionId={e.id}
                position={p}
                candidates={allCandidates.filter((c) => c.positionId === p.id)}
                canEditPositions={canEditPositions}
                canManageCandidates={canManageCandidates}
                applicationsOpen={
                  e.status === "APPROVED" || e.status === "SCHEDULED"
                }
                onDone={setNotice}
              />
            ))}
          </div>
          {canEditPositions && (
            <AddPositionForm
              electionId={e.id}
              positions={allPositions}
              onAdded={setNotice}
            />
          )}
        </section>
      </div>
    </>
  );
}

function AddPositionForm({
  electionId,
  positions,
  onAdded,
}: {
  electionId: string;
  positions: Position[];
  onAdded: (m: string) => void;
}) {
  const actions = useElectionActions(electionId);
  const ids = { name: useId(), desc: useId(), err: useId() };
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const trimmed = name.trim();
    const problem =
      trimmed.length < 2
        ? "Enter a position name (at least 2 characters)."
        : positions.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
          ? "This election already has a position with that name."
          : null;
    if (problem) {
      setNameError(problem);
      document.getElementById(ids.name)?.focus();
      return;
    }
    try {
      const order =
        positions.reduce((max, p) => Math.max(max, p.order), -1) + 1;
      await actions.addPosition.mutateAsync({
        name: trimmed,
        description: description.trim() || undefined,
        order,
      });
      onAdded(`${trimmed} added to the ballot.`);
      setName("");
      setDescription("");
      setOpen(false);
    } catch {
      // shown below
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--sevs-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Add position
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mt-4 space-y-3 rounded-2xl border border-[var(--sevs-border)] bg-white p-4"
    >
      <p className="text-sm font-bold text-[var(--sevs-navy)]">New position</p>
      <div>
        <label
          htmlFor={ids.name}
          className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]"
        >
          Position name
        </label>
        <input
          id={ids.name}
          value={name}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
          }}
          placeholder="e.g. Vice Chairperson"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? ids.err : undefined}
          className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20"
        />
        {nameError && (
          <p id={ids.err} role="alert" className="mt-1 text-xs text-red-700">
            {nameError}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor={ids.desc}
          className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]"
        >
          Description{" "}
          <span className="font-normal text-[var(--sevs-text-muted)]">
            (optional)
          </span>
        </label>
        <input
          id={ids.desc}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20"
        />
      </div>
      {actions.addPosition.isError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {getApiErrorMessage(actions.addPosition.error)}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={actions.addPosition.isPending}
          className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)] disabled:opacity-50"
        >
          {actions.addPosition.isPending ? "Saving…" : "Add position"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
