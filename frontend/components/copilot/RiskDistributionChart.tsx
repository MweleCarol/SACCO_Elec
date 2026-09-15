"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import type { RiskLevel } from "@/types/ai-governance";

const COLORS: Record<RiskLevel, string> = { HIGH: "#dc2626", MEDIUM: "#d97706", LOW: "#16a34a" };

interface RiskDistributionChartProps {
  data: { level: RiskLevel; count: number }[];
}

export function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="level" innerRadius={55} outerRadius={80} paddingAngle={2}>
            {data.map((d) => <Cell key={d.level} fill={COLORS[d.level]} />)}
          </Pie>
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) => value.charAt(0) + value.slice(1).toLowerCase()}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[35%] -translate-y-1/2 text-center">
        <p className="text-2xl font-extrabold text-[var(--sevs-navy)]">{total}</p>
        <p className="text-[10px] font-semibold uppercase text-[var(--sevs-text-muted)]">Total Alerts</p>
      </div>
    </div>
  );
}