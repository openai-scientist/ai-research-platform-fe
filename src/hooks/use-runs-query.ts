"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type CreateRunRequest,
  fetchRuns,
  type LocalNodeReview,
  type RunDetailResponse,
  type RunItem,
  type RunListResponse,
} from "@/lib/api/services/fetch-runs";
import type { ListParams } from "@/lib/api/types";
import { isActiveRun } from "@/lib/research-workspace";
import { ApiError } from "@/types/api";

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

export function hasPendingLocalNodeReview(reviews: readonly LocalNodeReview[], stageRunId: string) {
  return reviews.some((review) => review.stage_run_id === stageRunId && review.review_state === "pending");
}

export function useRunLocalNodeReview(projectId: string, run: RunItem | undefined, enabled: boolean, poll = true) {
  const runId = run?.id ?? "";
  const stageRunId = run?.current_stage?.stage_run_id ?? "";
  const query = useApiQuery(
    [...projectKeys.run(projectId, runId), "local-node-reviews", stageRunId],
    (signal) => fetchRuns.getLocalNodeReviews(projectId, runId, stageRunId, signal),
    {
      // Older management deployments omit this optional status endpoint.
      silentErrorCodes: ["NOT_FOUND"],
      enabled: Boolean(enabled && projectId && runId && stageRunId && run && isActiveRun(run.status)),
      // Dataset uses this only as a bootstrap for holds created before review events existed.
      ...(poll
        ? {}
        : {
            staleTime: Infinity,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: false,
            retryOnMount: false,
          }),
      refetchInterval: poll
        ? ({ state: { error } }) => {
            if (error instanceof ApiError) {
              if (error.status === 429) return (error.retryAfter ?? 60) * 1_000;
              if (error.status >= 400 && error.status < 500) return false;
            }
            return error ? 15_000 : 4_000;
          }
        : false,
    },
  );
  const accessLost = query.error instanceof ApiError && [401, 403, 404].includes(query.error.status);
  return (
    enabled &&
    !accessLost &&
    Boolean(run && isActiveRun(run.status)) &&
    hasPendingLocalNodeReview(query.data?.data ?? [], stageRunId)
  );
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
