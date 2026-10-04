"use client";

import { projectKeys } from "@/lib/api/query-keys";
import { fetchReviewWorkspace } from "@/lib/api/services/fetch-review-workspace";

import { useApiQuery } from "./use-api";

export function useReviewWorkspaceQuery(projectId: string, withComments = false) {
  return useApiQuery(
    [...projectKeys.detail(projectId), "review-workspace", withComments],
    (signal) => fetchReviewWorkspace(projectId, withComments, signal),
    { enabled: Boolean(projectId), staleTime: 30_000 },
  );
}
