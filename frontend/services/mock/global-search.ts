import { mockAuditLogs } from "@/services/mock/audit-logs";
import { searchMembers } from "@/services/mock/members";
import { getAuditElectionOptions } from "@/services/mock/audit-logs";

export interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  group: "Audit Events" | "Users" | "Elections";
}

const MAX_PER_GROUP = 4;

export function searchGlobal(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const auditResults: SearchResult[] = mockAuditLogs
    .filter((l) => l.action.toLowerCase().includes(q) || l.actor.toLowerCase().includes(q) || (l.electionTitle ?? "").toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map((l) => ({
      id: l.id,
      label: l.action,
      sublabel: `${l.actor} · ${new Date(l.timestamp).toLocaleDateString()}`,
      href: `/audit-logs?logId=${l.id}`,
      group: "Audit Events",
    }));

  const userResults: SearchResult[] = searchMembers(q)
    .slice(0, MAX_PER_GROUP)
    .map((m) => ({
      id: m.id,
      label: m.name,
      sublabel: m.email,
      href: `/users/${m.id}`,
      group: "Users",
    }));

  // Elections: currently limited to titles that already appear in audit logs.
  // See open question — needs a real elections search function to cover all elections.
  const electionResults: SearchResult[] = getAuditElectionOptions()
    .filter((e) => e.title.toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map((e) => ({
      id: e.id,
      label: e.title,
      href: `/elections/${e.id}`,
      group: "Elections",
    }));

  return [...auditResults, ...electionResults, ...userResults];
}