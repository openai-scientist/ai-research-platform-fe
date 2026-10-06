"use client";

import { adminKeys, authKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type CreateMemberRequest,
  fetchMembers,
  type MemberListParams,
  type MemberListResponse,
  type ProjectMemberItem,
} from "@/lib/api/services/fetch-members";
import type { ListParams } from "@/lib/api/types";
import type { ProjectRole } from "@/types/enums";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";
import { type InfiniteQueryOptions, useInfinityScroll } from "./use-infinity-scroll";

export function useInfiniteMembers(projectId: string, options?: InfiniteQueryOptions<ProjectMemberItem>) {
  const query = useInfinityScroll<ProjectMemberItem, ListParams>({
    ...options,
    queryKey: projectKeys.members(projectId),
    fetchPage: (params, signal) => fetchMembers.getList(projectId, params, signal),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
  return { ...query, members: query.items };
}

export function useMembersQuery(
  projectId: string,
  params?: MemberListParams,
  options?: ApiQueryOptions<MemberListResponse>,
) {
  return useApiQuery(
    projectKeys.members(projectId, params),
    (signal) => fetchMembers.getList(projectId, params, signal),
    { ...options, enabled: Boolean(projectId) && (options?.enabled ?? true) },
  );
}
const invalidation = [projectKeys.all, authKeys.me, adminKeys.all];
export function useAddMemberMutation(projectId: string) {
  return useApiMutation((data: CreateMemberRequest) => fetchMembers.create(projectId, data), invalidation);
}
export function useUpdateMemberMutation(projectId: string) {
  return useApiMutation(
    (data: { membershipId: string; role: ProjectRole }) =>
      fetchMembers.update(projectId, data.membershipId, { role: data.role }),
    invalidation,
  );
}
export function useRemoveMemberMutation(projectId: string) {
  return useApiMutation((membershipId: string) => fetchMembers.remove(projectId, membershipId), invalidation);
}
export function useResendProjectInviteMutation(projectId: string) {
  return useApiMutation((membershipId: string) => fetchMembers.resendInvite(projectId, membershipId), invalidation);
}
