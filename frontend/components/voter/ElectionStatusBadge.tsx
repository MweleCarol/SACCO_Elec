import clsx from "clsx";
import type { Election } from "@/types/api";
import { memberPhase, PHASE_DISPLAY, type BadgeTone } from "@/lib/electionStatus";

export const TONES: Record<BadgeTone, string> = {
  green: "bg-green-50 text-green-800 ring-green-600/20",
  blue: "bg-blue-50 text-blue-800 ring-blue-600/20",
  gray: "bg-gray-100 text-gray-700 ring-gray-500/20",
  violet: "bg-violet-50 text-violet-800 ring-violet-600/20",
  red: "bg-red-50 text-red-800 ring-red-600/20",
  amber: "bg-amber-50 text-amber-900 ring-amber-600/20",
};

export function ElectionStatusBadge({ election }: { election: Election }) {
  const { label, tone } = PHASE_DISPLAY[memberPhase(election)];
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", TONES[tone])}>
      {label}
    </span>
  );
}

// Any label in one of the tones above (staff screens use their own labels).
export function ToneBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", TONES[tone])}>
      {label}
    </span>
  );
}