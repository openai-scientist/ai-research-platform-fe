import type { ApiResult } from "@/types/api";
import type { NotificationKind } from "@/types/enums";

import apiService from "../core";
import type { ListParams } from "../types";

export { NotificationKind } from "@/types/enums";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  project_id: string;
  project_name: string;
  run_id: string | null;
  actor_user_id: string | null;
  actor_display_name: string | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationSnapshot {
  items: NotificationItem[];
  unread_count: number;
}

export type SessionEndedCode = "SESSION_EXPIRED" | "USER_SUSPENDED" | "UNAUTHENTICATED";

export interface NotificationListParams extends ListParams {
  unread_only?: boolean;
}

export type NotificationListResponse = ApiResult<NotificationItem[]>;
export type UnreadCountResponse = ApiResult<{ unread_count: number }>;
export type NotificationDetailResponse = ApiResult<NotificationItem>;
export type MarkAllReadResponse = ApiResult<{ marked: number }>;

export const fetchNotifications = {
  getList: async (params?: NotificationListParams, signal?: AbortSignal): Promise<NotificationListResponse> => {
    const response = await apiService.get<NotificationListResponse>("/notifications", params, { signal });
    return response.data;
  },
  getUnreadCount: async (signal?: AbortSignal): Promise<UnreadCountResponse> => {
    const response = await apiService.get<UnreadCountResponse>("/notifications/unread-count", undefined, { signal });
    return response.data;
  },
  markRead: async (notificationId: string): Promise<NotificationDetailResponse> => {
    const response = await apiService.post<NotificationDetailResponse>(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
    );
    return response.data;
  },
  markAllRead: async (): Promise<MarkAllReadResponse> => {
    const response = await apiService.post<MarkAllReadResponse>("/notifications/read-all");
    return response.data;
  },
};
