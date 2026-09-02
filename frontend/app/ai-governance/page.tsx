"use client";

import { Topbar } from "@/components/layout/Topbar";
import { RiskGauge } from "@/components/officer/RiskGauge";
import { AnomalyCard } from "@/components/officer/AnomalyCard";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { mockRiskAssessment, mockAnomalies } from "@/services/mock/ai-governance";
import { formatRoleLabel } from "@/lib/format";

export default function AiGovernancePage() {
  const { member, isLoading } = useCurrentMember();

  if (isLoading) return null;
  if (!member || !["ELECTION_OFFICER", "ADMINISTRATOR", "AUDITOR"].includes(member.role)) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <>
      <Topbar title="AI Governance" subtitle="Explainable, advisory insights — human decisions remain final" />

      <div className="space-y-6 p-4 sm:p-8">
        {member.role === "AUDITOR" && (
          <p className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700">
            {formatRoleLabel(member.role)} access is read-only.
          </p>
        )}

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <RiskGauge level={mockRiskAssessment.level} />
          <p className="mt-4 text-sm text-[var(--sevs-text-body)]">{mockRiskAssessment.summary}</p>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Contributing Factors</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[var(--sevs-text-body)]">
              {mockRiskAssessment.factors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
            Detected Anomalies ({mockAnomalies.length})
          </h3>
          <div className="space-y-3">
            {mockAnomalies.length === 0 ? (
              <p className="text-sm text-[var(--sevs-text-muted)]">No anomalies detected.</p>
            ) : (
              mockAnomalies.map((a) => <AnomalyCard key={a.id} anomaly={a} />)
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--sevs-text-muted)]">
          AI Governance analyzes permitted operational and audit data only. It cannot access ballot contents, modify votes, or determine election outcomes — all recommendations require human review.
        </p>
      </div>
    </>
  );
}