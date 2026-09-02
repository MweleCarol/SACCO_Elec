"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface ParticipationChartProps {
  eligible: number;
  votesCast: number;
}

const COLORS = ["#13284a", "#e3e6eb"];

export function ParticipationChart({ eligible, votesCast }: ParticipationChartProps) {
  const notVoted = Math.max(0, eligible - votesCast);
  const data = [
    { name: "Voted", value: votesCast },
    { name: "Not yet voted", value: notVoted },
  ];
  const pct = eligible > 0 ? Math.round((votesCast / eligible) * 100) : 0;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
        <p className="text-2xl font-extrabold text-[var(--sevs-navy)]">{pct}%</p>
        <p className="text-[10px] font-semibold uppercase text-[var(--sevs-text-muted)]">Turnout</p>
      </div>
    </div>
  );
}