import { Vote, ClipboardCheck, ShieldAlert, Bell } from "lucide-react";
import type { NotificationRecord, NotificationType } from "@/types/notification";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  ELECTION: Vote,
  APPROVAL: ClipboardCheck,
  SECURITY: ShieldAlert,
  SYSTEM: Bell,
};

interface NotificationRowProps {
  notification: NotificationRecord;
}

export function NotificationRow({ notification }: NotificationRowProps) {
  const Icon = TYPE_ICON[notification.type];

  return (
    <div
      className={`flex gap-4 rounded-2xl border p-5 shadow-sm ${
        notification.read ? "border-[var(--sevs-border)] bg-white" : "border-[var(--sevs-navy)]/20 bg-[var(--sevs-navy)]/[0.03]"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)]/10">
        <Icon className="h-4 w-4 text-[var(--sevs-navy)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-bold text-[var(--sevs-navy)]">{notification.title}</h4>
          {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
        </div>
        <p className="mt-1 text-sm text-[var(--sevs-text-body)]">{notification.message}</p>
        <p className="mt-2 text-xs text-[var(--sevs-text-muted)]">
          {new Date(notification.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}