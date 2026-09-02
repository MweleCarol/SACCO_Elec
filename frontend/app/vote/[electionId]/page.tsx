// app/vote/[electionId]/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { mockElections, getComputedLifecycleStatus } from "@/services/mock/elections";
import { getApprovedCandidatesByElection } from "@/services/mock/candidates";
import { hasVotedInElection, castVote } from "@/services/mock/ballots";

export default function VotePage() {
  const { electionId } = useParams<{ electionId: string }>();
  const router = useRouter();
  const { member, isLoading } = useCurrentMember();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [receiptCode, setReceiptCode] = useState("");

  if (isLoading) return null;

  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">
            Log in
          </a>{" "}
          to vote.
        </p>
      </div>
    );
  }

  const election = mockElections.find((e) => e.id === electionId);

  if (!election) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">Election not found.</p>
      </div>
    );
  }

  if (getComputedLifecycleStatus(election) !== "ACTIVE") {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">This election is not currently open for voting.</p>
      </div>
    );
  }

  if (hasVotedInElection(member.id, election.id) && !submitted) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">You&apos;ve already voted in this election.</p>
      </div>
    );
  }

  // Only positions with at least one approved candidate require a selection.
  const votablePositions = election.positions.filter(
    (p) => getApprovedCandidatesByElection(election.id).filter((c) => c.positionId === p.id).length > 0
  );
  const allPositionsFilled = votablePositions.every((p) => selections[p.id]);

  function handleSelect(positionId: string, candidateId: string) {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  }

  function handleSubmit() {
    if (!election || !member) return;

    setSubmitting(true);
    // castVote deliberately writes two unlinked records (participation vs.
    // anonymous ballot) rather than one combined record — preserves ballot
    // secrecy per SEVS design. Mock only — no real backend/crypto module.
    const receipt = castVote(member.id, election.id, selections);

    setTimeout(() => {
      setReceiptCode(receipt);
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  }

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-[scale-in_0.4s_ease-out]">
          <Check className="h-10 w-10 text-green-600 animate-[check-in_0.5s_ease-out_0.15s_both]" strokeWidth={3} />
        </div>
        <h2 className="mt-6 text-2xl font-extrabold text-[var(--sevs-navy)]">Thank you for voting!</h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--sevs-text-muted)]">
          Your vote in {election.title} has been recorded securely.
        </p>
        <p className="mt-3 font-mono text-xs text-[var(--sevs-text-muted)]">
          Ballot Reference: {receiptCode}
        </p>
        <Button onClick={() => router.push("/my-voting-activity")} className="mt-6 w-auto px-8">
          View My Voting Activity
        </Button>
        <style jsx>{`
          @keyframes scale-in {
            from {
              transform: scale(0);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes check-in {
            from {
              stroke-dasharray: 24;
              stroke-dashoffset: 24;
              opacity: 0;
            }
            to {
              stroke-dasharray: 24;
              stroke-dashoffset: 0;
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Topbar title="Cast Your Vote" subtitle={election.title} />

      <div className="space-y-8 p-8">
        {election.positions.map((position) => {
          const candidates = getApprovedCandidatesByElection(election.id).filter(
            (c) => c.positionId === position.id
          );
          return (
            <div key={position.id}>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
                {position.title}
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {candidates.map((candidate) => {
                  const isSelected = selections[position.id] === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      onClick={() => handleSelect(position.id, candidate.id)}
                      className={`relative rounded-2xl border p-4 text-left shadow-sm transition ${
                        isSelected
                          ? "border-[var(--sevs-navy)] bg-[var(--sevs-navy)]/5"
                          : "border-[var(--sevs-border)] bg-white hover:bg-gray-50"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--sevs-navy)]">
                          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                      <p className="pr-8 font-bold text-[var(--sevs-navy)]">{candidate.name}</p>
                      <p className="mt-1 text-xs text-[var(--sevs-text-muted)]">
                        Membership No. {candidate.membershipNumber}
                      </p>
                    </button>
                  );
                })}
                {candidates.length === 0 && (
                  <p className="text-sm text-[var(--sevs-text-muted)]">No approved candidates for this position.</p>
                )}
              </div>
            </div>
          );
        })}

        <Button onClick={handleSubmit} disabled={!allPositionsFilled || submitting} isLoading={submitting}>
          Submit My Vote
        </Button>
      </div>
    </>
  );
}