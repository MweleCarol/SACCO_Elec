"use client";

// A member nominating themselves. The nomination goes to an election officer
// for review; it only appears to other members once approved.
import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useElection } from "@/hooks/useElections";
import { useMyCandidacies, useNominateSelf, usePositions } from "@/hooks/useCandidacy";
import { formatDateTime, nominationsOpen } from "@/lib/electionStatus";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { ErrorPanel, LoadingCards } from "@/components/ui/LoadState";

const MIN = 50;
const MAX = 5000;

export default function CandidateApplicationPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isMember = user?.role === "MEMBER";

  const election = useElection(electionId);
  const positions = usePositions(electionId);
  const mine = useMyCandidacies(isMember);
  const nominate = useNominateSelf(electionId);

  const [positionId, setPositionId] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [declared, setDeclared] = useState(false);
  const [errors, setErrors] = useState<{ positionId?: string; manifesto?: string; declared?: string }>({});
  const ids = { position: useId(), manifesto: useId(), manifestoHint: useId(), declared: useId() };

  if (user && !isMember) {
    return (
      <Shell title="Stand as a candidate">
        <ErrorPanel message="Only SACCO members can nominate themselves." backHref="/candidates" backLabel="Back to candidates" />
      </Shell>
    );
  }

  if (election.isLoading || positions.isLoading || mine.isLoading) {
    return (
      <Shell title="Stand as a candidate">
        <LoadingCards count={2} label="Loading the nomination form…" />
      </Shell>
    );
  }

  if (election.isError || !election.data) {
    return (
      <Shell title="Stand as a candidate">
        <ErrorPanel message={getApiErrorMessage(election.error, "This election could not be found.")} backHref="/candidates" backLabel="Back to candidates" />
      </Shell>
    );
  }

  const e = election.data;

  if (!nominationsOpen(e)) {
    return (
      <Shell title={e.name}>
        <ErrorPanel message="Nominations for this election are closed." backHref="/candidates" backLabel="Back to candidates" />
      </Shell>
    );
  }

  const existing = (mine.data ?? []).find(
    (c) => c.electionId === e.id && (c.status === "PENDING_REVIEW" || c.status === "APPROVED")
  );
  if (existing) {
    return (
      <Shell title={e.name}>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          <p className="font-medium">
            You have already nominated yourself for {existing.position.name} in this election.
          </p>
          <p className="mt-1">To stand for a different position, withdraw that nomination first.</p>
          <Link href="/my-candidacy" className="mt-3 inline-block font-bold text-[var(--sevs-navy)] hover:underline">
            Go to My Candidacy
          </Link>
        </div>
      </Shell>
    );
  }

  const length = manifesto.trim().length;

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const next: typeof errors = {};
    if (!positionId) next.positionId = "Choose the position you want to stand for.";
    if (length < MIN) next.manifesto = `Your manifesto must be at least ${MIN} characters (it is ${length}).`;
    if (length > MAX) next.manifesto = `Your manifesto must be ${MAX.toLocaleString()} characters or fewer.`;
    if (!declared) next.declared = "Tick the declaration to continue.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Take keyboard and screen-reader users to the first problem.
      const first = next.positionId ? ids.position : next.manifesto ? ids.manifesto : ids.declared;
      document.getElementById(first)?.focus();
      return;
    }
    try {
      await nominate.mutateAsync({ positionId, manifesto: manifesto.trim() });
      router.push("/my-candidacy?submitted=1");
    } catch (err) {
      const fieldErrors = getApiFieldErrors(err);
      if (fieldErrors.length > 0) {
        setErrors(Object.fromEntries(fieldErrors.map((f) => [f.field, f.message])));
      }
    }
  }

  return (
    <Shell title={e.name}>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <p className="flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            An election officer will review your nomination. Members see it only once it is approved. Nominations close
            when voting opens on {formatDateTime(e.startDate)}.
          </span>
        </p>

        <section className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">You</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--sevs-text-muted)]">Name on the ballot</dt>
              <dd className="mt-0.5 font-semibold text-[var(--sevs-navy)]">{user?.fullName}</dd>
            </div>
            <div>
              <dt className="text-[var(--sevs-text-muted)]">Membership number</dt>
              <dd className="mt-0.5 font-semibold text-[var(--sevs-navy)]">{user?.membershipNumber ?? "—"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--sevs-text-muted)]">
            Your name comes from your SACCO record. If it is wrong, contact the SACCO office.
          </p>
        </section>

        <section className="space-y-5 rounded-2xl border border-[var(--sevs-border)] bg-white p-5 sm:p-6">
          <div>
            <label htmlFor={ids.position} className="mb-1 block text-sm font-bold text-[var(--sevs-navy)]">
              Position
            </label>
            <select
              id={ids.position}
              value={positionId}
              onChange={(ev) => setPositionId(ev.target.value)}
              aria-invalid={!!errors.positionId}
              aria-describedby={errors.positionId ? `${ids.position}-err` : undefined}
              className="w-full rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20 aria-[invalid=true]:border-red-500"
            >
              <option value="">Choose a position…</option>
              {(positions.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.positionId && (
              <p id={`${ids.position}-err`} role="alert" className="mt-1 text-sm text-red-700">
                {errors.positionId}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.manifesto} className="mb-1 block text-sm font-bold text-[var(--sevs-navy)]">
              Manifesto
            </label>
            <p id={ids.manifestoHint} className="mb-2 text-xs text-[var(--sevs-text-muted)]">
              What you will do if elected and why members should choose you. Between {MIN} and{" "}
              {MAX.toLocaleString()} characters. Members read this on the ballot.
            </p>
            <textarea
              id={ids.manifesto}
              value={manifesto}
              onChange={(ev) => setManifesto(ev.target.value)}
              rows={8}
              maxLength={MAX}
              aria-invalid={!!errors.manifesto}
              aria-describedby={`${ids.manifestoHint} ${ids.manifesto}-count${errors.manifesto ? ` ${ids.manifesto}-err` : ""}`}
              className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20 aria-[invalid=true]:border-red-500"
            />
            <p id={`${ids.manifesto}-count`} className="mt-1 text-right text-xs text-[var(--sevs-text-muted)]">
              {length < MIN ? `${MIN - length} more characters needed` : `${length.toLocaleString()} / ${MAX.toLocaleString()}`}
            </p>
            {errors.manifesto && (
              <p id={`${ids.manifesto}-err`} role="alert" className="mt-1 text-sm text-red-700">
                {errors.manifesto}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-start gap-3 text-sm text-[var(--sevs-text-body)]">
              <input
                id={ids.declared}
                type="checkbox"
                checked={declared}
                onChange={(ev) => setDeclared(ev.target.checked)}
                aria-invalid={!!errors.declared}
                aria-describedby={errors.declared ? `${ids.declared}-err` : undefined}
                className="mt-0.5 h-4 w-4 accent-[var(--sevs-navy)]"
              />
              I confirm that I meet the SACCO&apos;s requirements for this position and that what I have written is true.
            </label>
            {errors.declared && (
              <p id={`${ids.declared}-err`} role="alert" className="mt-1 text-sm text-red-700">
                {errors.declared}
              </p>
            )}
          </div>
        </section>

        {nominate.isError && getApiFieldErrors(nominate.error).length === 0 && (
          <ErrorPanel message={getApiErrorMessage(nominate.error)} />
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/candidates"
            className="rounded-lg border border-[var(--sevs-border)] px-5 py-2.5 text-center text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
          >
            Cancel
          </Link>
          <div className="sm:w-56">
            <Button type="submit" isLoading={nominate.isPending}>
              Submit nomination
            </Button>
          </div>
        </div>
      </form>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Topbar title="Stand as a candidate" subtitle={title} />
      <main className="mx-auto max-w-2xl p-4 sm:p-8">{children}</main>
    </>
  );
}