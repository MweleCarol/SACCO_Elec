"use client";

import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { NotificationRow } from "@/components/voter/NotificationRow";
import { getNotificationsByMember } from "@/services/mock/notifications";

export default function NotificationsPage() {
  const { member, isLoading } = useCurrentMember();

  if (isLoading) return null;

  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">
            Log in
          </a>{" "}
          to view notifications.
        </p>
      </div>
    );
  }

  const notifications = getNotificationsByMember(member.id);

  return (
    <>
      <Topbar title="Notifications" subtitle="Election updates and account activity" />

      <div className="space-y-3 p-8">
        {notifications.length === 0 && (
          <p className="text-sm text-[var(--sevs-text-muted)]">You&apos;re all caught up — no notifications.</p>
        )}
        {notifications.map((n) => (
          <NotificationRow key={n.id} notification={n} />
        ))}
      </div>
    </>
  );
}