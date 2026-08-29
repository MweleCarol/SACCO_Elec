import Link from "next/link";
import type { Member } from "@/types/member";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockElections } from "@/services/mock/elections";
import {
  getAuditEventCountForElection,
  getRecentAuditLogs,
  getHighRiskAuditLogs,
  mockAuditLogs,
} from "@/services/mock/audit-logs";
import { getReportsCount } from "@/services/mock/reports";
import { mockAnomalies } from "@/services/mock/ai-governance";
import { ClipboardList, ScrollText, AlertTriangle, FileText } from "lucide-react";

// Props for the AuditorDashboard component
interface AuditorDashboardProps {
  user: Member;
}

const REVIEWABLE_STATUSES = ["CLOSED", "RESULTS_PUBLISHED", "ARCHIVED", "ACTIVE"];

// AuditorDashboard component that displays an overview of elections, audit events, and reports for auditors.
export function AuditorDashboard({ user }: AuditorDashboardProps) {
  const electionsReviewed = mockElections.filter((e) => REVIEWABLE_STATUSES.includes(e.status)).length;
  const highRiskLogs = getHighRiskAuditLogs();
  const recentLogs = getRecentAuditLogs(4);

  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Elections Reviewed" value={electionsReviewed} icon={<ClipboardList className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Audit Events" value={mockAuditLogs.length.toLocaleString()} hint="Recorded activities" icon={<ScrollText className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="High-Risk Events" value={highRiskLogs.length} hint="Requires attention" icon={<AlertTriangle className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Reports" value={getReportsCount()} hint="Available reports" icon={<FileText className="h-4 w-4 text-[var(--sevs-navy)]" />} />
      </div>

      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Election Oversight</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--sevs-border)] text-xs uppercase tracking-wide text-[var(--sevs-text-muted)]">
              <th className="pb-3 font-semibold">Election</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Audit Events</th>
              <th className="pb-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--sevs-border)]">
            {mockElections.map((election) => (
              <tr key={election.id}>
                <td className="py-3 font-medium text-[var(--sevs-navy)]">{election.title}</td>
                <td className="py-3">
                  <StatusBadge status={election.status} />
                </td>
                <td className="py-3 text-[var(--sevs-text-body)]">{getAuditEventCountForElection(election.id)}</td>
                <td className="py-3">
                  <Link href={`/elections/${election.id}`} className="font-bold text-[var(--sevs-navy)] hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Recent Audit Events</h3>
          <div className="space-y-3 text-sm">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between">
                <div>
                  <p className="text-[var(--sevs-text-body)]">{log.action}</p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">{log.targetLabel ?? log.actor}</p>
                </div>
                <span className="text-xs text-[var(--sevs-text-muted)]">
                  {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
          <Link href="/audit-logs" className="mt-4 inline-block text-sm font-bold text-[var(--sevs-navy)] hover:underline">
            View All Audit Logs →
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">AI Governance Insights</h3>
          {mockAnomalies.length > 0 ? (
            <>
              <p className="text-sm font-bold text-amber-600">⚠ High-risk administrative activity</p>
              <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">{mockAnomalies.length} events detected</p>
              <p className="mt-2 text-xs text-[var(--sevs-text-muted)]">Reason: {mockAnomalies[0].description}</p>
              <Link href="/ai-governance" className="mt-4 inline-block text-sm font-bold text-[var(--sevs-navy)] hover:underline">
                View Explanation →
              </Link>
            </>
          ) : (
            <p className="text-sm text-[var(--sevs-text-muted)]">No anomalies detected.</p>
          )}
        </div>
      </div>
    </div>
  );
}