"use client";

import { adminKeys, authKeys, projectKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchProject } from "@/lib/api/services/fetch-project";
import type { ProjectCreate, ProjectItem, ProjectListParams, ProjectPatch } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export { projectKeys } from "@/lib/api/query-keys";
export function useProjectsQuery(params?: ProjectListParams, options?: ApiQueryOptions<ApiResult<ProjectItem[]>>) {
  return useApiQuery(projectKeys.list(params), (signal) => fetchProject.getList(params, signal), options);
}
export function useProjectDetailQuery(id: string, options?: ApiQueryOptions<ApiResult<ProjectItem>>) {
  return useApiQuery(projectKeys.detail(id), (signal) => fetchProject.getById(id, signal), {
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}
const invalidation = [projectKeys.all, authKeys.me, adminKeys.all];
export function useCreateProjectMutation() {
  return useApiMutation((data: ProjectCreate) => fetchProject.create(data), invalidation);
}
export function useUpdateProjectMutation(id: string) {
  return useApiMutation((data: ProjectPatch) => fetchProject.update(id, data), invalidation);
}
export function useArchiveProjectMutation() {
  return useApiMutation((id: string) => fetchProject.archive(id), invalidation);
}
export function useRestoreProjectMutation() {
  return useApiMutation((id: string) => fetchProject.restore(id), invalidation);
}
export function useCompleteProjectMutation() {
  return useApiMutation((id: string) => fetchProject.complete(id), invalidation);
}
export function useReopenProjectMutation() {
  return useApiMutation((id: string) => fetchProject.reopen(id), invalidation);
}
