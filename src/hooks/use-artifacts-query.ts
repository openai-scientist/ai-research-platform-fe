"use client";

import { projectKeys } from "@/lib/api/query-keys";
import { type ArtifactListResponse, fetchArtifacts } from "@/lib/api/services/fetch-artifacts";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useArtifactsQuery(projectId: string, runId: string, options?: ApiQueryOptions<ArtifactListResponse>) {
  return useApiQuery(
    projectKeys.artifacts(projectId, runId),
    (signal) => fetchArtifacts.getList(projectId, runId, signal),
    { ...options, enabled: Boolean(projectId && runId) && (options?.enabled ?? true) },
  );
}
export function useDownloadArtifactMutation(projectId: string, runId: string) {
  return useApiMutation((artifactId: string) => fetchArtifacts.download(projectId, runId, artifactId));
}
