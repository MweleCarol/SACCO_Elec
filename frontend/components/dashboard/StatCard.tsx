import type { ReactNode } from "react";

// Define the props for the StatCard component
interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}

// StatCard component that displays a statistic with a label, value, optional hint, and optional icon.
export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sevs-text-muted)]">
          {label}
        </span>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-[var(--sevs-navy)]">{value}</p>
      {hint && <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">{hint}</p>}
    </div>
  );
}