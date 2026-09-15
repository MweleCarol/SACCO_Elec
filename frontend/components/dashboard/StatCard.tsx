import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  const isShortValue = typeof value === "number" || value.length <= 5;

  return (
    <div className="min-w-0 rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sevs-text-muted)]">
          {label}
        </span>
        {icon && <span className="shrink-0">{icon}</span>}
      </div>
      <p
        className={`mt-3 break-words font-extrabold leading-tight text-[var(--sevs-navy)] ${
          isShortValue ? "text-3xl" : "text-xl"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">{hint}</p>}
    </div>
  );
}