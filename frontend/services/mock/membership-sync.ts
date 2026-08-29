import type { MembershipSyncStatus } from "@/types/membership-sync";

// Mock data for membership sync status
export const mockMembershipSync: MembershipSyncStatus = {
  connectionStatus: "CONNECTED",
  lastSyncedAt: "2026-08-29T08:30:00Z",
  membersReceived: 1248,
  eligibleMembers: 1189,
  history: [
    { id: "sync-001", date: "2026-08-29T08:30:00Z", recordsProcessed: 1248, status: "SUCCESSFUL" },
    { id: "sync-002", date: "2026-08-22T08:30:00Z", recordsProcessed: 1241, status: "SUCCESSFUL" },
  ],
};