"use client";

// The ballot. Three steps so a vote is never cast by accident:
//   1. choose  - one candidate per position
//   2. review  - every choice listed, each with "Change", then "Cast my vote"
//   3. done    - confirmation with the time (no reference code: nothing may
//                link a member to their choices, see API_CONTRACT.md)
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useElection, useParticipation } from "@/hooks/useElections";
import { useBallot, useCastVote } from "@/hooks/useBallot";
import { getApiErrorMessage, getApiStatus } from "@/services/api/errors";
import { formatDateTime, memberPhase, timeUntil } from "@/lib/electionStatus";
import { Topbar } from "@/components/layout/Topbar";
import { BallotPositionGroup } from "@/components/voter/BallotPositionGroup";
import { CandidateAvatar } from "@/components/voter/CandidateAvatar";
import { ErrorPanel, LoadingCards } from "@/components/ui/LoadState";
import { Button } from "@/components/ui/button";

type Step = "choose" | "review" | "done";

export default function VotePage() {
  const { electionId } = useParams<{ electionId: string }>();
  const { member } = useCurrentMember();
  const isMember = member?.role === "MEMBER";

  const election = useElection(electionId);
  const participation = useParticipation(electionId, isMember);
  const alreadyVoted = participation.data?.hasVoted === true;
  const ballot = useBallot(electionId, isMember && participation.isSuccess && !alreadyVoted);
  const castVote = useCastVote(electionId);

  const [step, setStep] = useState<Step>("choose");
  const [selections, setSelections] = useState<Record<string, string>>({}); // positionId -> candidateId
  const [votedAt, setVotedAt] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const positions = ballot.data?.positions ?? [];
  const votable = useMemo(() => positions.filter((p) => p.candidates.length > 0), [positions]);
  const chosenCount = votable.filter((p) => selections[p.id]).length;
  const allChosen = votable.length > 0 && chosenCount === votable.length;

  // Move focus to the new heading when the step changes, so keyboard and
  // screen-reader users start at the top of the new content.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // Warn before leaving with an unfinished ballot.
  useEffect(() => {
    if (step === "done" || chosenCount === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [step, chosenCount]);

  function goToFirstMissing() {
    const missing = votable.find((p) => !selections[p.id]);
    if (missing) document.getElementById(`position-${missing.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changePosition(positionId: string) {
    setStep("choose");
    // Wait for the ballot to render again, then take the member to that position.
    setTimeout(() => {
      const el = document.getElementById(`position-${positionId}`);
      el?.scrollIntoView({ block: "start" });
      el?.querySelector<HTMLInputElement>("input:checked")?.focus();
    }, 0);
  }

  async function submit() {
    try {
      const result = await castVote.mutateAsync(
        votable.map((p) => ({ positionId: p.id, candidateId: selections[p.id]! }))
      );
      setVotedAt(result.votedAt);
      setStep("done");
    } catch {
      // The message is shown from castVote.error below.
    }
  }

  // ---------- states before the ballot ----------

  const title = election.data?.name ?? "Ballot";

  if (member && !isMember) {
    return (
      <Page title={title} headingRef={headingRef} heading="Voting is for SACCO members">
        <p className="text-sm text-[var(--sevs-text-muted)]">Officers, administrators and auditors cannot vote.</p>
      </Page>
    );
  }

  if (election.isLoading || participation.isLoading || ballot.isLoading) {
    return (
      <Page title={title} headingRef={headingRef} heading="Loading your ballot…">
        <LoadingCards count={2} label="Loading your ballot…" />
      </Page>
    );
  }

  if (election.isError) {
    return (
      <Page title="Ballot" headingRef={headingRef} heading="Election not found">
        <ErrorPanel message={getApiErrorMessage(election.error)} backHref="/elections" />
      </Page>
    );
  }

  if (step !== "done" && alreadyVoted) {
    return (
      <Page title={title} headingRef={headingRef} heading="You have already voted">
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
          <div className="text-sm text-green-900">
            <p className="font-medium">
              Your vote in this election was recorded
              {participation.data?.votedAt ? ` on ${formatDateTime(participation.data.votedAt)}` : ""}.
            </p>
            <p className="mt-1">Each member votes once, and a vote cannot be changed.</p>
            <Link href="/elections" className="mt-3 inline-block font-bold text-[var(--sevs-navy)] hover:underline">
              Back to elections
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  if (ballot.isError) {
    // 403: not open, or the member's SACCO membership is not active.
    const closed = election.data && memberPhase(election.data) !== "OPEN";
    return (
      <Page title={title} headingRef={headingRef} heading={closed ? "Voting is not open" : "You cannot vote in this election"}>
        <ErrorPanel
          message={
            closed && election.data
              ? memberPhase(election.data) === "UPCOMING"
                ? `Voting opens ${formatDateTime(election.data.startDate)} (${timeUntil(election.data.startDate)}).`
                : "Voting for this election has closed."
              : getApiErrorMessage(ballot.error)
          }
          backHref="/elections"
        />
      </Page>
    );
  }

  // ---------- step 3: done ----------

  if (step === "done") {
    return (
      <Page title={title} headingRef={headingRef} heading="Your vote has been recorded">
        <div role="status" className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
          <p className="mt-3 text-base font-bold text-green-900">Thank you for voting.</p>
          {votedAt && <p className="mt-1 text-sm text-green-800">Recorded on {formatDateTime(votedAt)}.</p>}
          <p className="mx-auto mt-4 max-w-md text-sm text-green-900">
            Your choices are stored separately from your name, so no one, including SACCO officials, can see how
            you voted. Results will be shared once they are approved and published.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-block rounded-lg bg-[var(--sevs-navy)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
          >
            Back to dashboard
          </Link>
        </div>
      </Page>
    );
  }

  const submitError = castVote.isError ? getApiErrorMessage(castVote.error) : null;
  const submitStatus = castVote.isError ? getApiStatus(castVote.error) : undefined;

  // ---------- step 2: review ----------

  if (step === "review") {
    return (
      <Page title={title} headingRef={headingRef} heading="Review your choices">
        <p className="mb-4 text-sm text-[var(--sevs-text-muted)]">
          Check each choice. You can change any of them now. <strong>Once you cast your vote it cannot be changed.</strong>
        </p>

        <ul className="divide-y divide-[var(--sevs-border)] rounded-2xl border border-[var(--sevs-border)] bg-white">
          {votable.map((p) => {
            const chosen = p.candidates.find((c) => c.id === selections[p.id])!;
            return (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <CandidateAvatar name={chosen.displayName} photoUrl={chosen.photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sevs-text-muted)]">{p.name}</p>
                  <p className="font-bold text-[var(--sevs-navy)]">{chosen.displayName}</p>
                </div>
                <button
                  onClick={() => changePosition(p.id)}
                  disabled={castVote.isPending}
                  className="rounded-lg border border-[var(--sevs-border)] px-3 py-1.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50 disabled:opacity-50"
                >
                  Change<span className="sr-only"> {p.name}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {submitError && (
          <div className="mt-4">
            <ErrorPanel
              message={submitStatus === 409 && /already/i.test(submitError) ? "You have already voted in this election." : submitError}
              backHref={submitStatus === 403 || submitStatus === 409 ? "/elections" : undefined}
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={() => setStep("choose")}
            disabled={castVote.isPending}
            className="rounded-lg border border-[var(--sevs-border)] px-5 py-2.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50 disabled:opacity-50"
          >
            Back to ballot
          </button>
          <div className="sm:w-56">
            <Button onClick={submit} isLoading={castVote.isPending} className="inline-flex items-center justify-center">
              <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
              Cast my vote
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  // ---------- step 1: choose ----------

  return (
    <Page title={title} headingRef={headingRef} heading="Choose your candidates">
      {election.data && (
        <p className="mb-6 flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Choose one candidate for each position, then review before casting. Your vote is secret.
            Voting closes {formatDateTime(election.data.endDate)} ({timeUntil(election.data.endDate)}).
          </span>
        </p>
      )}

      <div className="space-y-8 pb-28">
        {positions.map((p) => (
          <BallotPositionGroup
            key={p.id}
            position={p}
            selectedId={selections[p.id]}
            onSelect={(candidateId) => setSelections((s) => ({ ...s, [p.id]: candidateId }))}
          />
        ))}
      </div>

      {/* Sticky footer: progress says why the button is not ready yet. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--sevs-border)] bg-white/95 px-4 py-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <p aria-live="polite" className="text-sm text-[var(--sevs-text-muted)]">
            <span className="font-bold text-[var(--sevs-navy)]">
              {chosenCount} of {votable.length}
            </span>{" "}
            positions chosen
            {!allChosen && votable.length > 0 && (
              <button onClick={goToFirstMissing} className="ml-2 font-bold text-[var(--sevs-navy)] underline">
                Show next
              </button>
            )}
          </p>
          <div className="w-44 shrink-0">
            <Button onClick={() => setStep("review")} disabled={!allChosen}>
              Review my choices
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
}

function Page({
  title,
  heading,
  headingRef,
  children,
}: {
  title: string;
  heading: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  return (
    <>
      <Topbar title={title} subtitle="Secret ballot" />
      <main className="mx-auto max-w-4xl p-4 sm:p-8">
        <h2 ref={headingRef} tabIndex={-1} className="mb-4 text-xl font-bold text-[var(--sevs-navy)] outline-none">
          {heading}
        </h2>
        {children}
      </main>
    </>
  );
}