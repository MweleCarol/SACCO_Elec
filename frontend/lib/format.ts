import type { UserRole } from "@/types/member";

// Formats a UserRole into a human-readable label
export function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case "ELECTION_OFFICER":
      return "Election Officer";
    case "ADMINISTRATOR":
      return "Administrator";
    case "AUDITOR":
      return "Auditor";
    case "MEMBER":
    default:
      return "Member";
  }
}