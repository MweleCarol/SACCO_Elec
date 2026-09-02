"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { AuditLogRow } from "@/components/officer/AuditLogRow";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { mockAuditLogs } from "@/services/mock/audit-logs";
import { formatRoleLabel } from "@/lib/format";
import type { AuditModule, AuditRiskLevel } from "@/types/audit-log";

const MODULES: (AuditModule | "ALL")[] = ["ALL", "ELECTIONS", "CANDIDATES", "APPROVALS", "AUTH", "USERS", "MEMBERSHIP_SYNC"];
const RISK_LEVELS: (AuditRiskLevel | "ALL")[] = ["ALL", "LOW", "MEDIUM", "HIGH"];

export default function AuditLogsPage() {
  const { member, isLoading } = useCurrentMember();
  const [moduleFilter, setModuleFilter] = useState<AuditModule | "ALL">("ALL");
  const [riskFilter, setRiskFilter] = useState<AuditRiskLevel | "ALL">("ALL");

  if (isLoading) return null;
  if (!member || !["ELECTION_OFFICER", "ADMINISTRATOR", "AUDITOR"].includes(member.role)) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const isReadOnly = member.role === "AUDITOR";

  const logs = [...mockAuditLogs]
    .filter((l) => moduleFilter === "ALL" || l.module === moduleFilter)
    .filter((l) => riskFilter === "ALL" || l.riskLevel === riskFilter)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <>
      <Topbar title="Audit Logs" subtitle="Tamper-evident record of security-sensitive operations" />

      <div className="space-y-5 p-4 sm:p-8">
        {isReadOnly && (
          <p className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700">
            {formatRoleLabel(member.role)} access is read-only — no actions can be taken from this page.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value as AuditModule | "ALL")}
            className="rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
          >
            {MODULES.map((m) => <option key={m} value={m}>{m === "ALL" ? "All Modules" : m.replace(/_/g, " ")}</option>)}
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as AuditRiskLevel | "ALL")}
            className="rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
          >
            {RISK_LEVELS.map((r) => <option key={r} value={r}>{r === "ALL" ? "All Risk Levels" : r}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          {logs.length === 0 && <p className="text-sm text-[var(--sevs-text-muted)]">No matching audit events.</p>}
          {logs.map((log) => <AuditLogRow key={log.id} log={log} />)}
        </div>
      </div>
    </>
  );
}