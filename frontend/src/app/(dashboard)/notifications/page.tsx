"use client";

import * as React from "react";
import { Bell, Vote, ShieldCheck, UserCog, CheckCheck } from "lucide-react";

type Notification = {
  id: string;
  type: "election" | "security" | "account";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

// Mock — replace with data fetched from the notifications API.
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "election",
    title: "Voting opens today",
    message: "The 2026 Annual Board Elections ballot is now open. You have until 24 Jul, 5:00 PM to vote.",
    createdAt: "2h ago",
    read: false,
  },
  {
    id: "n2",
    type: "security",
    title: "OTP verification updated",
    message: "Your two-factor authentication method was confirmed on a new device.",
    createdAt: "1d ago",
    read: false,
  },
  {
    id: "n3",
    type: "account",
    title: "Membership renewed",
    message: "Your SACCO membership was renewed for the 2026 calendar year.",
    createdAt: "3d ago",
    read: false,
  },
  {
    id: "n4",
    type: "election",
    title: "Supervisory Committee by-election announced",
    message: "Nominations are open until 25 Jul 2026. Voting begins 1 Aug 2026.",
    createdAt: "5d ago",
    read: true,
  },
  {
    id: "n5",
    type: "account",
    title: "Profile phone number updated",
    message: "Your registered phone number was changed successfully.",
    createdAt: "2w ago",
    read: true,
  },
];

const ICONS = { election: Vote, security: ShieldCheck, account: UserCog } as const;

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState(INITIAL_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <Bell className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const Icon = ICONS[n.type];
              return (
                <li
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex cursor-pointer items-start gap-3 px-5 py-4 transition hover:bg-slate-50 ${
                    !n.read ? "bg-[#0C1657]/[0.03]" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      n.read ? "bg-slate-100" : "bg-[#0C1657]/10"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${n.read ? "text-slate-400" : "text-[#0C1657]"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${n.read ? "font-medium text-slate-700" : "font-semibold text-slate-900"}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-slate-400">{n.createdAt}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0C1657]" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}