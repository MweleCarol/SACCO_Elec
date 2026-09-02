"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";

const COLORS: Record<string, string> = {
  Approved: "#16a34a",
  Pending: "#d97706",
  "Awaiting Co-Approval": "#13284a",
  Rejected: "#dc2626",
};

export function DatApprovalStatusChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -20, right: 10 }}>
        <CartesianGrid vertical={false} stroke="#e3e6eb" />
        <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: "#f5f7fa" }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((d) => <Cell key={d.status} fill={COLORS[d.status] ?? "#13284a"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}