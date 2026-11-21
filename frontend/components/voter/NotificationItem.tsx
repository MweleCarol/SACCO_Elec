"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Trophy,
  UserCheck,
  Vote,
} from "lucide-react";
import type { Notification, NotificationType, UserRole } from "@/types/api";
import { notificationHref, timeAgo } from "@/lib/notificationLink";

const ICONS: Partial<Record<NotificationType, typeof Bell>> = {
  ELECTION_SCHEDULED: Vote,
  ELECTION_ACTIVATED: Vote,
  ELECTION_CLOSING_SOON: Vote,
  ELECTION_CLOSED: CheckCircle2,
  RESULTS_PUBLISHED: Trophy,
  APPROVAL_REQUESTED: ClipboardCheck,
  APPROVAL_DECIDED: ClipboardCheck,
  CANDIDATE_STATUS_CHANGED: UserCheck,
};

interface Props {
  notification: Notification;
  role: UserRole;
  compact?: boolean; // the bell's dropdown
  onOpen: (n: Notification) => void; // marks it read
}

// One notification. Unread ones have a tinted background, a dot, and the
// words "Unread:" for screen readers (colour is never the only signal).
// The whole row is one link when there is somewhere to go.
export function NotificationItem({
  notification: n,
  role,
  compact = false,
  onOpen,
}: Props) {
  const Icon = ICONS[n.type] ?? Bell;
  const href = notificationHref(n, role);

  const body = (
    <>
      <span
        aria-hidden="true"
        className={clsx(
          "flex shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)]/10 text-[var(--sevs-navy)]",
          compact ? "h-8 w-8" : "h-9 w-9",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span
            className={clsx(
              "text-sm text-[var(--sevs-navy)]",
              n.read ? "font-medium" : "font-bold",
            )}
          >
            {!n.read && <span className="sr-only">Unread: </span>}
            {n.title}
          </span>
          {!n.read && (
            <span
              aria-hidden="true"
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500"
            />
          )}
        </span>
        <span
          className={clsx(
            "mt-0.5 block text-[var(--sevs-text-body)]",
            compact ? "line-clamp-2 text-xs" : "text-sm",
          )}
        >
          {n.message}
        </span>
        <span className="mt-1 block text-xs text-gray-600">
          <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
        </span>
      </span>
    </>
  );

  const box = clsx(
    "flex w-full gap-3 text-left",
    compact ? "rounded-lg px-3 py-2.5" : "rounded-2xl border p-4 sm:p-5",
    !compact &&
      (n.read
        ? "border-[var(--sevs-border)] bg-white"
        : "border-[var(--sevs-navy)]/20 bg-[var(--sevs-navy)]/[0.04]"),
    compact && !n.read && "bg-[var(--sevs-bg)]",
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={() => onOpen(n)}
        className={clsx(box, "hover:bg-gray-50")}
      >
        {body}
      </Link>
    );
  }
  if (!n.read) {
    return (
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={clsx(box, "hover:bg-gray-50")}
      >
        {body}
      </button>
    );
  }
  return <div className={box}>{body}</div>;
}
