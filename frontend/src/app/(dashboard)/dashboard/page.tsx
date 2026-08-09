"use client";

import Link from "next/link";
import { Vote, CheckCircle2, Clock, ArrowRight, Bell } from "lucide-react";

type ElectionPreview = {
  id: string;
  title: string;
  status: "active" | "upcoming" | "closed";
  closesAt: string;
  hasVoted: boolean;
  seats: number;
};

type NotificationPreview = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

// Mock data — replace with data fetched from the elections & notifications APIs.
const MEMBER_NAME = "Wanjiru";

const ELECTIONS: ElectionPreview[] = [
  {
    id: "el-2026-agm",
    title: "2026 Annual Board Elections",
    status: "active",
    closesAt: "24 Jul 2026, 5:00 PM",
    hasVoted: false,
    seats: 3,
  },
  {
    id: "el-2026-supervisory",
    title: "Supervisory Committee By-Election",
    status: "upcoming",
    closesAt: "Opens 1 Aug 2026",
    hasVoted: false,
    seats: 1,
  },
];

const NOTIFICATIONS: NotificationPreview[] = [
  {
    id: "n1",
    title: "Voting opens today",
    message: "The 2026 Annual Board Elections ballot is now open.",
    createdAt: "2h ago",
    read: false,
  },
  {
    id: "n2",
    title: "OTP verification updated",
    message: "Your two-factor method was confirmed on a new device.",
    createdAt: "1d ago",
    read: false,
  },
  {
    id: "n3",
    title: "Membership renewed",
    message: "Your SACCO membership was renewed for 2026.",
    createdAt: "3d ago",
    read: true,
  },
];

const STATS = [
  { label: "Open elections", value: ELECTIONS.filter((e) => e.status === "active").length, icon: Vote },
  { label: "Votes cast (2026)", value: 2, icon: CheckCircle2 },
  { label: "Pending action", value: ELECTIONS.filter((e) => e.status === "active" && !e.hasVoted).length, icon: Clock },
];

function StatusBadge({ status }: { status: ElectionPreview["status"] }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    upcoming: "bg-amber-50 text-amber-700",
    closed: "bg-slate-100 text-slate-500",
  } as const;
  const label = { active: "Open now", upcoming: "Upcoming", closed: "Closed" } as const;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  );
}

export default function DashboardOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Welcome back, {MEMBER_NAME}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0C1657]/5">
              <Icon className="h-5 w-5 text-[#0C1657]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active elections */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Your elections</h2>
          <Link href="/elections" className="flex items-center gap-1 text-xs font-medium text-[#0C1657] hover:underline">
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {ELECTIONS.map((election) => (
            <li key={election.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{election.title}</p>
                  <StatusBadge status={election.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {election.seats} seat{election.seats > 1 ? "s" : ""} · {election.closesAt}
                </p>
              </div>
              {election.status === "active" ? (
                <Link
                  href={`/elections/${election.id}`}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    election.hasVoted
                      ? "bg-slate-100 text-slate-500"
                      : "bg-[#0C1657] text-white hover:bg-[#0C1657]/90"
                  }`}
                >
                  {election.hasVoted ? "View receipt" : "Cast your vote"}
                </Link>
              ) : (
                <span className="text-xs font-medium text-slate-400">Not yet open</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Recent notifications */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent notifications</h2>
          <Link href="/notifications" className="flex items-center gap-1 text-xs font-medium text-[#0C1657] hover:underline">
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {NOTIFICATIONS.slice(0, 3).map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-5 py-4">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.read ? "bg-slate-100" : "bg-[#0C1657]/5"}`}>
                <Bell className={`h-4 w-4 ${n.read ? "text-slate-400" : "text-[#0C1657]"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <span className="shrink-0 text-xs text-slate-400">{n.createdAt}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}