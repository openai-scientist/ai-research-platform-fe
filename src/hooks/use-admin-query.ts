"use client";

import { adminKeys, authKeys, projectKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchAdmin } from "@/lib/api/services/fetch-admin";
import type {
  AuditItem,
  AuditListParams,
  PlatformRole,
  ProjectUsageItem,
  TimeRangeParams,
  UserAdminItem,
  UserListParams,
} from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useUsersQuery(params?: UserListParams, options?: ApiQueryOptions<ApiResult<UserAdminItem[]>>) {
  return useApiQuery(adminKeys.users(params), (signal) => fetchAdmin.getUsers(params, signal), options);
}
export function useAuditQuery(params?: AuditListParams, options?: ApiQueryOptions<ApiResult<AuditItem[]>>) {
  return useApiQuery(adminKeys.audit(params), (signal) => fetchAdmin.getAudit(params, signal), options);
}
export function useProjectUsageQuery(
  params?: TimeRangeParams,
  options?: ApiQueryOptions<ApiResult<ProjectUsageItem[]>>,
) {
  return useApiQuery(adminKeys.usage(params), (signal) => fetchAdmin.getProjectUsage(params, signal), options);
}
export function useUpdateUserStatusMutation() {
  return useApiMutation(
    (data: { userId: string; status: "active" | "suspended" }) => fetchAdmin.updateUserStatus(data.userId, data.status),
    [adminKeys.all, authKeys.me, projectKeys.all],
  );
}
export function useUpdatePlatformRoleMutation() {
  return useApiMutation(
    (data: { userId: string; role: PlatformRole | null }) => fetchAdmin.updatePlatformRole(data.userId, data.role),
    [adminKeys.all, authKeys.me, projectKeys.all],
  );
}
