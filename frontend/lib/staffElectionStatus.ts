import type { ApprovalRequest, Election, UserRole } from "@/types/api";
import type { BadgeTone } from "@/lib/electionStatus";
import { formatDateTime } from "@/lib/electionStatus";

// How an election looks to officers, administrators and auditors: the real
// lifecycle status (drafts included), plus the one thing that should happen
// next and who does it, so nobody has to remember the process.

export type StaffStage =
  | "DRAFT" | "IN_REVIEW" | "APPROVED" | "OPENS_SOON" | "VOTING" | "ENDING"
  | "CLOSED" | "PUBLISHED" | "CANCELLED" | "ARCHIVED";

export const STAFF_STAGE_DISPLAY: Record<StaffStage, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "gray" },
  IN_REVIEW: { label: "Awaiting admin review", tone: "amber" },
  APPROVED: { label: "Approved", tone: "blue" },
  OPENS_SOON: { label: "Opens soon", tone: "blue" },
  VOTING: { label: "Voting open", tone: "green" },
  ENDING: { label: "Voting ended", tone: "gray" },
  CLOSED: { label: "Closed", tone: "gray" },
  PUBLISHED: { label: "Results published", tone: "violet" },
  CANCELLED: { label: "Cancelled", tone: "red" },
  ARCHIVED: { label: "Archived", tone: "gray" },
};

export function staffStage(e: Election, now: Date = new Date()): StaffStage {
  switch (e.status) {
    case "DRAFT":
      return "DRAFT";
    case "PENDING_APPROVAL":
      return "IN_REVIEW";
    case "APPROVED":
    case "SCHEDULED":
      return "APPROVED";
    case "ACTIVE":
      if (now < new Date(e.startDate)) return "OPENS_SOON";
      return now < new Date(e.endDate) ? "VOTING" : "ENDING";
    case "CLOSED":
      return "CLOSED";
    case "RESULTS_PUBLISHED":
      return "PUBLISHED";
    case "ARCHIVED":
      return e.resultsPublishedAt ? "ARCHIVED" : "CANCELLED";
  }
}

// Filter groups for the list.
export type StaffTab = "ALL" | "PREPARING" | "VOTING" | "CLOSED" | "FINISHED";
export const STAFF_TABS: { key: StaffTab; label: string; stages: StaffStage[] | null }[] = [
  { key: "ALL", label: "All", stages: null },
  { key: "PREPARING", label: "In preparation", stages: ["DRAFT", "IN_REVIEW", "APPROVED", "OPENS_SOON"] },
  { key: "VOTING", label: "Voting", stages: ["VOTING", "ENDING"] },
  { key: "CLOSED", label: "Closed", stages: ["CLOSED"] },
  { key: "FINISHED", label: "Finished", stages: ["PUBLISHED", "CANCELLED", "ARCHIVED"] },
];

const ACTION_NAMES: Record<string, string> = {
  ELECTION_ACTIVATION: "Activation",
  ELECTION_CANCELLATION: "Cancellation",
  ELECTION_RESCHEDULE: "Reschedule",
  RESULT_PUBLICATION: "Publication of results",
};

// "Activation: 1 of 2 approvals"
export function describePending(r: ApprovalRequest): string {
  return `${ACTION_NAMES[r.actionType] ?? "Request"}: ${r.approveCount} of ${r.requiredApprovals} approvals`;
}

// The next step, phrased for the person reading it.
export function nextStep(e: Election, role: UserRole, pending: ApprovalRequest[] = []): string {
  const officer = role === "ELECTION_OFFICER";
  const admin = role === "ELECTION_ADMINISTRATOR";
  const stage = staffStage(e);
  if (pending.length > 0) {
    return `${pending.map(describePending).join(" · ")}. Waiting for officers or administrators to decide on the Approvals page.`;
  }
  switch (stage) {
    case "DRAFT":
      return officer
        ? "Add positions and candidates, then submit it for an administrator's review."
        : "An election officer is preparing it.";
    case "IN_REVIEW":
      return admin ? "Review it, then approve it or send it back to draft." : "Waiting for an administrator's review.";
    case "APPROVED":
      return officer
        ? `Members can now see it and nominate themselves. When candidates are ready, request activation (needs ${e.requiredApprovals} approvals).`
        : "Members can see it. Waiting for an officer to request activation.";
    case "OPENS_SOON":
      return `Activated. Voting opens ${formatDateTime(e.startDate)}.`;
    case "VOTING":
      return `Voting is open until ${formatDateTime(e.endDate)}.`;
    case "ENDING":
      return "Voting has ended. The system closes it automatically within a minute.";
    case "CLOSED":
      return officer
        ? "Tally the votes, check them, then request publication of the results."
        : "Waiting for an officer to tally the votes and request publication.";
    case "PUBLISHED":
      return "Results are published and visible to members.";
    case "CANCELLED":
      return "This election was cancelled.";
    case "ARCHIVED":
      return "Archived.";
  }
}