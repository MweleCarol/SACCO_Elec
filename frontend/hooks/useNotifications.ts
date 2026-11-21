"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as notificationsService from "@/services/notifications.service";

const PAGE_SIZE = 20;
const KEY = ["notifications"] as const;

// Unread count for the bell. Checked every minute and when the tab regains focus.
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: [...KEY, "unread-count"],
    queryFn: () =>
      notificationsService.listNotifications({ unreadOnly: true, pageSize: 1 }),
    select: (d) => d.pagination.totalCount,
    refetchInterval: 60_000,
    enabled,
  });
}

// The few newest, for the bell's dropdown.
export function useRecentNotifications(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "recent"],
    queryFn: () => notificationsService.listNotifications({ pageSize: 5 }),
    select: (d) => d.notifications,
    enabled,
  });
}

// The full list, a page at a time ("Show older").
export function useNotificationList(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: [...KEY, "list", unreadOnly],
    queryFn: ({ pageParam }) =>
      notificationsService.listNotifications({
        unreadOnly,
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
