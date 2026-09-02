import { ScrollText } from "lucide-react";
import type { AuditLogEntry } from "@/types/audit-log";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AuditLogRow({ log }: { log: AuditLogEntry }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:p-5">
      <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sevs-navy)]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold text-[var(--sevs-navy)]">{log.action}</p>
          {log.riskLevel && <StatusBadge status={log.riskLevel} />}
        </div>
        {log.targetLabel && <p className="mt-1 text-sm text-[var(--sevs-text-body)]">{log.targetLabel}</p>}
        <p className="mt-1 text-xs text-[var(--sevs-text-muted)]">
          {log.actor} · {log.module ?? "—"} ·{" "}
          {new Date(log.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-1 truncate font-mono text-[10px] text-[var(--sevs-text-muted)]" title={log.hash}>
          Hash: {log.hash}
        </p>
      </div>
    </div>
  );
}
