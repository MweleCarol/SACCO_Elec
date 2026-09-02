import Link from "next/link";
import type { Member } from "@/types/member";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CopilotCard } from "@/components/officer/CopilotCard";
import { mockElections, getVotingProgress, getComputedLifecycleStatus, getDisplayStatus } from "@/services/mock/elections";
import { getCandidatesByElection, mockCandidates } from "@/services/mock/candidates";
import { getPendingApprovalCounts, mockApprovals } from "@/services/mock/approvals";
import { mockAnomalies } from "@/services/mock/ai-governance";
import { Vote, Users2, ClipboardCheck, TrendingUp } from "lucide-react";

interface ElectionOfficerDashboardProps {
  user: Member;
}

export function ElectionOfficerDashboard({ user }: ElectionOfficerDashboardProps) {
  const activeElections = mockElections.filter((e) => getComputedLifecycleStatus(e) === "ACTIVE");
  const approvedCandidates = mockCandidates.filter((c) => c.status === "APPROVED").length;
  const approvalCounts = getPendingApprovalCounts();

  const avgTurnout =
    activeElections.length > 0
      ? Math.round(
          activeElections.reduce((sum, e) => sum + getVotingProgress(e), 0) / activeElections.length
        )
      : 0;

  const pendingApprovalItems = mockApprovals.filter((a) => a.status === "PENDING").slice(0, 3);

  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Elections" value={activeElections.length} icon={<Vote className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Candidates" value={approvedCandidates} hint="Approved" icon={<Users2 className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Pending Approvals" value={approvalCounts.total} icon={<ClipboardCheck className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Avg. Turnout" value={`${avgTurnout}%`} hint="Across active elections" icon={<TrendingUp className="h-4 w-4 text-[var(--sevs-navy)]" />} />
      </div>

      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Election Management</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--sevs-border)] text-xs uppercase tracking-wide text-[var(--sevs-text-muted)]">
              <th className="pb-3 font-semibold">Election</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Candidates</th>
              <th className="pb-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--sevs-border)]">
            {mockElections.map((election) => (
              <tr key={election.id}>
                <td className="py-3 font-medium text-[var(--sevs-navy)]">{election.title}</td>
                <td className="py-3">
                  <StatusBadge status={getDisplayStatus(election)} />
                </td>
                <td className="py-3 text-[var(--sevs-text-body)]">
                  {getCandidatesByElection(election.id).length}
                </td>
                <td className="py-3">
                  <Link href={`/elections/${election.id}`} className="font-bold text-[var(--sevs-navy)] hover:underline">
                    {election.approvalStatus === "DRAFT" || election.approvalStatus === "PENDING_APPROVAL" ? "Review" : "Manage"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Pending Approvals</h3>
          <div className="space-y-3 text-sm">
            {pendingApprovalItems.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-[var(--sevs-text-body)]">{a.targetLabel}</span>
                <StatusBadge status={a.status} />
              </div>
            ))}
            {pendingApprovalItems.length === 0 && (
              <p className="text-sm text-[var(--sevs-text-muted)]">No pending approvals.</p>
            )}
          </div>
          <Link href="/approvals" className="mt-4 inline-block text-sm font-bold text-[var(--sevs-navy)] hover:underline">
            View all approvals →
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">AI Governance Alert</h3>
          {mockAnomalies.length > 0 ? (
            <>
              <p className="text-sm font-bold text-amber-600">⚠ Unusual administrative activity detected</p>
              <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">{mockAnomalies[0].description}</p>
              <Link href="/ai-governance" className="mt-4 inline-block text-sm font-bold text-[var(--sevs-navy)] hover:underline">
                View Explanation →
              </Link>
            </>
          ) : (
            <p className="text-sm text-[var(--sevs-text-muted)]">No anomalies detected.</p>
          )}
        </div>

        <CopilotCard />
      </div>
    </div>
  );
}