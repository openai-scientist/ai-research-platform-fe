"use client";

import { projectKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";
import type { RunArtifactItem } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useArtifactsQuery(
  projectId: string,
  runId: string,
  options?: ApiQueryOptions<ApiResult<RunArtifactItem[]>>,
) {
  return useApiQuery(
    projectKeys.artifacts(projectId, runId),
    (signal) => fetchArtifacts.getList(projectId, runId, signal),
    { ...options, enabled: Boolean(projectId && runId) && (options?.enabled ?? true) },
  );
}
export function useDownloadArtifactMutation(projectId: string, runId: string) {
  return useApiMutation((artifactId: string) => fetchArtifacts.download(projectId, runId, artifactId));
}
