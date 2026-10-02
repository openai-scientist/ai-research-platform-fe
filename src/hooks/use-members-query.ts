"use client";

import { adminKeys, authKeys, projectKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchMembers } from "@/lib/api/services/fetch-members";
import type { ListParams, MemberCreate, ProjectMemberItem, ProjectRole } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useMembersQuery(
  projectId: string,
  params?: ListParams,
  options?: ApiQueryOptions<ApiResult<ProjectMemberItem[]>>,
) {
  return useApiQuery(
    projectKeys.members(projectId, params),
    (signal) => fetchMembers.getList(projectId, params, signal),
    { ...options, enabled: Boolean(projectId) && (options?.enabled ?? true) },
  );
}
const invalidation = [projectKeys.all, authKeys.me, adminKeys.all];
export function useAddMemberMutation(projectId: string) {
  return useApiMutation((data: MemberCreate) => fetchMembers.create(projectId, data), invalidation);
}
export function useUpdateMemberMutation(projectId: string) {
  return useApiMutation(
    (data: { membershipId: string; role: ProjectRole }) => fetchMembers.update(projectId, data.membershipId, data.role),
    invalidation,
  );
}
export function useRemoveMemberMutation(projectId: string) {
  return useApiMutation((membershipId: string) => fetchMembers.remove(projectId, membershipId), invalidation);
}
