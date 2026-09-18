"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import type { NotificationRecord } from "@/types/notification";

interface NotificationPanelProps {
  notifications: NotificationRecord[];
}

export function NotificationPanel({ notifications }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative" aria-label="Notifications">
        <Bell className="h-5 w-5 text-[var(--sevs-text-muted)]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:rounded-2xl sm:p-3">
            <p className="mb-2 px-1 text-sm font-bold text-[var(--sevs-navy)]">Notifications</p>
            {notifications.length === 0 ? (
              <p className="px-1 py-4 text-sm text-[var(--sevs-text-muted)]">You&apos;re all caught up.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`rounded-lg px-3 py-2.5 text-sm ${n.read ? "" : "bg-[var(--sevs-bg)]"}`}>
                  <p className="font-medium text-[var(--sevs-navy)]">{n.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--sevs-text-muted)]">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}