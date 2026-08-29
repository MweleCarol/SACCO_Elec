// This file defines TypeScript interfaces for the membership sync process, 
// including the structure of sync history entries and the overall status of the membership sync.
export interface SyncHistoryEntry {
  id: string;
  date: string; // ISO date string
  recordsProcessed: number;
  status: "SUCCESSFUL" | "FAILED";
}

// Represents the current status of the membership sync process
export interface MembershipSyncStatus {
  connectionStatus: "CONNECTED" | "DISCONNECTED";
  lastSyncedAt: string; // ISO date string
  membersReceived: number;
  eligibleMembers: number;
  history: SyncHistoryEntry[];
}