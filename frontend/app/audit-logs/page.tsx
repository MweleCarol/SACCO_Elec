"use client";

import { useState } from "react";
import { Filter, X, Download } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { AuditLogRow } from "@/components/officer/AuditLogRow";
import { AuditLogTable } from "@/components/officer/AuditLogTable";
import { EventDetailsPanel } from "@/components/officer/EventDetailsPanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import {
  mockAuditLogs,
  getAuditStats,
  getAuditElectionOptions,
} from "@/services/mock/audit-logs";
import { buildAuditCsv, downloadCsv } from "@/lib/audit-export";
import { formatRoleLabel } from "@/lib/format";
import type {
  AuditModule,
  AuditRiskLevel,
  AuditActorRole,
  AuditResult,
  AuditLogEntry,
} from "@/types/audit-log";
import {
  ListChecks,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

const MODULES: (AuditModule | "ALL")[] = [
  "ALL",
  "ELECTIONS",
  "CANDIDATES",
  "APPROVALS",
  "AUTH",
  "USERS",
  "MEMBERSHIP_SYNC",
];
const RISK_LEVELS: (AuditRiskLevel | "ALL")[] = [
  "ALL",
  "LOW",
  "MEDIUM",
  "HIGH",
];
const ROLES: (AuditActorRole | "ALL")[] = [
  "ALL",
  "MEMBER",
  "ELECTION_OFFICER",
  "ADMINISTRATOR",
  "AUDITOR",
  "SYSTEM",
];
const RESULTS: (AuditResult | "ALL")[] = ["ALL", "SUCCESS", "FAILED"];

export default function AuditLogsPage() {
  const { member, isLoading } = useCurrentMember();

  const [electionFilter, setElectionFilter] = useState<string | "ALL">("ALL");
  const [moduleFilter, setModuleFilter] = useState<AuditModule | "ALL">("ALL");
  const [roleFilter, setRoleFilter] = useState<AuditActorRole | "ALL">("ALL");
  const [resultFilter, setResultFilter] = useState<AuditResult | "ALL">("ALL");
  const [riskFilter, setRiskFilter] = useState<AuditRiskLevel | "ALL">("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // replace the single exportAll button in AuditLogsPage with:
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  if (isLoading) return null;
  if (
    !member ||
    !["ELECTION_OFFICER", "ADMINISTRATOR", "AUDITOR"].includes(member.role)
  ) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You don&apos;t have access to this page.
        </p>
      </div>
    );
  }

  const isReadOnly = member.role === "AUDITOR";
  const electionOptions = getAuditElectionOptions();

  const logs = [...mockAuditLogs]
    .filter((l) => electionFilter === "ALL" || l.electionId === electionFilter)
    .filter((l) => moduleFilter === "ALL" || l.module === moduleFilter)
    .filter((l) => roleFilter === "ALL" || l.actorRole === roleFilter)
    .filter((l) => resultFilter === "ALL" || l.result === resultFilter)
    .filter((l) => riskFilter === "ALL" || l.riskLevel === riskFilter)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  const stats = getAuditStats(logs);

  const activeFilterCount = [
    electionFilter,
    moduleFilter,
    roleFilter,
    resultFilter,
    riskFilter,
  ].filter((f) => f !== "ALL").length;

  function resetFilters() {
    setElectionFilter("ALL");
    setModuleFilter("ALL");
    setRoleFilter("ALL");
    setResultFilter("ALL");
    setRiskFilter("ALL");
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function exportSelected() {
    downloadCsv(
      `audit-logs-selected-${Date.now()}.csv`,
      buildAuditCsv(logs.filter((l) => selectedIds.has(l.id))),
    );
  }

  function exportAll() {
    downloadCsv(`audit-logs-${Date.now()}.csv`, buildAuditCsv(logs));
  }

  // Shared filter controls — rendered inline on desktop, inside a sheet on mobile
  const filterControls = (
    <>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[var(--sevs-text-muted)]">
          Election
        </label>
        <select
          value={electionFilter}
          onChange={(e) => setElectionFilter(e.target.value)}
          className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
        >
          <option value="ALL">All Elections</option>
          {electionOptions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[var(--sevs-text-muted)]">
          Event Type
        </label>
        <select
          value={moduleFilter}
          onChange={(e) =>
            setModuleFilter(e.target.value as AuditModule | "ALL")
          }
          className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
        >
          {MODULES.map((m) => (
            <option key={m} value={m}>
              {m === "ALL" ? "All Events" : m.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[var(--sevs-text-muted)]">
          User / Role
        </label>
        <select
          value={roleFilter}
          onChange={(e) =>
            setRoleFilter(e.target.value as AuditActorRole | "ALL")
          }
          className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r === "ALL"
                ? "All Users"
                : r === "SYSTEM"
                  ? "System"
                  : formatRoleLabel(r as never)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[var(--sevs-text-muted)]">
          Result
        </label>
        <select
          value={resultFilter}
          onChange={(e) =>
            setResultFilter(e.target.value as AuditResult | "ALL")
          }
          className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
        >
          {RESULTS.map((r) => (
            <option key={r} value={r}>
              {r === "ALL"
                ? "All Results"
                : r === "SUCCESS"
                  ? "Success"
                  : "Failed"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[var(--sevs-text-muted)]">
          Risk Level
        </label>
        <select
          value={riskFilter}
          onChange={(e) =>
            setRiskFilter(e.target.value as AuditRiskLevel | "ALL")
          }
          className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
        >
          {RISK_LEVELS.map((r) => (
            <option key={r} value={r}>
              {r === "ALL" ? "All Risk Levels" : r}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  return (
    <>
      <Topbar
        title="Audit Logs"
        subtitle="Tamper-evident record of security-sensitive operations"
      />

      <div className="space-y-5 p-4 sm:p-8">
        {isReadOnly && (
          <p className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700">
            {formatRoleLabel(member.role)} access is read-only — no actions can
            be taken from this page.
          </p>
        )}

        {/* Stats strip + header export */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between relative">
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Total Events"
              value={stats.totalEvents.toLocaleString()}
              icon={<ListChecks className="h-4 w-4" />}
              iconTone="navy"
              trend={{ direction: "up", pct: stats.totalDeltaPct }}
            />
            <StatCard
              label="Successful Events"
              value={stats.successfulEvents.toLocaleString()}
              icon={<ShieldCheck className="h-4 w-4" />}
              iconTone="green"
              trend={{ direction: "up", pct: stats.successfulDeltaPct }}
            />
            <StatCard
              label="Failed Events"
              value={stats.failedEvents.toLocaleString()}
              icon={<AlertTriangle className="h-4 w-4" />}
              iconTone="red"
              trend={{ direction: "up", pct: stats.failedDeltaPct }}
            />
            <StatCard
              label="High Risk Events"
              value={stats.highRiskEvents.toLocaleString()}
              icon={<ShieldAlert className="h-4 w-4" />}
              iconTone="amber"
              trend={{ direction: "up", pct: stats.highRiskDeltaPct }}
            />
          </div>

          <button
            onClick={() => setExportMenuOpen((v) => !v)}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--sevs-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
          >
            <Download className="h-4 w-4" /> Export Report
          </button>
          {exportMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setExportMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-[var(--sevs-border)] bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    exportAll();
                    setExportMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--sevs-bg)]"
                >
                  <span className="font-semibold text-[var(--sevs-navy)]">
                    Filtered results
                  </span>
                  <span className="block text-xs text-[var(--sevs-text-muted)]">
                    {logs.length} events matching current filters
                  </span>
                </button>
                <button
                  onClick={() => {
                    downloadCsv(
                      `audit-logs-all-${Date.now()}.csv`,
                      buildAuditCsv(mockAuditLogs),
                    );
                    setExportMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--sevs-bg)]"
                >
                  <span className="font-semibold text-[var(--sevs-navy)]">
                    Full audit log
                  </span>
                  <span className="block text-xs text-[var(--sevs-text-muted)]">
                    {mockAuditLogs.length} events, all filters ignored
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Desktop/tablet: inline filter grid */}
        <div className="hidden rounded-2xl border border-[var(--sevs-border)] bg-white p-4 sm:block sm:p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {filterControls}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="mt-3 text-xs font-bold text-[var(--sevs-navy)] hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Mobile: Filters button opening a sheet */}
        <div className="sm:hidden">
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--sevs-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--sevs-navy)]"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sevs-navy)] text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 sm:hidden"
              onClick={() => setFiltersOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-lg sm:hidden">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--sevs-navy)]">
                  Filters
                </h3>
                <button
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5 text-[var(--sevs-text-muted)]" />
                </button>
              </div>
              <div className="space-y-3">{filterControls}</div>
              <div className="mt-4 flex gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="flex-1 rounded-lg border border-[var(--sevs-border)] py-2.5 text-sm font-bold text-[var(--sevs-navy)]"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1 rounded-lg bg-[var(--sevs-navy)] py-2.5 text-sm font-bold text-white"
                >
                  Show {logs.length} Results
                </button>
              </div>
            </div>
          </>
        )}

        {/* Bulk selection bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-[var(--sevs-navy)]/5 px-4 py-3">
            <p className="text-sm font-semibold text-[var(--sevs-navy)]">
              {selectedIds.size} selected
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs font-semibold text-[var(--sevs-text-muted)] hover:underline"
              >
                Clear
              </button>
              <button
                onClick={exportSelected}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--sevs-navy)] px-3 py-1.5 text-xs font-bold text-white"
              >
                <Download className="h-3.5 w-3.5" /> Export Selected
              </button>
            </div>
          </div>
        )}

        {/* Table (desktop/tablet) + detail rail/sheet + mobile card list */}
        <div className="flex gap-5">
          <div className="min-w-0 flex-1 space-y-3">
            <AuditLogTable
              logs={logs}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onRowClick={setSelectedLog}
              selectedLogId={selectedLog?.id}
            />

            <div className="space-y-3 sm:hidden">
              {logs.length === 0 && (
                <p className="text-sm text-[var(--sevs-text-muted)]">
                  No matching audit events.
                </p>
              )}
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="block w-full text-left"
                >
                  <AuditLogRow log={log} />
                </button>
              ))}
            </div>
          </div>

          {selectedLog && (
            <EventDetailsPanel
              log={selectedLog}
              onClose={() => setSelectedLog(null)}
              onSelectRelated={(related) => setSelectedLog(related)}
            />
          )}
        </div>
      </div>
    </>
  );
}
