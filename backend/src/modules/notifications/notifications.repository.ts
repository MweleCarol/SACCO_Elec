import { prisma } from "../../config/prisma";
import { NotificationType, Prisma } from "@prisma/client";

export function createForUsers(
  userIds: string[],
  data: { type: NotificationType; title: string; message: string; electionId?: string }
) {
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...data })),
  });
}

export interface ListFilters { userId: string; unreadOnly: boolean; page: number; pageSize: number; }

export function listForUser(filters: ListFilters) {
  const where: Prisma.NotificationWhereInput = {
    userId: filters.userId, ...(filters.unreadOnly ? { read: false } : {}),
  };
  return prisma.$transaction([
    prisma.notification.findMany({
      where, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.notification.findUnique({ where: { id } });
}

export function markRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { read: true, readAt: new Date() } });
}

export function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false }, data: { read: true, readAt: new Date() },
  });
}

export function findActiveMemberIds(): Promise<{ id: string }[]> {
  return prisma.user.findMany({ where: { role: "MEMBER", status: "ACTIVE" }, select: { id: true } });
}