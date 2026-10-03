import type { PlatformRole } from "@/lib/auth/types";
import type { ApiResult } from "@/types/api";
import type { RunStatus, UserStatus } from "@/types/enums";

import apiService from "../core";
import type { ListParams, TimeRangeParams } from "../types";

export { UserStatus } from "@/types/enums";

export interface UserAdminItem {
  id: string;
  email: string;
  display_name: string | null;
  status: UserStatus;
  platform_role: PlatformRole | null;
  created_at: string;
}

export interface AuditItem {
  id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  project_id: string | null;
  request_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ProjectUsageItem {
  project_id: string;
  project_name: string;
  archived: boolean;
  run_count: number;
  runs_by_status: Partial<Record<RunStatus, number>>;
  cost_usd: string;
  budget_usd: string;
  last_run_at: string | null;
}

export interface UserListParams extends ListParams {
  email?: string;
}

export interface AuditListParams extends TimeRangeParams {
  project_id?: string;
  action?: string;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface UpdatePlatformRoleRequest {
  role: PlatformRole | null;
}

export type UserListResponse = ApiResult<UserAdminItem[]>;
export type UserDetailResponse = ApiResult<UserAdminItem>;
export type AuditListResponse = ApiResult<AuditItem[]>;
export type ProjectUsageListResponse = ApiResult<ProjectUsageItem[]>;

export const fetchAdmin = {
  getUsers: async (params?: UserListParams, signal?: AbortSignal): Promise<UserListResponse> => {
    const response = await apiService.get<UserListResponse>("/users", params, { signal });
    return response.data;
  },
  updateUserStatus: async (userId: string, data: UpdateUserStatusRequest): Promise<UserDetailResponse> => {
    const response = await apiService.patch<UserDetailResponse>(`/users/${encodeURIComponent(userId)}/status`, data);
    return response.data;
  },
  updatePlatformRole: async (userId: string, data: UpdatePlatformRoleRequest): Promise<UserDetailResponse> => {
    const response = await apiService.put<UserDetailResponse>(
      `/users/${encodeURIComponent(userId)}/platform-role`,
      data,
    );
    return response.data;
  },
  getAudit: async (params?: AuditListParams, signal?: AbortSignal): Promise<AuditListResponse> => {
    const response = await apiService.get<AuditListResponse>("/audit", params, { signal });
    return response.data;
  },
  getProjectUsage: async (params?: TimeRangeParams, signal?: AbortSignal): Promise<ProjectUsageListResponse> => {
    const response = await apiService.get<ProjectUsageListResponse>("/admin/usage/projects", params, { signal });
    return response.data;
  },
};
