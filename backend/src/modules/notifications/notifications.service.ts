import { NotificationType } from "@prisma/client";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import * as notificationsRepository from "./notifications.repository";
import { toNotificationDto, NotificationDto } from "./notifications.dto";
import { ListNotificationsQuery } from "./notifications.schema";

// Callers always pass an array, even for one recipient: one code path.
export async function notify(
  userIds: string[],
  data: { type: NotificationType; title: string; message: string; electionId?: string }
): Promise<void> {
  if (userIds.length === 0) return;
  await notificationsRepository.createForUsers(userIds, data);
}

export async function notifyAllActiveMembers(
  data: { type: NotificationType; title: string; message: string; electionId?: string }
): Promise<void> {
  const members = await notificationsRepository.findActiveMemberIds();
  await notify(members.map((m) => m.id), data);
}

export async function listForUser(userId: string, query: ListNotificationsQuery) {
  const [notifications, totalCount] = await notificationsRepository.listForUser({
    userId, unreadOnly: query.unreadOnly, page: query.page, pageSize: query.pageSize,
  });
  return {
    notifications: notifications.map(toNotificationDto),
    pagination: { page: query.page, pageSize: query.pageSize, totalCount, totalPages: Math.ceil(totalCount / query.pageSize) },
  };
}

export async function markRead(userId: string, notificationId: string): Promise<NotificationDto> {
  const notification = await notificationsRepository.findById(notificationId);
  if (!notification) throw new NotFoundError("Notification");
  if (notification.userId !== userId) throw new ForbiddenError("This notification does not belong to you.");

  const updated = await notificationsRepository.markRead(notificationId);
  return toNotificationDto(updated);
}

export async function markAllRead(userId: string): Promise<void> {
  await notificationsRepository.markAllRead(userId);
}