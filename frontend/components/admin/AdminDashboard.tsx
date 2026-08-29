import Link from "next/link";
import type { Member } from "@/types/member";
import { StatCard } from "@/components/dashboard/StatCard";
import { getActiveElections, getVotingProgress, mockDashboardStats } from "@/services/mock/elections";
import { getPendingApprovalCounts } from "@/services/mock/approvals";
import { getRecentAuditLogs } from "@/services/mock/audit-logs";
import { mockRiskAssessment, mockAnomalies } from "@/services/mock/ai-governance";
import { Vote, Users2, ClipboardCheck, AlertTriangle } from "lucide-react";

interface AdminDashboardProps {
  user: Member;
}
// Define styles for different risk levels.
const RISK_STYLES: Record<string, string> = {
  LOW: "text-green-600",
  MEDIUM: "text-amber-600",
  HIGH: "text-red-600",
};

// AdminDashboard component that displays the dashboard for administrators, including statistics, current election status, AI governance insights, pending approvals, and recent activity.
export function AdminDashboard({ user }: AdminDashboardProps) {
  const currentElection = getActiveElections()[0];
  const progress = currentElection ? getVotingProgress(currentElection) : 0;
  const approvalCounts = getPendingApprovalCounts();
  const recentActivity = getRecentAuditLogs(3);

  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Elections" value={mockDashboardStats.activeElections} hint="Currently running" icon={<Vote className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Registered Members" value={mockDashboardStats.registeredMembers.toLocaleString()} hint="Eligible voters" icon={<Users2 className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Pending Approvals" value={mockDashboardStats.pendingApprovals} hint="Require attention" icon={<ClipboardCheck className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="System Alerts" value={mockDashboardStats.systemAlerts} hint="AI risk notifications" icon={<AlertTriangle className="h-4 w-4 text-[var(--sevs-navy)]" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Current Election</h3>
          {currentElection ? (
            <>
              <p className="mt-2 text-lg font-extrabold text-[var(--sevs-navy)]">{currentElection.title}</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-green-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                LIVE
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs font-semibold text-[var(--sevs-text-muted)]">
                  <span>Voting progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-green-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <Link href={`/elections/${currentElection.id}`} className="mt-5 inline-block rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]">
                Manage Election
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-[var(--sevs-text-muted)]">No election is currently active.</p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">AI Governance</h3>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-[var(--sevs-text-muted)]">Administrative Risk</span>
            <span className={`text-sm font-extrabold ${RISK_STYLES[mockRiskAssessment.level]}`}>
              {mockRiskAssessment.level}
            </span>
          </div>
          <p className="mt-3 text-lg font-extrabold text-[var(--sevs-navy)]">
            {mockAnomalies.length} anomalies detected
          </p>
          <p className="text-sm text-[var(--sevs-text-muted)]">{mockRiskAssessment.summary}</p>
          <Link href="/ai-governance" className="mt-5 inline-block rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]">
            View Insights
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Pending Approvals</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[var(--sevs-text-body)]">Candidate approvals</span><span className="font-bold text-amber-600">{approvalCounts.candidateApprovals} pending</span></div>
            <div className="flex justify-between"><span className="text-[var(--sevs-text-body)]">Election actions</span><span className="font-bold text-amber-600">{approvalCounts.electionActions} pending</span></div>
            <div className="flex justify-between"><span className="text-[var(--sevs-text-body)]">Verification requests</span><span className="font-bold text-amber-600">{approvalCounts.verificationRequests} pending</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Recent Activity</h3>
          <div className="space-y-3 text-sm">
            {recentActivity.map((log) => (
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
          </div>
        </div>
      </div>
    </div>
  );
}