import Link from "next/link";
import type { Member } from "@/types/member";
import { StatCard } from "@/components/dashboard/StatCard";
import { CopilotCard } from "@/components/officer/CopilotCard";
import { mockElections, mockDashboardStats } from "@/services/mock/elections";
import { getPendingApprovalCounts } from "@/services/mock/approvals";
import { mockRegisteredMembersCount } from "@/services/mock/members"; // TODO: confirm this path — singular member.ts elsewhere in the app
import { mockMembershipSync } from "@/services/mock/membership-sync";
import { getHighRiskAuditLogs } from "@/services/mock/audit-logs";
import { Users, Vote, ClipboardCheck, AlertTriangle } from "lucide-react";

interface ElectionAdministratorDashboardProps {
  user: Member;
}

export function ElectionAdministratorDashboard({ user }: ElectionAdministratorDashboardProps) {
  const approvalCounts = getPendingApprovalCounts();
  const highRiskLogs = getHighRiskAuditLogs();

  const overviewRows = [
    { area: "User Management", status: "Operational", items: mockRegisteredMembersCount, href: "/users" },
    { area: "Elections", status: "Operational", items: mockElections.length, href: "/elections" },
    { area: "Approval Workflow", status: approvalCounts.total > 0 ? "Pending" : "Operational", items: approvalCounts.total, href: "/approvals" },
    { area: "Audit & Security", status: "Monitoring", items: highRiskLogs.length, href: "/audit-logs" },
  ];

  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={mockRegisteredMembersCount.toLocaleString()} icon={<Users className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Elections" value={mockElections.length} icon={<Vote className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Pending Approvals" value={approvalCounts.total} icon={<ClipboardCheck className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="System Alerts" value={mockDashboardStats.systemAlerts} icon={<AlertTriangle className="h-4 w-4 text-[var(--sevs-navy)]" />} />
      </div>

      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">System & Election Overview</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--sevs-border)] text-xs uppercase tracking-wide text-[var(--sevs-text-muted)]">
              <th className="pb-3 font-semibold">Area</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Items</th>
              <th className="pb-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--sevs-border)]">
            {overviewRows.map((row) => (
              <tr key={row.area}>
                <td className="py-3 font-medium text-[var(--sevs-navy)]">{row.area}</td>
                <td className="py-3 text-[var(--sevs-text-body)]">{row.status}</td>
                <td className="py-3 text-[var(--sevs-text-body)]">{row.items.toLocaleString()}</td>
                <td className="py-3">
                  <Link href={row.href} className="font-bold text-[var(--sevs-navy)] hover:underline">
                    {row.status === "Pending" ? "Review" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Membership Sync</h3>
          <p className="text-sm text-[var(--sevs-text-muted)]">
            Last sync: {new Date(mockMembershipSync.lastSyncedAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
          </p>
          <p className="mt-1 text-sm text-green-600">
            {mockMembershipSync.connectionStatus === "CONNECTED" ? "✓ Connected" : "✗ Disconnected"}
          </p>
          <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">
            Members: {mockMembershipSync.membersReceived.toLocaleString()}
          </p>
          <Link href="/membership-sync" className="mt-4 inline-block text-sm font-bold text-[var(--sevs-navy)] hover:underline">
            Manage Synchronization →
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Security Monitoring</h3>
          <p className="text-sm font-bold text-amber-600">⚠ {highRiskLogs.length} high-risk events</p>
          <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">Requires review by an authorized officer.</p>
          <Link href="/audit-logs" className="mt-4 inline-block text-sm font-bold text-[var(--sevs-navy)] hover:underline">
            Review Alerts →
          </Link>
        </div>

        <CopilotCard />
      </div>
    </div>
  );
}