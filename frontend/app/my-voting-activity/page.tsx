"use client";

import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { VotingActivityRow } from "@/components/voter/VotingActivityRow";
import { getBallotsByMember } from "@/services/mock/ballots";
import { mockElections } from "@/services/mock/elections";

// Page component to display a logged-in member's voting activity, including a list of ballots and their associated elections.
export default function MyVotingActivityPage() {
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
          to view your voting activity.
        </p>
      </div>
    );
  }

  const ballots = getBallotsByMember(member.id).sort(
    (a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime()
  );

  return (
    <>
      <Topbar title="My Voting Activity" subtitle="A record of elections you've participated in" />

      <div className="space-y-4 p-8">
        {ballots.length === 0 && (
          <p className="text-sm text-[var(--sevs-text-muted)]">
            You haven&apos;t voted in any elections yet.
          </p>
        )}
        {ballots.map((ballot) => (
          <VotingActivityRow
            key={ballot.id}
            ballot={ballot}
            election={mockElections.find((e) => e.id === ballot.electionId)}
          />
        ))}
      </div>
    </>
  );
}