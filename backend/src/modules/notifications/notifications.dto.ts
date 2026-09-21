import { Notification, NotificationType } from "@prisma/client";

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  electionId: string | null;
  createdAt: Date;
  readAt: Date | null;
}

export function toNotificationDto(n: Notification): NotificationDto {
  return {
    id: n.id, type: n.type, title: n.title, message: n.message, read: n.read,
    electionId: n.electionId, createdAt: n.createdAt, readAt: n.readAt,
  };
}