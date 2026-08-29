export type NotificationType = "ELECTION" | "APPROVAL" | "SECURITY" | "SYSTEM";

export interface NotificationRecord {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO date string
  read: boolean;
}