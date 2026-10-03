"use client";

import { notificationKeys } from "@/lib/api/query-keys";
import {
  fetchNotifications,
  type NotificationItem,
  type NotificationListParams,
  type NotificationListResponse,
  type UnreadCountResponse,
} from "@/lib/api/services/fetch-notifications";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";
import { type InfiniteFilters, type InfiniteQueryOptions, useInfinityScroll } from "./use-infinity-scroll";

export function useInfiniteNotifications(
  filters?: InfiniteFilters<NotificationListParams>,
  options?: InfiniteQueryOptions<NotificationItem>,
) {
  const query = useInfinityScroll<NotificationItem, NotificationListParams>({
    ...options,
    queryKey: notificationKeys.list(),
    filters,
    fetchPage: (params, signal) => fetchNotifications.getList(params, signal),
    enabled: false,
    refetchInterval: false,
  });
  return { ...query, notifications: query.items };
}

// Notifications are deferred: queries remain disabled until the feature is resumed.
export function useNotificationsQuery(
  params?: NotificationListParams,
  options?: ApiQueryOptions<NotificationListResponse>,
) {
  return useApiQuery(notificationKeys.list(params), (signal) => fetchNotifications.getList(params, signal), {
    ...options,
    enabled: false,
  });
}
export function useUnreadNotificationCountQuery(options?: ApiQueryOptions<UnreadCountResponse>) {
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
