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
  platform_role: PlatformRole;
  avatar_url: string | null;
  email_verified: boolean;
  must_change_password: boolean;
  invite_sent_at: string | null;
  last_login_at: string | null;
  created_by_user_id: string | null;
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
  q?: string;
  status?: UserStatus;
}
export interface CreateUserRequest {
  email: string;
  display_name?: string;
  send_email?: boolean;
}
export interface UserCreated extends UserAdminItem {
  temporary_password: string;
  invite_email_sent: boolean;
}

export interface AuditListParams extends TimeRangeParams {
  project_id?: string;
  action?: string;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface UpdatePlatformRoleRequest {
  role: PlatformRole;
}

export type UserListResponse = ApiResult<UserAdminItem[]>;
export type UserDetailResponse = ApiResult<UserAdminItem>;
export type AuditListResponse = ApiResult<AuditItem[]>;
export type ProjectUsageListResponse = ApiResult<ProjectUsageItem[]>;

export const fetchAdmin = {
  createUser: async (data: CreateUserRequest): Promise<ApiResult<UserCreated>> => {
    const response = await apiService.post<ApiResult<UserCreated>>("/users", data);
    return response.data;
  },
  inviteUser: async (userId: string): Promise<ApiResult<UserCreated>> => {
    const response = await apiService.post<ApiResult<UserCreated>>(`/users/${encodeURIComponent(userId)}/invite`);
    return response.data;
  },
  updateUserProfile: async (userId: string, data: { display_name: string }): Promise<UserDetailResponse> => {
    const response = await apiService.patch<UserDetailResponse>(`/users/${encodeURIComponent(userId)}`, data);
    return response.data;
  },
  uploadUserAvatar: async (userId: string, file: File): Promise<UserDetailResponse> => {
    const body = new FormData();
    body.append("file", file);
    const response = await apiService.upload<UserDetailResponse>(`/users/${encodeURIComponent(userId)}/avatar`, body);
    return response.data;
  },
  removeUserAvatar: async (userId: string): Promise<UserDetailResponse> => {
    const response = await apiService.delete<UserDetailResponse>(`/users/${encodeURIComponent(userId)}/avatar`);
    return response.data;
  },
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
