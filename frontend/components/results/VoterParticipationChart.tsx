"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { VoteTimelinePoint } from "@/types/result";

export function VoterParticipationChart({ data }: { data: VoteTimelinePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-52 items-center justify-center text-sm text-[var(--sevs-text-muted)]">
        No participation timeline available for this election.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e6eb" />
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid var(--sevs-border)", fontSize: 12 }}
          formatter={(value: number) => [`${value.toLocaleString()} votes`, "Cumulative"]}
        />
        <Line type="monotone" dataKey="votes" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}