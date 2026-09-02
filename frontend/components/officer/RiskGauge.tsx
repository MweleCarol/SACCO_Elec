import type { RiskLevel } from "@/types/ai-governance";

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; width: string }> = {
  LOW: { color: "text-green-700", bg: "bg-green-500", width: "33%" },
  MEDIUM: { color: "text-amber-700", bg: "bg-amber-500", width: "66%" },
  HIGH: { color: "text-red-700", bg: "bg-red-500", width: "100%" },
};

export function RiskGauge({ level }: { level: RiskLevel }) {
  const cfg = RISK_CONFIG[level];
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--sevs-text-muted)]">Administrative Risk</span>
        <span className={`text-lg font-extrabold ${cfg.color}`}>{level}</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${cfg.bg} transition-all`} style={{ width: cfg.width }} />
      </div>
    </div>
  );
}