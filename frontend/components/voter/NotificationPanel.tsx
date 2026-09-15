"use client";

import Link from "next/link";
import type { Notification } from "@/types/notification";

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
}

export function NotificationPanel({ notifications, onClose }: NotificationPanelProps) {
  return (
    <>
      {/* Backdrop: dims on mobile (sheet feel), invisible-but-click-catching on desktop */}
      <div className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent" onClick={onClose} />

      <div
        role="dialog"
        aria-label="Notifications"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-[var(--sevs-border)] bg-white shadow-lg sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-96 sm:w-80 sm:rounded-xl sm:border"
      >
        <div className="flex items-center justify-between border-b border-[var(--sevs-border)] px-4 py-3">
          <h3 className="text-sm font-bold text-[var(--sevs-navy)]">Notifications</h3>
          <button onClick={onClose} className="text-xs font-semibold text-[var(--sevs-text-muted)] sm:hidden">
            Close
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--sevs-text-muted)]">
            You&apos;re all caught up.
          </p>
        ) : (
          <div className="divide-y divide-[var(--sevs-border)]">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href="/notifications"
                onClick={onClose}
                className="flex items-start gap-2 px-4 py-3 hover:bg-[var(--sevs-bg)]"
              >
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />}
                <div className={`min-w-0 ${n.read ? "pl-4" : ""}`}>
                  <p className="break-words text-sm font-semibold text-[var(--sevs-navy)]">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 break-words text-xs text-[var(--sevs-text-muted)]">
                    {n.message}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/notifications"
          onClick={onClose}
          className="block border-t border-[var(--sevs-border)] px-4 py-3 text-center text-sm font-bold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
        >
          View all
        </Link>
      </div>
    </>
  );
}