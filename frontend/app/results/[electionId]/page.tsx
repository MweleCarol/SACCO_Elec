"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Trophy } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PositionResultsGrid } from "@/components/voter/PositionResultsGrid";
import { ResultsByPositionSection } from "@/components/results/ResultsByPositionSection";
import { ResultsSummaryStats } from "@/components/results/ResultsSummaryStats";
import { TurnoutDonut } from "@/components/results/TurnoutDonut";
import { VoterParticipationChart } from "@/components/results/VoterParticipationChart";
import { ResultsVerificationStepper } from "@/components/results/ResultsVerificationStepper";
import { ResultHighlightsCard } from "@/components/results/ResultHighlightsCard";
import { OfficerResultsPanel } from "@/components/results/OfficerResultsPanel";
import { AdminResultsPanel } from "@/components/results/AdminResultsPanel";
import { AuditorResultsPanel } from "@/components/results/AuditorResultsPanel";
import { CopilotTeaserCard } from "@/components/results/CopilotTeaserCard";
import { getElectionResultSummary, getVoteTimeline, getResultHighlights } from "@/services/mock/results";
import { getApprovalsForTarget } from "@/services/mock/approvals";

type TabKey = "POSITIONS" | "PARTICIPATION";

export default function ElectionResultsDetailPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const { member, isLoading } = useCurrentMember();
  const [tab, setTab] = useState<TabKey>("POSITIONS");

  if (isLoading) return null;
  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">Log in</a> to view results.
        </p>
      </div>
    );
  }

  const summary = getElectionResultSummary(electionId);
  if (!summary) {
    return <div className="p-8"><p className="text-[var(--sevs-text-muted)]">No published results found for this election.</p></div>;
  }

  const { result, election, turnout, notVoted } = summary;
  const publicationApproval = getApprovalsForTarget(election.id).find((a) => a.type === "RESULT_PUBLICATION");
  const approvedCount = publicationApproval?.stages.filter((s) => s.status === "APPROVED").length ?? 2;
  const requiredCount = publicationApproval?.stages.length ?? 2;

  const isOfficer = member.role === "ELECTION_OFFICER";
  const isAdmin = member.role === "ADMINISTRATOR";
  const isAuditor = member.role === "AUDITOR";
  const isMember = member.role === "MEMBER";

  const copilotProps = {
    greeting: "Ask me questions about this election, candidates, results, or system health.",
    suggestedQuestions: ["Was DAT followed for this result?", "Any irregularities detected?", "Summarize turnout"],
    description: "Ask questions about this election, candidates, results, or system health.",
  };

  function handleDownload() {
    // Mock only — no real PDF generation backend exists yet.
    console.log("Mock: would generate a Results PDF for", election.title);
  }

  return (
    <>
      <Topbar title="Election Results" subtitle={`${election.title} — Results`} />

      <div className="space-y-4 p-4 sm:p-8">
        {!isMember && (
          <p className="text-xs text-[var(--sevs-text-muted)]">
            <Link href="/elections" className="hover:underline">Elections</Link> &rsaquo; {election.title} &rsaquo; Results
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:flex-1">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)] text-white">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-lg font-bold text-[var(--sevs-navy)] sm:text-xl">
                  {election.title} — Election Results
                </h2>
                <StatusBadge status="Published" />
              </div>
              <p className="mt-1 text-xs text-[var(--sevs-text-muted)]">
                {new Date(result.publishedAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
                {new Date(result.publishedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {isMember && (
            <button
              onClick={handleDownload}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
            >
              <Download className="h-4 w-4" />
              Download Results (PDF)
            </button>
          )}
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

        {!isMember && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ResultsByPositionSection positions={result.positions} />
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Voter Turnout</h3>
                  <TurnoutDonut voted={election.totalVotesCast} notVoted={notVoted} />
                </div>
                {isOfficer && <OfficerResultsPanel electionId={election.id} />}
                {isAdmin && <AdminResultsPanel result={result} approvedCount={approvedCount} requiredCount={requiredCount} />}
                {isAuditor && <AuditorResultsPanel approvedCount={approvedCount} requiredCount={requiredCount} />}
                <CopilotTeaserCard {...copilotProps} />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
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
                <ResultHighlightsCard highlights={getResultHighlights(election.id)} />
              </div>
            </div>
          </>
        )}

        {isMember && (
          <>
            <div className="flex gap-2 border-b border-[var(--sevs-border)]">
              <button
                onClick={() => setTab("POSITIONS")}
                className={`border-b-2 px-1 pb-2 text-sm font-bold transition ${
                  tab === "POSITIONS" ? "border-[var(--sevs-navy)] text-[var(--sevs-navy)]" : "border-transparent text-[var(--sevs-text-muted)]"
                }`}
              >
                Results by Position
              </button>
              <button
                onClick={() => setTab("PARTICIPATION")}
                className={`border-b-2 px-1 pb-2 text-sm font-bold transition ${
                  tab === "PARTICIPATION" ? "border-[var(--sevs-navy)] text-[var(--sevs-navy)]" : "border-transparent text-[var(--sevs-text-muted)]"
                }`}
              >
                Participation Summary
              </button>
            </div>

            {tab === "POSITIONS" && <PositionResultsGrid positions={result.positions} />}

            {tab === "PARTICIPATION" && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Voter Turnout</h3>
                  <TurnoutDonut voted={election.totalVotesCast} notVoted={notVoted} />
                </div>
                <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Voter Participation</h3>
                  <p className="mb-2 text-xs text-[var(--sevs-text-muted)]">Votes cast over time</p>
                  <VoterParticipationChart data={getVoteTimeline(election.id)} />
                </div>
              </div>
            )}

            <CopilotTeaserCard {...copilotProps} />
          </>
        )}
      </div>
    </>
  );
}