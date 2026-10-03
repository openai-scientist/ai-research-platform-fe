"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import {
  fetchResearchContext,
  type ResearchContextDetailResponse,
  type ResearchContextSummary,
  type ResearchContextVersionListResponse,
  type SaveResearchContextRequest,
} from "@/lib/api/services/fetch-research-context";
import type { ListParams } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";
import { type InfiniteQueryOptions, useInfinityScroll } from "./use-infinity-scroll";

export function useInfiniteResearchContextVersions(
  projectId: string,
  options?: InfiniteQueryOptions<ResearchContextSummary>,
) {
  const query = useInfinityScroll<ResearchContextSummary, ListParams>({
    ...options,
    queryKey: projectKeys.contextVersions(projectId),
    fetchPage: (params, signal) => fetchResearchContext.getVersions(projectId, params, signal),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
  return { ...query, versions: query.items };
}

export function useResearchContextQuery(projectId: string, options?: ApiQueryOptions<ResearchContextDetailResponse>) {
  return useApiQuery(projectKeys.context(projectId), (signal) => fetchResearchContext.getLatest(projectId, signal), {
    silentErrorCodes: ["RESEARCH_CONTEXT_NOT_FOUND"],
    ...options,
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
}
export function useResearchContextVersionsQuery(
  projectId: string,
  params?: ListParams,
  options?: ApiQueryOptions<ResearchContextVersionListResponse>,
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
  options?: ApiQueryOptions<ResearchContextDetailResponse>,
) {
  return useApiQuery(
    projectKeys.contextVersion(projectId, versionNumber),
    (signal) => fetchResearchContext.getVersion(projectId, versionNumber, signal),
    { ...options, enabled: Boolean(projectId) && versionNumber > 0 && (options?.enabled ?? true) },
  );
}
export function useSaveResearchContextMutation(projectId: string) {
  return useApiMutation(
    (data: SaveResearchContextRequest) => fetchResearchContext.save(projectId, data),
    [
      projectKeys.context(projectId),
      projectKeys.contextVersions(projectId),
      projectKeys.managerResearch(projectId),
      adminKeys.all,
    ],
  );
}
