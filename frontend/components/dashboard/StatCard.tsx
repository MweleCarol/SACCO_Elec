import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type IconTone = "navy" | "green" | "red" | "amber";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  /** Tints the icon's background tile. Defaults to the existing untinted style. */
  iconTone?: IconTone;
  /** Trend delta vs. a prior period, e.g. { direction: "up", pct: 12 }. */
  trend?: { direction: "up" | "down"; pct: number };
}

const ICON_TILE_STYLES: Record<IconTone, string> = {
  navy: "bg-[var(--sevs-navy)]/10 text-[var(--sevs-navy)]",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
};

export function StatCard({ label, value, hint, icon, iconTone, trend }: StatCardProps) {
  const isShortValue = typeof value === "number" || value.length <= 5;

  return (
    <div className="min-w-0 rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sevs-text-muted)]">
          {label}
        </span>
        {icon && (
          <span
            className={`flex shrink-0 items-center justify-center rounded-lg p-2 ${
              iconTone ? ICON_TILE_STYLES[iconTone] : "text-[var(--sevs-text-muted)]"
            }`}
          >
            {icon}
          </span>
        )}
      </div>

      <p
        className={`mt-3 break-words font-extrabold leading-tight text-[var(--sevs-navy)] ${
          isShortValue ? "text-3xl" : "text-xl"
        }`}
      >
        {value}
      </p>

      {trend && (
        <p
          className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
            trend.direction === "up" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {trend.direction === "up" ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {trend.pct}%{" "}
          <span className="font-normal text-[var(--sevs-text-muted)]">vs. previous 7 days</span>
        </p>
      )}

      {hint && <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">{hint}</p>}
    </div>
  );
}