"use client";

import Link from "next/link";
import type { Notification, UserRole } from "@/types/api";
import { NotificationItem } from "@/components/voter/NotificationItem";

interface NotificationPanelProps {
  notifications: Notification[] | undefined; // undefined while loading
  role: UserRole;
  onOpen: (n: Notification) => void;
  onClose: () => void;
}

// The dropdown panel only. The bell button that opens it lives in Topbar,
// which also handles closing on Escape and on clicks outside.
export function NotificationPanel({
  notifications,
  role,
  onOpen,
  onClose,
}: NotificationPanelProps) {
  return (
    <>
      {/* On phones the panel is a bottom sheet; tapping the backdrop closes it. */}
      <div
        className="fixed inset-0 z-40 bg-black/30 sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="region"
        aria-label="Recent notifications"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:rounded-2xl sm:p-3"
      >
        <p className="mb-2 px-1 text-sm font-bold text-[var(--sevs-navy)]">
          Notifications
        </p>
        {notifications === undefined ? (
          <p
            role="status"
            className="px-1 py-4 text-sm text-[var(--sevs-text-muted)]"
          >
            Loading…
          </p>
        ) : notifications.length === 0 ? (
          <p className="px-1 py-4 text-sm text-[var(--sevs-text-muted)]">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="space-y-1">
            {notifications.map((n) => (
              <li key={n.id}>
                <NotificationItem
                  notification={n}
                  role={role}
                  compact
                  onOpen={(x) => {
                    onOpen(x);
                    onClose();
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/notifications"
          onClick={onClose}
          className="mt-2 block rounded-lg px-3 py-2 text-center text-sm font-bold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
        >
          View all notifications
        </Link>
      </div>
    </>
  );
}
