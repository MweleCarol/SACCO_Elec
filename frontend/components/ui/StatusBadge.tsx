import clsx from "clsx";

type BadgeTone = "green" | "amber" | "gray" | "red" | "blue";

// Represents a badge that displays a status with a specific tone (color).
const TONE_STYLES: Record<BadgeTone, string> = {
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  gray: "bg-gray-100 text-gray-600",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
};

// Maps various status strings to their corresponding badge tones (colors).
// Includes both the raw enum values (candidate/approval statuses, still
// uppercase) and the human-readable DisplayStatus strings from
// getDisplayStatus() (elections, now Title Case).
const STATUS_TONE: Record<string, BadgeTone> = {
  // raw enum values (candidates, approvals, sync history, risk levels, member status)
  ACTIVE: "green",
  APPROVED: "green",
  COMPLETED: "gray",
  CLOSED: "gray",
  RESULTS_PUBLISHED: "gray",
  ARCHIVED: "gray",
  SCHEDULED: "blue",
  PENDING: "amber",
  PENDING_APPROVAL: "amber",
  DRAFT: "gray",
  REJECTED: "red",
  WITHDRAWN: "gray",
  HIGH: "red",
  MEDIUM: "amber",
  LOW: "gray",
  SUSPENDED: "red",
  SUCCESSFUL: "green",
  FAILED: "red",

  // DisplayStatus values from getDisplayStatus() — election badges
  Draft: "gray",
  "Pending Approval": "amber",
  Approved: "green",
  Scheduled: "blue",
  Active: "green",
  Closed: "gray",
  "Results Published": "gray",
  Archived: "gray",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = STATUS_TONE[status] ?? "gray";
  const label = status.includes("_") ? status.replace(/_/g, " ").toLowerCase() : status;
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize", TONE_STYLES[tone])}>
      {label}
    </span>
  );
}