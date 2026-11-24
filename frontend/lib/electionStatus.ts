import type { Election } from "@/types/api";

// How an election looks to a MEMBER. The backend status alone is not enough:
// an ACTIVE election is only open while now is between startDate and endDate,
// and an ARCHIVED one was either cancelled or finished with results.

export type MemberPhase = "UPCOMING" | "OPEN" | "ENDED" | "RESULTS" | "CANCELLED";
export type BadgeTone = "green" | "blue" | "gray" | "violet" | "red" | "amber";

export function memberPhase(e: Election, now: Date = new Date()): MemberPhase {
  const start = new Date(e.startDate);
  const end = new Date(e.endDate);
  switch (e.status) {
    case "ACTIVE":
      if (now < start) return "UPCOMING";
      return now < end ? "OPEN" : "ENDED";
    case "CLOSED":
      return "ENDED";
    case "RESULTS_PUBLISHED":
      return "RESULTS";
    case "ARCHIVED":
      return e.resultsPublishedAt ? "RESULTS" : "CANCELLED";
    default:
      return "UPCOMING"; // APPROVED / SCHEDULED: announced, not yet open
  }
}

// One label and colour per phase, in sentence case, each visually distinct.
export const PHASE_DISPLAY: Record<MemberPhase, { label: string; tone: BadgeTone }> = {
  UPCOMING: { label: "Upcoming", tone: "blue" },
  OPEN: { label: "Open for voting", tone: "green" },
  ENDED: { label: "Voting closed", tone: "gray" },
  RESULTS: { label: "Results published", tone: "violet" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};

// Dates in the member's own time zone, e.g. "Mon 24 Nov, 9:00 am".
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "in 2 days", "in 5 hours", "in 12 minutes"
export function timeUntil(iso: string, now: Date = new Date()): string {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return "now";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}


// Members may nominate themselves while the election is announced but voting
// has not started (same rule as the backend).
export function nominationsOpen(e: Election): boolean {
  return e.status === "APPROVED" || e.status === "SCHEDULED";
}