
export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string; // display name, e.g. "Admin User" or "AI Governance"
  actorId: string; // Member.id or system identifier
  targetLabel?: string;
  timestamp: string; // ISO date string
  hash: string; // tamper-evident audit hash (SHA-256 in production)
}