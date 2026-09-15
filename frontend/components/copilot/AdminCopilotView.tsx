import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import { CopilotChatPanel } from "@/components/copilot/CopilotChatPanel";
import { RiskDistributionChart } from "@/components/copilot/RiskDistributionChart";
import { RiskEventsLineChart } from "@/components/reports/RiskEventsLineChart";
import { getAdminCopilotStats, getRiskDistribution, getRiskEventsOverTime, getRecentAuditLogs } from "@/services/mock/copilot-insights";
import { mockAnomalies } from "@/services/mock/ai-governance";
import { ShieldAlert, ClipboardCheck, Activity, Gauge } from "lucide-react";

const SUGGESTED = [
  "What are the current risks?",
  "Show me approval bottlenecks.",
  "Summarize election performance.",
  "Any unusual administrative activities?",
];

interface AdminCopilotViewProps {
  isReadOnly?: boolean;
}

export function AdminCopilotView({ isReadOnly = false }: AdminCopilotViewProps) {
  const stats = getAdminCopilotStats();
  const distribution = getRiskDistribution();
  const trend = getRiskEventsOverTime();
  const recent = getRecentAuditLogs(5);

  return (
    <div className="grid grid-cols-1 gap-6 p-4 sm:p-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Overall Risk Score" value={stats.overallRiskScore} hint={stats.riskLabel} icon={<Gauge className="h-4 w-4 text-[var(--sevs-navy)]" />} />
          <StatCard label="Active Alerts" value={stats.activeAlerts} hint="Requires attention" icon={<ShieldAlert className="h-4 w-4 text-[var(--sevs-navy)]" />} />
          <StatCard label="Pending DAT" value={stats.pendingDatApprovals} hint="Across all elections" icon={<ClipboardCheck className="h-4 w-4 text-[var(--sevs-navy)]" />} />
          <StatCard label="System Integrity" value={`${stats.systemIntegrityPct}%`} icon={<Activity className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">AI Insights &amp; Recommendations</h3>
          <div className="space-y-3">
            {mockAnomalies.length === 0 && <p className="text-sm text-[var(--sevs-text-muted)]">No anomalies detected.</p>}
            {mockAnomalies.map((a) => (
              <div key={a.id} className="rounded-lg bg-[var(--sevs-bg)] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[var(--sevs-navy)]">{a.title}</p>
                  <span className="text-xs font-bold text-[var(--sevs-text-muted)]">{a.severity}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--sevs-text-body)]">{a.description}</p>
                <p className="mt-1 text-xs text-[var(--sevs-text-muted)]">Recommended: {a.explainability.recommendedAction}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Risk Trend</h3>
            <p className="mb-4 text-xs text-[var(--sevs-text-muted)]">Medium/high-risk events by day.</p>
            <RiskEventsLineChart data={trend} />
          </div>
          <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Risk Distribution</h3>
            <p className="mb-4 text-xs text-[var(--sevs-text-muted)]">Current anomalies by severity.</p>
            <RiskDistributionChart data={distribution} />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Recent Governance Activities</h3>
          <div className="space-y-3 text-sm">
            {recent.map((log) => (
              <div key={log.id} className="flex items-center justify-between">
                <div>
                  <p className="text-[var(--sevs-text-body)]">{log.action}</p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">{log.actor} · {log.module ?? "—"}</p>
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
          greeting="Hello, I'm your AI governance assistant. I can help with risk analysis, approval workflow insights, and compliance monitoring."
          suggestedQuestions={SUGGESTED}
        />
      </div>
    </div>
  );
}