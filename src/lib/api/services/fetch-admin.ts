import { requestApi } from "../request";
import type {
  AuditItem,
  AuditListParams,
  PlatformRole,
  ProjectUsageItem,
  TimeRangeParams,
  UserAdminItem,
  UserListParams,
} from "../types";

export const fetchAdmin = {
  getUsers: (params?: UserListParams, signal?: AbortSignal) =>
    requestApi<UserAdminItem[]>({ url: "/users", params, signal }),
  updateUserStatus: (userId: string, status: "active" | "suspended") =>
    requestApi<UserAdminItem>({
      method: "PATCH",
      url: `/users/${encodeURIComponent(userId)}/status`,
      data: { status },
    }),
  updatePlatformRole: (userId: string, role: PlatformRole | null) =>
    requestApi<UserAdminItem>({
      method: "PUT",
      url: `/users/${encodeURIComponent(userId)}/platform-role`,
      data: { role },
    }),
  getAudit: (params?: AuditListParams, signal?: AbortSignal) =>
    requestApi<AuditItem[]>({ url: "/audit", params, signal }),
  getProjectUsage: (params?: TimeRangeParams, signal?: AbortSignal) =>
    requestApi<ProjectUsageItem[]>({ url: "/admin/usage/projects", params, signal }),
};
