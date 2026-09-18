"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { AuditLogEntry } from "@/types/audit-log";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuditEventIcon } from "@/components/officer/AuditEventIcon";

type SortKey = "timestamp" | "action" | "actor" | "actorRole" | "electionTitle" | "result" | "riskLevel";
const PAGE_SIZE = 10;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "timestamp", label: "Timestamp" },
  { key: "action", label: "Event" },
  { key: "actor", label: "User" },
  { key: "actorRole", label: "Role" },
  { key: "electionTitle", label: "Election" },
  { key: "result", label: "Result" },
  { key: "riskLevel", label: "Risk" },
];

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onRowClick: (log: AuditLogEntry) => void;
  selectedLogId?: string;
}

export function AuditLogTable({ logs, selectedIds, onToggleSelect, onToggleSelectAll, onRowClick, selectedLogId }: AuditLogTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "timestamp", direction: "desc" });
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const copy = [...logs];
    copy.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      const cmp = sort.key === "timestamp"
        ? new Date(av as string).getTime() - new Date(bv as string).getTime()
        : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [logs, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageIds = pageItems.map((l) => l.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  function handleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }));
    setPage(1);
  }

  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm sm:block">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--sevs-border)] text-xs uppercase tracking-wide text-[var(--sevs-text-muted)]">
            <th className="w-10 px-4 py-3">
              <input type="checkbox" checked={allOnPageSelected} onChange={() => onToggleSelectAll(pageIds)} className="h-4 w-4" aria-label="Select all rows on this page" />
            </th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="px-4 py-3 font-semibold">
                <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-[var(--sevs-navy)]">
                  {col.label}
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--sevs-border)]">
          {pageItems.map((log) => (
            <tr key={log.id} onClick={() => onRowClick(log)} className={`cursor-pointer hover:bg-[var(--sevs-bg)] ${selectedLogId === log.id ? "bg-[var(--sevs-bg)]" : ""}`}>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selectedIds.has(log.id)} onChange={() => onToggleSelect(log.id)} className="h-4 w-4" aria-label={`Select ${log.action}`} />
              </td>
              <td className="px-4 py-3 text-xs text-[var(--sevs-text-muted)]">
                {new Date(log.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <AuditEventIcon type={log.eventType} />
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-[var(--sevs-navy)]">{log.action}</p>
                    {log.description && <p className="break-words text-xs text-[var(--sevs-text-muted)]">{log.description}</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-[var(--sevs-text-body)]">{log.actor}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-[var(--sevs-navy)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--sevs-navy)]">
                  {log.actorRole === "SYSTEM" ? "System" : log.actorRole.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--sevs-text-body)]">{log.electionTitle ?? "—"}</td>
              <td className="px-4 py-3"><StatusBadge status={log.result} /></td>
              <td className="px-4 py-3"><StatusBadge status={log.riskLevel} /></td>
            </tr>
          ))}
          {pageItems.length === 0 && (
            <tr><td colSpan={COLUMNS.length + 1} className="px-4 py-6 text-center text-sm text-[var(--sevs-text-muted)]">No matching audit events.</td></tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-[var(--sevs-border)] px-4 py-3 text-sm text-[var(--sevs-text-muted)]">
        <p>Showing {sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length} events</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-lg px-3 py-1.5 font-semibold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)] disabled:opacity-40">‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`rounded-lg px-3 py-1.5 font-semibold ${p === currentPage ? "bg-[var(--sevs-navy)] text-white" : "text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"}`}>{p}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-lg px-3 py-1.5 font-semibold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)] disabled:opacity-40">›</button>
        </div>
      </div>
    </div>
  );
}