import type { Notification, UserRole } from "@/types/api";

// Where a notification should take the reader when they open it.
export function notificationHref(
  n: Notification,
  role: UserRole,
): string | null {
  switch (n.type) {
    case "RESULTS_PUBLISHED":
      return n.electionId ? `/results/${n.electionId}` : "/results";
    case "CANDIDATE_STATUS_CHANGED":
      return role === "MEMBER" ? "/my-candidacy" : "/candidates";
    case "APPROVAL_REQUESTED":
    case "APPROVAL_DECIDED":
      return role === "MEMBER" ? null : "/approvals";
    default:
      return n.electionId ? `/elections/${n.electionId}` : null;
  }
}

// "just now", "5 min ago", "3 h ago", "yesterday", or the date.
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor(
    (now.getTime() - new Date(iso).getTime()) / 60_000,
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return "yesterday";
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
