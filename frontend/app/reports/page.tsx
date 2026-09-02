"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ElectionSelect } from "@/components/reports/ElectionSelect";
import { ParticipationChart } from "@/components/reports/ParticipationChart";
import { CandidatesByStatusChart } from "@/components/reports/CandidatesByStatusChart";
import { VotingActivityLineChart } from "@/components/reports/VotingActivityLineChart";
import { DatApprovalStatusChart } from "@/components/reports/DatApprovalStatusChart";
import { RiskEventsLineChart } from "@/components/reports/RiskEventsLineChart";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { mockElections } from "@/services/mock/elections";
import {
  getElectionReportData,
  getCandidateReportData,
  getVotingActivityOverTime,
  getDatApprovalStatusCounts,
  getRiskEventsOverTime,
} from "@/services/mock/reports";
import { getElectionActivityTimeline } from "@/services/mock/audit-logs";
import { Vote, Users2, CheckSquare, TrendingUp } from "lucide-react";

type TabKey = "ELECTION" | "CANDIDATES" | "PARTICIPATION" | "APPROVALS" | "ACTIVITY";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ELECTION", label: "Election" },
  { key: "CANDIDATES", label: "Candidates" },
  { key: "PARTICIPATION", label: "Participation" },
  { key: "APPROVALS", label: "Approvals" },
  { key: "ACTIVITY", label: "Activity" },
];

export default function ReportsPage() {
  const { member, isLoading } = useCurrentMember();
  const [electionId, setElectionId] = useState(mockElections[0]?.id ?? "");
  const [tab, setTab] = useState<TabKey>("ELECTION");

  if (isLoading) return null;
  if (!member || !["ELECTION_OFFICER", "ADMINISTRATOR", "AUDITOR"].includes(member.role)) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const election = mockElections.find((e) => e.id === electionId);
  if (!election) return null;

  const electionData = getElectionReportData(election);
  const candidateData = getCandidateReportData(election.id);
  const timeline = getElectionActivityTimeline(election.id);
  const votingActivity = getVotingActivityOverTime(election.id);
  const datStatusCounts = getDatApprovalStatusCounts();
  const riskEvents = getRiskEventsOverTime();

  return (
    <>
      <Topbar title="Reports" subtitle="Election and administrative summaries" />

      <div className="space-y-6 p-4 sm:p-8">
        <ElectionSelect value={electionId} onChange={setElectionId} />

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-bold transition ${
                tab === key
                  ? "border-[var(--sevs-navy)] bg-[var(--sevs-navy)] text-white"
                  : "border-[var(--sevs-border)] bg-white text-[var(--sevs-text-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "ELECTION" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Positions" value={electionData.positions} icon={<Vote className="h-4 w-4 text-[var(--sevs-navy)]" />} />
              <StatCard label="Candidates" value={electionData.candidateCount} icon={<Users2 className="h-4 w-4 text-[var(--sevs-navy)]" />} />
              <StatCard label="Eligible Voters" value={electionData.eligibleVoters.toLocaleString()} icon={<CheckSquare className="h-4 w-4 text-[var(--sevs-navy)]" />} />
              <StatCard label="Turnout" value={`${electionData.turnout}%`} icon={<TrendingUp className="h-4 w-4 text-[var(--sevs-navy)]" />} />
            </div>
            <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
                {election.title}
              </h3>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">Status</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{electionData.status}</dd></div>
                <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">Completion</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{electionData.isComplete ? "Complete" : "In progress"}</dd></div>
                <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">Start Date</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{new Date(electionData.startDate).toLocaleDateString()}</dd></div>
                <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">End Date</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{new Date(electionData.endDate).toLocaleDateString()}</dd></div>
                <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">Votes Cast</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{electionData.votesCast.toLocaleString()}</dd></div>
              </dl>
            </div>
          </div>
        )}

        {tab === "CANDIDATES" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {candidateData.byStatus.map((s) => (
                <StatCard key={s.status} label={s.status} value={s.count} />
              ))}
            </div>
            <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Candidates by Status</h3>
              <CandidatesByStatusChart data={candidateData.byStatus} />
            </div>
            <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Candidates by Position</h3>
              <div className="space-y-3">
                {candidateData.byPosition.map((p) => (
                  <div key={p.position} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--sevs-text-body)]">{p.position}</span>
                    <span className="font-bold text-[var(--sevs-navy)]">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "PARTICIPATION" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Voter Participation</h3>
              <ParticipationChart eligible={electionData.eligibleVoters} votesCast={electionData.votesCast} />
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div><dt className="text-xs text-[var(--sevs-text-muted)]">Eligible</dt><dd className="font-bold text-[var(--sevs-navy)]">{electionData.eligibleVoters.toLocaleString()}</dd></div>
                <div><dt className="text-xs text-[var(--sevs-text-muted)]">Voted</dt><dd className="font-bold text-[var(--sevs-navy)]">{electionData.votesCast.toLocaleString()}</dd></div>
                <div><dt className="text-xs text-[var(--sevs-text-muted)]">Turnout</dt><dd className="font-bold text-[var(--sevs-navy)]">{electionData.turnout}%</dd></div>
              </dl>
            </div>

            <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Voting Activity Over Time</h3>
              <p className="mb-4 text-xs text-[var(--sevs-text-muted)]">Illustrative distribution of votes cast during the election.</p>
              <VotingActivityLineChart data={votingActivity} />
            </div>
          </div>
        )}

        {tab === "APPROVALS" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Distributed Approval Status</h3>
              <p className="mb-4 text-xs text-[var(--sevs-text-muted)]">All approval requests grouped by current DAT state, across every election and candidate.</p>
              <DatApprovalStatusChart data={datStatusCounts} />
            </div>

            <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Security & Risk Events Over Time</h3>
              <p className="mb-4 text-xs text-[var(--sevs-text-muted)]">Medium and high-risk administrative events by day, from the audit log.</p>
              <RiskEventsLineChart data={riskEvents} />
            </div>
          </div>
        )}

        {tab === "ACTIVITY" && (
          <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Election Activity</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-[var(--sevs-text-muted)]">No recorded activity for this election yet.</p>
            ) : (
              <ol className="space-y-4 border-l-2 border-[var(--sevs-border)] pl-4">
                {timeline.map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--sevs-navy)]" />
                    <p className="text-sm font-medium text-[var(--sevs-navy)]">{log.action}</p>
                    <p className="text-xs text-[var(--sevs-text-muted)]">
                      {log.actor} · {new Date(log.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-5 text-xs text-[var(--sevs-text-muted)]">
              For the complete, tamper-evident event history, see{" "}
              <a href="/audit-logs" className="font-bold text-[var(--sevs-navy)] hover:underline">Audit Logs</a>.
            </p>
          </div>
        )}
      </div>
    </>
  );
}