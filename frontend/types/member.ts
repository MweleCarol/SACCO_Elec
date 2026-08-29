
export type UserRole = "MEMBER" | "ELECTION_OFFICER" | "ADMINISTRATOR" | "AUDITOR";

export interface Member {
  id: string;
  name: string;
  email: string;
  membershipNumber?: string; // only present for MEMBER role
  role: UserRole;
  branch: string;
  mfaEnabled: boolean;
  isOnline: boolean;
  avatarUrl: string;
  createdAt: string; // ISO date string
}