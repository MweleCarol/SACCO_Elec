"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

interface CandidatesByStatusChartProps {
  data: { status: string; count: number }[];
}

export function CandidatesByStatusChart({ data }: CandidatesByStatusChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -20, right: 10 }}>
        <CartesianGrid vertical={false} stroke="#e3e6eb" />
        <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: "#f5f7fa" }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="count" fill="#13284a" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}