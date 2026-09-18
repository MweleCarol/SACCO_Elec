import type { AuditLogEntry } from "@/types/audit-log";

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildAuditCsv(logs: AuditLogEntry[]): string {
  const headers = ["Timestamp", "Event", "Actor", "Role", "Election", "Result", "Risk Level", "Hash"];
  const rows = logs.map((l) => [
    new Date(l.timestamp).toISOString(),
    l.action,
    l.actor,
    l.actorRole,
    l.electionTitle ?? "",
    l.result,
    l.riskLevel,
    l.hash,
  ]);
  return [headers, ...rows].map((row) => row.map((f) => escapeCsvField(String(f))).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}