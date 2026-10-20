"use client";

import { adminKeys, authKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type CreateProjectRequest,
  fetchProject,
  type ProjectDetailResponse,
  type ProjectItem,
  type ProjectListParams,
  type ProjectListResponse,
  type UpdateProjectRequest,
} from "@/lib/api/services/fetch-project";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";
import { type InfiniteFilters, type InfiniteQueryOptions, useInfinityScroll } from "./use-infinity-scroll";

export { projectKeys } from "@/lib/api/query-keys";

export function useInfiniteProjects(
  filters?: InfiniteFilters<ProjectListParams>,
  options?: InfiniteQueryOptions<ProjectItem>,
) {
  const query = useInfinityScroll<ProjectItem, ProjectListParams>({
    ...options,
    queryKey: projectKeys.list(),
    filters,
    fetchPage: (params, signal) => fetchProject.getList(params, signal),
  });
  return { ...query, projects: query.items.filter((project) => project.my_role !== null) };
}
export function useProjectsQuery(params?: ProjectListParams, options?: ApiQueryOptions<ProjectListResponse>) {
  return useApiQuery(projectKeys.list(params), (signal) => fetchProject.getList(params, signal), options);
}
export function useProjectDetailQuery(id: string, options?: ApiQueryOptions<ProjectDetailResponse>) {
  return useApiQuery(projectKeys.detail(id), (signal) => fetchProject.getById(id, signal), {
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}
const invalidation = [projectKeys.all, authKeys.me, adminKeys.all];
export function useCreateProjectMutation() {
  return useApiMutation((data: CreateProjectRequest) => fetchProject.create(data), invalidation);
}
export function useUpdateProjectMutation(id: string) {
  return useApiMutation((data: UpdateProjectRequest) => fetchProject.update(id, data), invalidation);
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
