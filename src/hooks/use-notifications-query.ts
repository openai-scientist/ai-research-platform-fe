"use client";

import { useEffect, useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { notificationKeys } from "@/lib/api/query-keys";
import {
  fetchNotifications,
  type NotificationItem,
  type NotificationListParams,
  type NotificationListResponse,
  type UnreadCountResponse,
} from "@/lib/api/services/fetch-notifications";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAuthenticated } from "@/lib/redux/slices/auth-slice";
import { ApiError } from "@/types/api";

import { type ApiQueryOptions, showApiError, useApiQuery } from "./use-api";
import { type InfiniteFilters, type InfiniteQueryOptions, useInfinityScroll } from "./use-infinity-scroll";

export function useInfiniteNotifications(
  filters?: InfiniteFilters<NotificationListParams>,
  options?: InfiniteQueryOptions<NotificationItem>,
) {
  const authenticated = useAppSelector(selectIsAuthenticated);
  const query = useInfinityScroll<NotificationItem, NotificationListParams>({
    ...options,
    queryKey: notificationKeys.list(),
    filters,
    fetchPage: (params, signal) => fetchNotifications.getList(params, signal),
    enabled: authenticated && (options?.enabled ?? false),
    refetchInterval: false,
  });
  return { ...query, notifications: query.items };
}

// REST queries are opt-in for history. The bell uses the SSE snapshot exclusively.
export function useNotificationsQuery(
  params?: NotificationListParams,
  options?: ApiQueryOptions<NotificationListResponse>,
) {
  const authenticated = useAppSelector(selectIsAuthenticated);
  return useApiQuery(notificationKeys.list(params), (signal) => fetchNotifications.getList(params, signal), {
    ...options,
    enabled: authenticated && (options?.enabled ?? false),
    refetchInterval: false,
  });
}
export function useUnreadNotificationCountQuery(options?: ApiQueryOptions<UnreadCountResponse>) {
  const authenticated = useAppSelector(selectIsAuthenticated);
  return useApiQuery(notificationKeys.unreadCount, (signal) => fetchNotifications.getUnreadCount(signal), {
    ...options,
    enabled: authenticated && (options?.enabled ?? false),
    refetchInterval: false,
  });
}

function useNotificationMutation<T, V = void>(mutationFn: (variables: V) => Promise<T>) {
  const [retryAt, setRetryAt] = useState(0);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [retryAt]);
  const mutation = useMutation<T | null, Error, V>({
    mutationFn: async (variables) => {
      if (Date.now() < retryAt) {
        throw new ApiError(429, "RATE_LIMITED", "Please wait before trying again.");
      }
      try {
        return await mutationFn(variables);
      } catch (error) {
        // Removed or inaccessible notifications are repaired by the next snapshot.
        if (error instanceof ApiError && error.code === "NOT_FOUND") return null;
        throw error;
      }
    },
    retry: false,
    onError: (error) => {
      if (error instanceof ApiError && error.retryAfter !== null) {
        setRetryAt(Date.now() + error.retryAfter * 1000);
      }
      showApiError(error);
    },
    // Do not invalidate/refetch or edit the badge: SSE is authoritative.
  });
  return { ...mutation, isRateLimited: retryAt > 0 };
}

export function useMarkNotificationReadMutation() {
  return useNotificationMutation((notificationId: string) => fetchNotifications.markRead(notificationId));
}
export function useMarkAllNotificationsReadMutation() {
  return useNotificationMutation(() => fetchNotifications.markAllRead());
}
