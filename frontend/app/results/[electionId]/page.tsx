"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Download,
  ArrowLeft,
  Trophy,
  ChevronDown,
  Sparkles,
  X,
} from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PositionResultsGrid } from "@/components/voter/PositionResultsGrid";
import { ResultsSummaryStats } from "@/components/results/ResultsSummaryStats";
import { TurnoutDonut } from "@/components/results/TurnoutDonut";
import { VoterParticipationChart } from "@/components/results/VoterParticipationChart";
import { ResultsByPositionSummary } from "@/components/results/ResultsByPositionSummary";
import { ResultsVerificationStepper } from "@/components/results/ResultsVerificationStepper";
import { ResultHighlightsCard } from "@/components/results/ResultHighlightsCard";
import { OfficerResultsPanel } from "@/components/results/OfficerResultsPanel";
import { AdminResultsPanel } from "@/components/results/AdminResultsPanel";
import { AuditorResultsPanel } from "@/components/results/AuditorResultsPanel";
import { CopilotChatPanel } from "@/components/copilot/CopilotChatPanel";
import {
  getElectionResultSummary,
  getVoteTimeline,
  getResultHighlights,
} from "@/services/mock/results";
import { getApprovalsForTarget } from "@/services/mock/approvals";

function formatPeriod(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`;
}

export default function ElectionResultsDetailPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const { member, isLoading } = useCurrentMember();
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

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
                <span className="hidden sm:inline">
                  Download Results Report
                </span>
                <span className="sm:hidden">Download</span>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
                  Voter Turnout
                </h3>
                <TurnoutDonut
                  voted={election.totalVotesCast}
                  notVoted={notVoted}
                />
              </div>

              <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
                  Voter Participation
                </h3>
                <p className="mb-2 text-xs text-[var(--sevs-text-muted)]">
                  Votes cast over time
                </p>
                <VoterParticipationChart data={getVoteTimeline(election.id)} />
              </div>
            </div>

            <ResultsByPositionSummary positions={result.positions} />

            <div id="candidates-results">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
                Candidates &amp; Results
              </h3>
              <PositionResultsGrid positions={result.positions} />
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="min-w-[320px] flex-[2_1_480px]">
                <ResultsVerificationStepper
                  verifiedAt={result.verifiedAt}
                  approvedCount={approvedCount}
                  requiredCount={requiredCount}
                  publishedAt={result.publishedAt}
                  publishedBy={result.publishedBy}
                />
              </div>
              <div className="min-w-[260px] flex-[1_1_260px]">
                <ResultHighlightsCard
                  highlights={getResultHighlights(election.id)}
                />
              </div>
            </div>
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
                Your vote makes a difference. Thank you for participating in the{" "}
                {election.title}!
              </p>
            )}

            {!isMember && (
              <div className="hidden h-96 lg:sticky lg:top-8 lg:block">
                <CopilotChatPanel
                  title="AI Copilot"
                  subtitle="Ask me anything about this election."
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

        {!isMember && (
          <>
            <button
              onClick={() => setCopilotOpen(true)}
              className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sevs-navy)] text-white shadow-lg lg:hidden"
              aria-label="Ask AI Copilot"
            >
              <Sparkles className="h-6 w-6" />
            </button>

            {copilotOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/30 lg:hidden"
                  onClick={() => setCopilotOpen(false)}
                />
                <div className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col rounded-t-2xl bg-white shadow-lg lg:hidden">
                  <div className="flex items-center justify-end px-4 pt-3">
                    <button
                      onClick={() => setCopilotOpen(false)}
                      aria-label="Close Copilot"
                    >
                      <X className="h-5 w-5 text-[var(--sevs-text-muted)]" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 px-4 pb-4">
                    <CopilotChatPanel
                      title="AI Copilot"
                      subtitle="Ask me anything about this election."
                      greeting="Ask me questions about this election, candidates, results, or system health."
                      suggestedQuestions={[
                        "Was DAT followed for this result?",
                        "Any irregularities detected?",
                        "Summarize turnout",
                      ]}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
