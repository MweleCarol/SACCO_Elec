"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMarkAllRead,
  useMarkRead,
  useNotificationList,
  useUnreadCount,
} from "@/hooks/useNotifications";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { NotificationItem } from "@/components/voter/NotificationItem";
import {
  EmptyState,
  ErrorPanel,
  LoadingCards,
} from "@/components/ui/LoadState";

// Every notification for the logged-in user, newest first. Works for every
// role: the backend only ever returns the caller's own notifications.
export default function NotificationsPage() {
  const { user } = useAuth();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useNotificationList(unreadOnly);
  const unread = useUnreadCount().data ?? 0;
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  if (!user) return null; // AppShell handles the redirect

  const items = list.data?.pages.flatMap((p) => p.notifications) ?? [];

  return (
    <>
      <Topbar
        title="Notifications"
        subtitle="Election updates and account activity"
      />

      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filter notifications"
            className="flex gap-2"
          >
            {[
              { key: false, label: "All" },
              { key: true, label: `Unread (${unread})` },
            ].map(({ key, label }) => (
              <button
                key={String(key)}
                role="tab"
                aria-selected={unreadOnly === key}
                onClick={() => setUnreadOnly(key)}
                className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
                  unreadOnly === key
                    ? "border-[var(--sevs-navy)] bg-[var(--sevs-navy)] text-white"
                    : "border-[var(--sevs-border)] bg-white text-[var(--sevs-text-muted)] hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
            className="flex items-center gap-2 rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all as read
          </button>
        </div>

        {markAll.isError && (
          <ErrorPanel message={getApiErrorMessage(markAll.error)} />
        )}
        {list.isLoading && (
          <LoadingCards count={3} label="Loading notifications…" />
        )}
        {list.isError && (
          <ErrorPanel
            message={getApiErrorMessage(list.error)}
            onRetry={() => list.refetch()}
          />
        )}

        {list.isSuccess && items.length === 0 && (
          <EmptyState
            title={
              unreadOnly ? "No unread notifications" : "No notifications yet"
            }
          >
            {unreadOnly
              ? "You're all caught up."
              : "You'll be notified when voting opens, closes, and when results are published."}
          </EmptyState>
        )}

        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationItem
                notification={n}
                role={user.role}
                onOpen={(x) => {
                  if (!x.read) markRead.mutate(x.id);
                }}
              />
            </li>
          ))}
        </ul>

        {list.hasNextPage && (
          <div className="text-center">
            <button
              onClick={() => list.fetchNextPage()}
              disabled={list.isFetchingNextPage}
              className="rounded-lg border border-[var(--sevs-border)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50 disabled:opacity-50"
            >
              {list.isFetchingNextPage
                ? "Loading…"
                : "Show older notifications"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
