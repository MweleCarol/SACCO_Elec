import type { NotificationRecord } from "@/types/notification";

export const mockNotifications: NotificationRecord[] = [
  {
    id: "notif-001",
    memberId: "usr-member-004", // TODO: replace with Grace's real seeded id
    type: "ELECTION",
    title: "Voting is now open",
    message: "The 2026 SACCO General Election is now open for voting. Cast your vote before it closes.",
    createdAt: "2026-08-26T08:00:00Z",
    read: false,
  },
  {
    id: "notif-002",
    memberId: "usr-member-004",
    type: "ELECTION",
    title: "Vote recorded",
    message: "Your vote in the Branch Delegate Election 2026 was recorded successfully.",
    createdAt: "2026-08-25T14:12:00Z",
    read: true,
  },
  {
    id: "notif-003",
    memberId: "usr-member-004",
    type: "SYSTEM",
    title: "New candidates approved",
    message: "New approved candidates are now listed for the 2026 SACCO General Election.",
    createdAt: "2026-08-24T09:30:00Z",
    read: true,
  },
];

export function getNotificationsByMember(memberId: string): NotificationRecord[] {
  return mockNotifications
    .filter((n) => n.memberId === memberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnreadCount(memberId: string): number {
  return mockNotifications.filter((n) => n.memberId === memberId && !n.read).length;
}