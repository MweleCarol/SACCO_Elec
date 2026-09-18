"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, ArrowLeft, Trophy, ChevronDown } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PositionResultsGrid } from "@/components/voter/PositionResultsGrid";
import { ResultsSummaryStats } from "@/components/results/ResultsSummaryStats";
import { TurnoutDonut } from "@/components/results/TurnoutDonut";
import { OfficerResultsPanel } from "@/components/results/OfficerResultsPanel";
import { AdminResultsPanel } from "@/components/results/AdminResultsPanel";
import { AuditorResultsPanel } from "@/components/results/AuditorResultsPanel";
import { CopilotChatPanel } from "@/components/copilot/CopilotChatPanel";
import { getElectionResultSummary } from "@/services/mock/results";
import { getApprovalsForTarget } from "@/services/mock/approvals";

function formatPeriod(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`;
}

type TabKey = "POSITIONS" | "PARTICIPATION";

export default function ElectionResultsDetailPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const { member, isLoading } = useCurrentMember();
  const [tab, setTab] = useState<TabKey>("POSITIONS");
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

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
          to view results.
        </p>
      </div>
    );
  }

  const summary = getElectionResultSummary(electionId);
  if (!summary) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          No published results found for this election.
        </p>
      </div>
    );
  }

  const { result, election, turnout, notVoted } = summary;
  const publicationApproval = getApprovalsForTarget(election.id).find(
    (a) => a.type === "RESULT_PUBLICATION",
  );
  const approvedCount =
    publicationApproval?.stages.filter((s) => s.status === "APPROVED").length ??
    2;
  const requiredCount = publicationApproval?.stages.length ?? 2;

  const isOfficer = member.role === "ELECTION_OFFICER";
  const isAdmin = member.role === "ADMINISTRATOR";
  const isAuditor = member.role === "AUDITOR";
  const isMember = member.role === "MEMBER";

  function handleDownload() {
    // Mock only — no real PDF generation backend exists yet.
    console.log("Mock: would generate a Results PDF for", election.title);
  }

  return (
    <>
      <Topbar
        title="Election Results"
        subtitle={`${election.title} — Results`}
      />

      <div className="space-y-6 p-4 sm:p-8">
        <Link
          href="/elections"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--sevs-navy)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Elections
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)] text-white">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="break-words text-lg font-bold text-[var(--sevs-navy)] sm:text-xl">
                {election.title} — Election Results
              </h2>
              <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">
                Final results after verification and approval by the Distributed
                Administration Trust (DAT).
              </p>
              <p className="mt-2 text-xs text-[var(--sevs-text-muted)]">
                {formatPeriod(election.startDate, election.endDate)} · Published{" "}
                {new Date(result.publishedAt).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                at{" "}
                {new Date(result.publishedAt).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status="Published" />

            <div className="relative">
              <button
                onClick={() => setDownloadMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
              >
                <Download className="h-4 w-4" />
                Download Results Report
                <ChevronDown className="h-4 w-4" />
              </button>

              {downloadMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDownloadMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-[var(--sevs-border)] bg-white py-1 shadow-lg">
                    <button
                      onClick={() => {
                        handleDownload();
                        setDownloadMenuOpen(false);
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--sevs-bg)]"
                    >
                      <span className="font-semibold text-[var(--sevs-navy)]">
                        Full Results Report (PDF)
                      </span>
                      <span className="block text-xs text-[var(--sevs-text-muted)]">
                        Positions, votes, verification trail
                      </span>
                    </button>
                    <Link
                      href={`/audit-logs?election=${election.id}`}
                      onClick={() => setDownloadMenuOpen(false)}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--sevs-bg)]"
                    >
                      <span className="font-semibold text-[var(--sevs-navy)]">
                        View Audit Trail
                      </span>
                      <span className="block text-xs text-[var(--sevs-text-muted)]">
                        Full event log for this election
                      </span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {isMember && (
          <p className="rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
            These are the official and final results of the {election.title}.
          </p>
        )}

        <ResultsSummaryStats
          eligibleVoters={election.totalEligibleVoters}
          totalVotesCast={election.totalVotesCast}
          turnoutPct={turnout}
          validVotes={result.validVotes}
          invalidVotes={result.invalidVotes}
        />

        {/* tabs block continues unchanged below */}

        <div className="flex gap-2 border-b border-[var(--sevs-border)]">
          <button
            onClick={() => setTab("POSITIONS")}
            className={`border-b-2 px-1 pb-2 text-sm font-bold transition ${
              tab === "POSITIONS"
                ? "border-[var(--sevs-navy)] text-[var(--sevs-navy)]"
                : "border-transparent text-[var(--sevs-text-muted)]"
            }`}
          >
            Results by Position
          </button>
          <button
            onClick={() => setTab("PARTICIPATION")}
            className={`border-b-2 px-1 pb-2 text-sm font-bold transition ${
              tab === "PARTICIPATION"
                ? "border-[var(--sevs-navy)] text-[var(--sevs-navy)]"
                : "border-transparent text-[var(--sevs-text-muted)]"
            }`}
          >
            Participation Summary
          </button>
        </div>

        {tab === "POSITIONS" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PositionResultsGrid positions={result.positions} />
            </div>

            <div className="space-y-5">
              {isOfficer && <OfficerResultsPanel electionId={election.id} />}
              {isAdmin && (
                <AdminResultsPanel
                  result={result}
                  approvedCount={approvedCount}
                  requiredCount={requiredCount}
                />
              )}
              {isAuditor && (
                <AuditorResultsPanel
                  approvedCount={approvedCount}
                  requiredCount={requiredCount}
                />
              )}
              {isMember && (
                <p className="rounded-lg bg-[var(--sevs-bg)] px-4 py-3 text-center text-sm font-medium text-[var(--sevs-navy)]">
                  Your vote makes a difference. Thank you for participating in
                  the {election.title}!
                </p>
              )}

              {!isMember && (
                <div className="h-72">
                  <CopilotChatPanel
                    greeting="Ask me questions about this election, candidates, results, or system health."
                    suggestedQuestions={[
                      "Was DAT followed for this result?",
                      "Any irregularities detected?",
                      "Summarize turnout",
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "PARTICIPATION" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm lg:col-span-2 sm:p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
                Voter Participation
              </h3>
              <TurnoutDonut
                voted={election.totalVotesCast}
                notVoted={notVoted}
              />
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <dt className="text-xs text-[var(--sevs-text-muted)]">
                    Eligible
                  </dt>
                  <dd className="font-bold text-[var(--sevs-navy)]">
                    {election.totalEligibleVoters.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--sevs-text-muted)]">
                    Voted
                  </dt>
                  <dd className="font-bold text-[var(--sevs-navy)]">
                    {election.totalVotesCast.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--sevs-text-muted)]">
                    Turnout
                  </dt>
                  <dd className="font-bold text-[var(--sevs-navy)]">
                    {turnout}%
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-5">
              {isOfficer && <OfficerResultsPanel electionId={election.id} />}
              {isAdmin && (
                <AdminResultsPanel
                  result={result}
                  approvedCount={approvedCount}
                  requiredCount={requiredCount}
                />
              )}
              {isAuditor && (
                <AuditorResultsPanel
                  approvedCount={approvedCount}
                  requiredCount={requiredCount}
                />
              )}
              {isMember && (
                <p className="rounded-lg bg-[var(--sevs-bg)] px-4 py-3 text-center text-sm font-medium text-[var(--sevs-navy)]">
                  Your vote makes a difference. Thank you for participating in
                  the {election.title}!
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
