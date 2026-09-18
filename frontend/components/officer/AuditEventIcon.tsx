import { Vote, ShieldAlert, CheckCircle2, XCircle, ClipboardCheck, LogIn, UserPlus, Settings2, Users, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import type { AuditEventType } from "@/types/audit-log";

const EVENT_ICON_MAP: Record<AuditEventType, { icon: typeof Vote; tone: string }> = {
  VOTE_CAST: { icon: Vote, tone: "bg-violet-50 text-violet-600" },
  LOGIN: { icon: LogIn, tone: "bg-blue-50 text-blue-600" },
  AUTH_FAILURE: { icon: XCircle, tone: "bg-red-50 text-red-600" },
  SECURITY_ALERT: { icon: AlertTriangle, tone: "bg-red-50 text-red-600" },
  CANDIDATE_APPLICATION: { icon: UserPlus, tone: "bg-blue-50 text-blue-600" },
  CANDIDATE_APPROVED: { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
  CANDIDATE_REJECTED: { icon: XCircle, tone: "bg-red-50 text-red-600" },
  APPROVAL_SUBMITTED: { icon: ClipboardCheck, tone: "bg-blue-50 text-blue-600" },
  DAT_APPROVAL: { icon: ClipboardCheck, tone: "bg-emerald-50 text-emerald-600" },
  ELECTION_CREATED: { icon: Settings2, tone: "bg-blue-50 text-blue-600" },
  ELECTION_CONFIG_CHANGED: { icon: Settings2, tone: "bg-amber-50 text-amber-600" },
  RESULTS_PUBLISHED: { icon: TrendingUp, tone: "bg-emerald-50 text-emerald-600" },
  RISK_ALERT: { icon: ShieldAlert, tone: "bg-amber-50 text-amber-600" },
  USER_UPDATED: { icon: Users, tone: "bg-amber-50 text-amber-600" },
  MEMBERSHIP_SYNC: { icon: RefreshCw, tone: "bg-gray-100 text-gray-600" },
};

export function AuditEventIcon({ type }: { type: AuditEventType }) {
  const entry = EVENT_ICON_MAP[type] ?? { icon: ClipboardCheck, tone: "bg-gray-100 text-gray-600" };
  const Icon = entry.icon;
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${entry.tone}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}