"use client";

import { X, Copy, Link2 } from "lucide-react";
import type { AuditLogEntry } from "@/types/audit-log";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getRelatedAuditLogs } from "@/services/mock/audit-logs";

interface EventDetailsPanelProps {
  log: AuditLogEntry;
  onClose: () => void;
  onSelectRelated: (log: AuditLogEntry) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="shrink-0 text-[var(--sevs-text-muted)]">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-[var(--sevs-navy)]">{value}</span>
    </div>
  );
}

export function EventDetailsPanel({ log, onClose, onSelectRelated }: EventDetailsPanelProps) {
  const related = getRelatedAuditLogs(log);

 const [copied, setCopied] = useState(false);

async function copyHash() {
  try {
    await navigator.clipboard.writeText(log.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  } catch {
    // Clipboard API can fail without permission or in non-secure contexts — fail silently, no destructive effect.
  }
}

const content = (
    <>
      <div className="flex items-center justify-between border-b border-[var(--sevs-border)] px-5 py-4">
        <h3 className="text-sm font-bold text-[var(--sevs-navy)]">Event Details</h3>
        <button onClick={onClose} aria-label="Close details">
          <X className="h-5 w-5 text-[var(--sevs-text-muted)]" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words font-bold text-[var(--sevs-navy)]">{log.action}</p>
            {log.description && <p className="mt-0.5 break-words text-sm text-[var(--sevs-text-muted)]">{log.description}</p>}
          </div>
          <StatusBadge status={log.result} />
        </div>

        <div className="divide-y divide-[var(--sevs-border)]">
          <DetailRow label="Timestamp" value={new Date(log.timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} />
          <DetailRow label="User" value={log.actor} />
          <DetailRow label="Role" value={<StatusBadge status={log.actorRole} />} />
          <DetailRow label="Election" value={log.electionTitle ?? "—"} />
          {log.ipAddress && <DetailRow label="IP Address" value={log.ipAddress} />}
          {log.device && <DetailRow label="Device" value={log.device} />}
          <DetailRow label="Risk Level" value={<StatusBadge status={log.riskLevel} />} />
        </div>

        {hasAdditionalInfo && (
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Additional Information</h4>
            <div className="divide-y divide-[var(--sevs-border)]">
              {log.ballotReference && <DetailRow label="Ballot Reference" value={log.ballotReference} />}
              {log.statusNote && <DetailRow label="Status" value={log.statusNote} />}
              <div className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-[var(--sevs-text-muted)]">Audit Hash</span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-mono text-xs text-[var(--sevs-navy)]" title={log.hash}>{log.hash}</span>
                  <button
                    onClick={copyHash}
                    aria-label={copied ? "Hash copied" : "Copy audit hash"}
                    className={`flex shrink-0 items-center gap-1 text-xs font-semibold transition-colors ${
                      copied ? "text-emerald-600" : "text-[var(--sevs-text-muted)] hover:text-[var(--sevs-navy)]"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied
                      </>
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {log.aiInsight && (
          <div className="rounded-lg bg-emerald-50 px-4 py-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-700">AI Insight</p>
            <p className="text-sm text-emerald-800">{log.aiInsight}</p>
          </div>
        )}

        {related.length > 0 && (
          <button
            onClick={() => onSelectRelated(related[0])}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--sevs-border)] py-2.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
          >
            <Link2 className="h-4 w-4" /> View Related Events ({related.length})
          </button>
        )}
      </div>
    </>
  );
}