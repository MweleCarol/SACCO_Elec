import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import { CopilotChatPanel } from "@/components/copilot/CopilotChatPanel";
import { getOfficerCopilotStats, getRecentAuditLogs } from "@/services/mock/copilot-insights";
import { Vote, ClipboardList, Users2, Activity } from "lucide-react";

const SUGGESTED = [
  "How is voter turnout?",
  "What candidate applications need my review?",
  "What approvals are waiting for me?",
  "Are there any unusual activities?",
];

export function OfficerCopilotView() {
  const stats = getOfficerCopilotStats();
  const recent = getRecentAuditLogs(4);

  const quickTasks = [
    { label: "Review Candidates", count: stats.candidatesPendingReview, href: "/candidates" },
    { label: "View Approvals", count: stats.approvalsAwaitingMe, href: "/approvals" },
    { label: "View Turnout", count: null, href: "/reports" },
    { label: "Manage Elections", count: null, href: "/elections" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 p-4 sm:p-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Election Progress" value={`${stats.electionProgress}%`} hint={stats.primaryElectionTitle ?? "No active election"} icon={<Vote className="h-4 w-4 text-[var(--sevs-navy)]" />} />
          <StatCard label="Pending Tasks" value={stats.pendingTasks} hint="Need your attention" icon={<ClipboardList className="h-4 w-4 text-[var(--sevs-navy)]" />} />
          <StatCard label="Voter Turnout" value={`${stats.votesCast.toLocaleString()} / ${stats.eligibleVoters.toLocaleString()}`} hint={`${stats.voterTurnoutPct}% of eligible`} icon={<Users2 className="h-4 w-4 text-[var(--sevs-navy)]" />} />
          <StatCard label="System Status" value={stats.systemStatus} icon={<Activity className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Smart Recommendations</h3>
          <div className="space-y-3">
            {stats.candidatesPendingReview > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-[var(--sevs-bg)] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-[var(--sevs-navy)]">{stats.candidatesPendingReview} candidate application(s) pending review</p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">Priority: Medium</p>
                </div>
                <Link href="/candidates" className="shrink-0 text-sm font-bold text-[var(--sevs-navy)] hover:underline">Review Now →</Link>
              </div>
            )}
            {stats.approvalsAwaitingMe > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-[var(--sevs-bg)] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-[var(--sevs-navy)]">{stats.approvalsAwaitingMe} approval(s) awaiting your stage</p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">Priority: High</p>
                </div>
                <Link href="/approvals" className="shrink-0 text-sm font-bold text-[var(--sevs-navy)] hover:underline">View Approvals →</Link>
              </div>
            )}
            {stats.candidatesPendingReview === 0 && stats.approvalsAwaitingMe === 0 && (
              <p className="text-sm text-[var(--sevs-text-muted)]">You&apos;re all caught up — no pending actions right now.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Quick Tasks</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickTasks.map((t) => (
              <Link key={t.label} href={t.href} className="rounded-xl border border-[var(--sevs-border)] px-3 py-3 text-center hover:bg-[var(--sevs-bg)]">
                <p className="text-sm font-bold text-[var(--sevs-navy)]">{t.label}</p>
                {t.count !== null && <p className="mt-1 text-xs text-[var(--sevs-text-muted)]">{t.count} pending</p>}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Recent Activity</h3>
          <div className="space-y-3 text-sm">
            {recent.map((log) => (
              <div key={log.id} className="flex items-center justify-between">
                <div>
                  <p className="text-[var(--sevs-text-body)]">{log.action}</p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">{log.actor}</p>
                </div>
                <span className="text-xs text-[var(--sevs-text-muted)]">
                  {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {recent.length === 0 && <p className="text-sm text-[var(--sevs-text-muted)]">No recent activity.</p>}
          </div>
        </div>
      </div>

      <div className="h-[600px] lg:h-auto">
        <CopilotChatPanel
          greeting="Hi, I'm here to help you manage your election effectively. Ask me about turnout, pending tasks, candidate reviews, or approvals."
          suggestedQuestions={SUGGESTED}
        />
      </div>
    </div>
  );
}