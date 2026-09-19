-"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

export function TurnoutDonut({ voted, notVoted }: { voted: number; notVoted: number }) {
  const total = voted + notVoted;
  const pct = total > 0 ? Math.round((voted / total) * 100) : 0;
  const data = [{ name: "Voted", value: voted }, { name: "Did not vote", value: notVoted }];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2}>
            <Cell fill="#0d9488" stroke="#fff" strokeWidth={2} />
            <Cell fill="#94a3b8" stroke="#fff" strokeWidth={2} />
          </Pie>
          <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[35%] -translate-y-1/2 text-center">
        <p className="text-2xl font-extrabold text-[var(--sevs-navy)]">{pct}%</p>
        <p className="text-[10px] font-semibold uppercase text-[var(--sevs-text-muted)]">Turnout</p>
      </div>
    </div>
  );
}