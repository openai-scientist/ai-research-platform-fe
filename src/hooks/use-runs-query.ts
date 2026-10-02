"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchRuns } from "@/lib/api/services/fetch-runs";
import type { ListParams, RunCreate, RunItem } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useRunsQuery(projectId: string, params?: ListParams, options?: ApiQueryOptions<ApiResult<RunItem[]>>) {
  return useApiQuery(projectKeys.runs(projectId, params), (signal) => fetchRuns.getList(projectId, params, signal), {
    ...options,
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
}
export function useRunDetailQuery(projectId: string, runId: string, options?: ApiQueryOptions<ApiResult<RunItem>>) {
  return useApiQuery(projectKeys.run(projectId, runId), (signal) => fetchRuns.getById(projectId, runId, signal), {
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const status = query.state.data?.data.status;
      return status && ["queued", "running", "awaiting_review"].includes(status) ? 12000 : false;
    },
    ...options,
    enabled: Boolean(projectId && runId) && (options?.enabled ?? true),
  });
}
export function useCreateRunMutation(projectId: string) {
  return useApiMutation(
    (data: RunCreate) => fetchRuns.create(projectId, data),
    [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all],
  );
}
export function useSyncRunMutation(projectId: string, runId: string) {
  return useApiMutation(
    () => fetchRuns.sync(projectId, runId),
    [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all],
  );
}
export function useAbandonRunMutation(projectId: string, runId: string) {
  return useApiMutation(
    () => fetchRuns.abandon(projectId, runId),
    [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all],
  );
}
