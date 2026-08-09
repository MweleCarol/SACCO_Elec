"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";

type Election = {
  id: string;
  title: string;
  description: string;
  status: "active" | "upcoming" | "closed";
  window: string;
  seats: number;
  candidates: number;
  hasVoted: boolean;
};

// Mock data — replace with data fetched from the elections API.
const ELECTIONS: Election[] = [
  {
    id: "el-2026-agm",
    title: "2026 Annual Board Elections",
    description: "Electing Chairperson, Treasurer, and Secretary for the 2026/2027 term.",
    status: "active",
    window: "Closes 24 Jul 2026, 5:00 PM",
    seats: 3,
    candidates: 7,
    hasVoted: false,
  },
  {
    id: "el-2026-supervisory",
    title: "Supervisory Committee By-Election",
    description: "Filling one vacant seat on the Supervisory Committee.",
    status: "upcoming",
    window: "Opens 1 Aug 2026, 8:00 AM",
    seats: 1,
    candidates: 2,
    hasVoted: false,
  },
  {
    id: "el-2025-agm",
    title: "2025 Annual Board Elections",
    description: "Chairperson, Treasurer, and Secretary — 2025/2026 term.",
    status: "closed",
    window: "Closed 22 Jul 2025",
    seats: 3,
    candidates: 6,
    hasVoted: true,
  },
];

const TABS = [
  { key: "active", label: "Open" },
  { key: "upcoming", label: "Upcoming" },
  { key: "closed", label: "Closed" },
] as const;

function StatusBadge({ status }: { status: Election["status"] }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    upcoming: "bg-amber-50 text-amber-700",
    closed: "bg-slate-100 text-slate-500",
  } as const;
  const label = { active: "Open now", upcoming: "Upcoming", closed: "Closed" } as const;
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  );
}

export default function ElectionsPage() {
  const [tab, setTab] = React.useState<Election["status"]>("active");
  const filtered = ELECTIONS.filter((e) => e.status === tab);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Elections</h1>
        <p className="mt-1 text-sm text-slate-500">Review and cast your vote in open SACCO elections.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1 sm:inline-flex sm:self-start">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition sm:flex-none ${
              tab === t.key ? "bg-white text-[#0C1657] shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-500">No {tab} elections right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((election) => (
            <div key={election.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 sm:text-base">{election.title}</h2>
                    <StatusBadge status={election.status} />
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">{election.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {election.window}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {election.candidates} candidates · {election.seats} seat{election.seats > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {election.status === "active" && (
                    <Link
                      href={`/elections/${election.id}`}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto ${
                        election.hasVoted
                          ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          : "bg-[#0C1657] text-white hover:bg-[#0C1657]/90"
                      }`}
                    >
                      {election.hasVoted ? "View receipt" : "Cast your vote"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  {election.status === "closed" && (
                    <Link
                      href={`/elections/${election.id}`}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:w-auto"
                    >
                      {election.hasVoted && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      {election.hasVoted ? "View results & receipt" : "View results"}
                    </Link>
                  )}
                  {election.status === "upcoming" && (
                    <span className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400">
                      Not yet open
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}