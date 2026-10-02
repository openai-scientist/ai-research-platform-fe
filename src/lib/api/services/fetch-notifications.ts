import { requestApi } from "../request";
import type { NotificationItem, NotificationListParams } from "../types";

export const fetchNotifications = {
  getList: (params?: NotificationListParams, signal?: AbortSignal) =>
    requestApi<NotificationItem[]>({ url: "/notifications", params, signal }),
  getUnreadCount: (signal?: AbortSignal) =>
    requestApi<{ unread_count: number }>({ url: "/notifications/unread-count", signal }),
  markRead: (notificationId: string) =>
    requestApi<NotificationItem>({ method: "POST", url: `/notifications/${encodeURIComponent(notificationId)}/read` }),
  markAllRead: () => requestApi<{ marked: number }>({ method: "POST", url: "/notifications/read-all" }),
};
