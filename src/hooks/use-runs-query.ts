"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type CreateRunRequest,
  fetchRuns,
  type RunDetailResponse,
  type RunItem,
  type RunListResponse,
} from "@/lib/api/services/fetch-runs";
import type { ListParams } from "@/lib/api/types";
import { isActiveRun } from "@/lib/research-workspace";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";
import { type InfiniteQueryOptions, useInfinityScroll } from "./use-infinity-scroll";

export function useInfiniteRuns(projectId: string, options?: InfiniteQueryOptions<RunItem>) {
  const query = useInfinityScroll<RunItem, ListParams>({
    ...options,
    queryKey: projectKeys.runs(projectId),
    fetchPage: (params, signal) => fetchRuns.getList(projectId, params, signal),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
  return { ...query, runs: query.items };
}

export function useRunsQuery(projectId: string, params?: ListParams, options?: ApiQueryOptions<RunListResponse>) {
  return useApiQuery(projectKeys.runs(projectId, params), (signal) => fetchRuns.getList(projectId, params, signal), {
    ...options,
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
}
export function useRunDetailQuery(projectId: string, runId: string, options?: ApiQueryOptions<RunDetailResponse>) {
  return useApiQuery(projectKeys.run(projectId, runId), (signal) => fetchRuns.getById(projectId, runId, signal), {
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const status = query.state.data?.data.status;
      return status && isActiveRun(status) ? 12000 : false;
    },
    ...options,
    enabled: Boolean(projectId && runId) && (options?.enabled ?? true),
  });
}
export function useCreateRunMutation(projectId: string) {
  return useApiMutation(
    (data: CreateRunRequest) => fetchRuns.create(projectId, data),
    [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all],
  );
}
export function useAbandonRunMutation(projectId: string, runId: string) {
  return useApiMutation(
    () => fetchRuns.abandon(projectId, runId),
    [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all],
  );
}
