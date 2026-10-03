"use client";

import { adminKeys, authKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type AuditItem,
  type AuditListParams,
  type AuditListResponse,
  fetchAdmin,
  type ProjectUsageItem,
  type ProjectUsageListResponse,
  type UserAdminItem,
  type UserListParams,
  type UserListResponse,
} from "@/lib/api/services/fetch-admin";
import type { TimeRangeParams } from "@/lib/api/types";
import type { PlatformRole, UserStatus } from "@/types/enums";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";
import { type InfiniteFilters, type InfiniteQueryOptions, useInfinityScroll } from "./use-infinity-scroll";

export function useInfiniteUsers(
  filters?: InfiniteFilters<UserListParams>,
  options?: InfiniteQueryOptions<UserAdminItem>,
) {
  const query = useInfinityScroll<UserAdminItem, UserListParams>({
    ...options,
    queryKey: adminKeys.users(),
    filters,
    fetchPage: (params, signal) => fetchAdmin.getUsers(params, signal),
  });
  return { ...query, users: query.items };
}

export function useInfiniteAudit(
  filters?: InfiniteFilters<AuditListParams>,
  options?: InfiniteQueryOptions<AuditItem>,
) {
  const query = useInfinityScroll<AuditItem, AuditListParams>({
    ...options,
    queryKey: adminKeys.audit(),
    filters,
    fetchPage: (params, signal) => fetchAdmin.getAudit(params, signal),
  });
  return { ...query, audit: query.items };
}

export function useInfiniteProjectUsage(
  filters?: InfiniteFilters<TimeRangeParams>,
  options?: InfiniteQueryOptions<ProjectUsageItem>,
) {
  const query = useInfinityScroll<ProjectUsageItem, TimeRangeParams>({
    ...options,
    queryKey: adminKeys.usage(),
    filters,
    fetchPage: (params, signal) => fetchAdmin.getProjectUsage(params, signal),
  });
  return { ...query, usage: query.items };
}

export function useUsersQuery(params?: UserListParams, options?: ApiQueryOptions<UserListResponse>) {
  return useApiQuery(adminKeys.users(params), (signal) => fetchAdmin.getUsers(params, signal), options);
}
export function useAuditQuery(params?: AuditListParams, options?: ApiQueryOptions<AuditListResponse>) {
  return useApiQuery(adminKeys.audit(params), (signal) => fetchAdmin.getAudit(params, signal), options);
}
export function useProjectUsageQuery(params?: TimeRangeParams, options?: ApiQueryOptions<ProjectUsageListResponse>) {
  return useApiQuery(adminKeys.usage(params), (signal) => fetchAdmin.getProjectUsage(params, signal), options);
}
export function useUpdateUserStatusMutation() {
  return useApiMutation(
    (data: { userId: string; status: UserStatus }) => fetchAdmin.updateUserStatus(data.userId, { status: data.status }),
    [adminKeys.all, authKeys.me, projectKeys.all],
  );
}
export function useUpdatePlatformRoleMutation() {
  return useApiMutation(
    (data: { userId: string; role: PlatformRole | null }) =>
      fetchAdmin.updatePlatformRole(data.userId, { role: data.role }),
    [adminKeys.all, authKeys.me, projectKeys.all],
  );
}
