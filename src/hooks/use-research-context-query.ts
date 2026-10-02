"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchResearchContext } from "@/lib/api/services/fetch-research-context";
import type { ListParams, ResearchContextItem, ResearchContextSave, ResearchContextSummary } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useResearchContextQuery(projectId: string, options?: ApiQueryOptions<ApiResult<ResearchContextItem>>) {
  return useApiQuery(projectKeys.context(projectId), (signal) => fetchResearchContext.getLatest(projectId, signal), {
    silentErrorCodes: ["RESEARCH_CONTEXT_NOT_FOUND"],
    ...options,
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
}
export function useResearchContextVersionsQuery(
  projectId: string,
  params?: ListParams,
  options?: ApiQueryOptions<ApiResult<ResearchContextSummary[]>>,
) {
  return useApiQuery(
    projectKeys.contextVersions(projectId, params),
    (signal) => fetchResearchContext.getVersions(projectId, params, signal),
    { ...options, enabled: Boolean(projectId) && (options?.enabled ?? true) },
  );
}
export function useResearchContextVersionQuery(
  projectId: string,
  versionNumber: number,
  options?: ApiQueryOptions<ApiResult<ResearchContextItem>>,
) {
  return useApiQuery(
    projectKeys.contextVersion(projectId, versionNumber),
    (signal) => fetchResearchContext.getVersion(projectId, versionNumber, signal),
    { ...options, enabled: Boolean(projectId) && versionNumber > 0 && (options?.enabled ?? true) },
  );
}
export function useSaveResearchContextMutation(projectId: string) {
  return useApiMutation(
    (data: ResearchContextSave) => fetchResearchContext.save(projectId, data),
    [projectKeys.context(projectId), adminKeys.all],
  );
}
