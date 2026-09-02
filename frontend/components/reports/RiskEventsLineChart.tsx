"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export function RiskEventsLineChart({ data }: { data: { label: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--sevs-text-muted)]">No risk events recorded yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -20, right: 10 }}>
        <CartesianGrid vertical={false} stroke="#e3e6eb" strokeDasharray="4 4" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}