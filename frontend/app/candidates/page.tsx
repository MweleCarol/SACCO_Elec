"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Users2, XCircle } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { CandidateManagementRow } from "@/components/officer/CandidateManagementRow";
import { CandidateManagementTable } from "@/components/officer/CandidateManagementTable";
import { OfficerCandidateDetailPanel } from "@/components/officer/OfficerCandidateDetailPanel";
import { MemberCandidatesView } from "@/components/voter/MemberCandidatesView";
import { mockElections } from "@/services/mock/elections";
import { mockCandidates } from "@/services/mock/candidates";
import type { Candidate } from "@/types/candidate";



function OfficerCandidatesView() {
  const [electionId, setElectionId] = useState(mockElections[0]?.id ?? "");
  const [positionId, setPositionId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [, forceRerender] = useState(0);

  const election =
    mockElections.find((e) => e.id === electionId) ?? mockElections[0];
  const electionCandidates = election
    ? mockCandidates.filter((c) => c.electionId === election.id)
    : [];

  const totalCandidates = electionCandidates.length;
  const approvedCount = electionCandidates.filter(
    (c) => c.status === "APPROVED",
  ).length;
  const pendingCount = electionCandidates.filter(
    (c) => c.status === "PENDING",
  ).length;
  const rejectedCount = electionCandidates.filter(
    (c) => c.status === "REJECTED",
  ).length;

  const results = electionCandidates.filter((c) => {
    const matchesQuery =
      !query || c.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    const matchesPosition = !positionId || c.positionId === positionId;
    return matchesQuery && matchesStatus && matchesPosition;
  });

  return (
    <>
      <Topbar
        title="Candidates"
        subtitle="Review and manage candidate registrations"
      />
      <div className="space-y-5 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Candidates"
            value={totalCandidates}
            icon={<Users2 className="h-4 w-4" />}
            iconTone="navy"
          />
          <StatCard
            label="Approved"
            value={approvedCount}
            icon={<CheckCircle2 className="h-4 w-4" />}
            iconTone="green"
          />
          <StatCard
            label="Pending Review"
            value={pendingCount}
            icon={<Clock className="h-4 w-4" />}
            iconTone="amber"
          />
          <StatCard
            label="Rejected"
            value={rejectedCount}
            icon={<XCircle className="h-4 w-4" />}
            iconTone="red"
          />
        </div>

        {mockElections.length > 1 && (
          <select
            value={electionId}
            onChange={(e) => {
              setElectionId(e.target.value);
              setPositionId("");
              setSelected(null);
            }}
            className="rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
          >
            {mockElections.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            className="rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
          >
            <option value="">All Positions</option>
            {election?.positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
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
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidate..."
            className="flex-1 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
          />
        </div>

        <div className="flex gap-5">
          <div className="min-w-0 flex-1 space-y-3">
            <CandidateManagementTable
              candidates={results}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
            <div className="space-y-3 sm:hidden">
              {results.length === 0 && (
                <p className="text-sm text-[var(--sevs-text-muted)]">
                  No candidates match.
                </p>
              )}
              {results.map((c) => (
                <CandidateManagementRow
                  key={c.id}
                  candidate={c}
                  onDecided={() => forceRerender((n) => n + 1)}
                />
              ))}
            </div>
          </div>
          {selected && (
            <OfficerCandidateDetailPanel
              candidate={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function VoterCandidatesPage() {
  const { member, isLoading } = useCurrentMember();

  if (isLoading) return null;

  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a
            href="/login"
            className="font-bold text-[var(--sevs-navy)] hover:underline"
          >
            Log in
          </a>{" "}
          to view candidates.
        </p>
      </div>
    );
  }

  const isOfficerOrAdmin =
    member.role === "ELECTION_OFFICER" || member.role === "ELECTION_ADMINISTRATOR";

  return isOfficerOrAdmin ? (
    <OfficerCandidatesView />
  ) : (
    <MemberCandidatesView />
  );
}
