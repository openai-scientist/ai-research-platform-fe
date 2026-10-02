"use client";

import { notificationKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchNotifications } from "@/lib/api/services/fetch-notifications";
import type { NotificationItem, NotificationListParams } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

// Notifications are deferred: queries remain disabled until the feature is resumed.
export function useNotificationsQuery(
  params?: NotificationListParams,
  options?: ApiQueryOptions<ApiResult<NotificationItem[]>>,
) {
  return useApiQuery(notificationKeys.list(params), (signal) => fetchNotifications.getList(params, signal), {
    ...options,
    enabled: false,
  });
}
export function useUnreadNotificationCountQuery(options?: ApiQueryOptions<ApiResult<{ unread_count: number }>>) {
  return useApiQuery(notificationKeys.unreadCount, (signal) => fetchNotifications.getUnreadCount(signal), {
    ...options,
    enabled: false,
    refetchInterval: false,
  });
}
export function useMarkNotificationReadMutation() {
  return useApiMutation(
    (notificationId: string) => fetchNotifications.markRead(notificationId),
    [notificationKeys.all],
  );
}
export function useMarkAllNotificationsReadMutation() {
  return useApiMutation(() => fetchNotifications.markAllRead(), [notificationKeys.all]);
}
