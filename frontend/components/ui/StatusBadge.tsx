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
const STATUS_TONE: Record<string, BadgeTone> = {
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
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = STATUS_TONE[status] ?? "gray";
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize", TONE_STYLES[tone])}>
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}