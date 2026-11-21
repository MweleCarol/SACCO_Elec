import { api } from "@/services/api/axios";
import type { ApiSuccess, Notification, NotificationList } from "@/types/api";

export async function listNotifications(
  params: { unreadOnly?: boolean; page?: number; pageSize?: number } = {},
) {
  const res = await api.get<ApiSuccess<NotificationList>>("/notifications", {
    params: { ...params, unreadOnly: params.unreadOnly ? "true" : undefined },
  });
  return res.data.data;
}

export async function markRead(id: string): Promise<Notification> {
  const res = await api.patch<ApiSuccess<Notification>>(
    `/notifications/${id}/read`,
    {},
  );
  return res.data.data;
}

export async function markAllRead(): Promise<void> {
  await api.patch("/notifications/read-all", {});
}
