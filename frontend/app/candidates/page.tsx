"use client";

import { useState } from "react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { CandidateCard } from "@/components/voter/CandidateCard";
import { getMemberVisibleElections } from "@/services/mock/elections";
import { getApprovedCandidatesByElection } from "@/services/mock/candidates";
import { mockCandidates } from "@/services/mock/candidates";
import { CandidateManagementRow } from "@/components/officer/CandidateManagementRow";

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

  const isOfficerOrAdmin = member.role === "ELECTION_OFFICER" || member.role === "ADMINISTRATOR";

  if (isOfficerOrAdmin) {
    return <OfficerCandidatesView />;
  }
}
  const elections = getMemberVisibleElections();

  function OfficerCandidatesView() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [, forceRerender] = useState(0);

  const results = mockCandidates.filter((c) => {
    const matchesQuery = !query || c.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <>
      <Topbar title="Candidates" subtitle="Review and manage candidate registrations" />
      <div className="space-y-5 p-4 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidate..."
            className="flex-1 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>
        <div className="space-y-3">
          {results.length === 0 && <p className="text-sm text-[var(--sevs-text-muted)]">No candidates match.</p>}
          {results.map((c) => (
            <CandidateManagementRow key={c.id} candidate={c} onDecided={() => forceRerender((n) => n + 1)} />
          ))}
        </div>
      </div>
    </>
  );
}