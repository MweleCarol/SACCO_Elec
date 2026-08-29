"use client";

import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { CandidateCard } from "@/components/voter/CandidateCard";
import { getMemberVisibleElections } from "@/services/mock/elections";
import { getApprovedCandidatesByElection } from "@/services/mock/candidates";

export default function VoterCandidatesPage() {
  const { member, isLoading } = useCurrentMember();

  if (isLoading) return null;

  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">
            Log in
          </a>{" "}
          to view candidates.
        </p>
      </div>
    );
  }

  const elections = getMemberVisibleElections();

  return (
    <>
      <Topbar title="Candidates" subtitle="Candidates standing in elections you're eligible for" />

      <div className="space-y-10 p-8">
        {elections.length === 0 && (
          <p className="text-sm text-[var(--sevs-text-muted)]">No elections to show candidates for.</p>
        )}

        {elections.map((election) => (
          <div key={election.id}>
            <h2 className="mb-1 text-lg font-bold text-[var(--sevs-navy)]">{election.title}</h2>
            <p className="mb-4 text-sm text-[var(--sevs-text-muted)]">{election.description}</p>

            {election.positions.map((position) => {
              const candidates = getApprovedCandidatesByElection(election.id).filter(
                (c) => c.positionId === position.id
              );

              return (
                <div key={position.id} className="mb-6">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
                    {position.title}
                  </h3>
                  {candidates.length === 0 ? (
                    <p className="text-sm text-[var(--sevs-text-muted)]">
                      No approved candidates for this position yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {candidates.map((candidate) => (
                        <CandidateCard key={candidate.id} candidate={candidate} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}