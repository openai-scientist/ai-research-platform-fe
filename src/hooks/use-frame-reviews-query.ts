"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchFrameReviews } from "@/lib/api/services/fetch-frame-reviews";
import type { FrameReviewItem, FrameReviewSubmit } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useFrameReviewQuery(
  projectId: string,
  runId: string,
  options?: ApiQueryOptions<ApiResult<FrameReviewItem>>,
) {
  return useApiQuery(
    projectKeys.frameReview(projectId, runId),
    (signal) => fetchFrameReviews.getCurrent(projectId, runId, signal),
    {
      silentErrorCodes: ["FRAME_REVIEW_NOT_FOUND"],
      ...options,
      enabled: Boolean(projectId && runId) && (options?.enabled ?? true),
    },
  );
}
export function useFrameReviewHistoryQuery(
  projectId: string,
  runId: string,
  options?: ApiQueryOptions<ApiResult<FrameReviewItem[]>>,
) {
  return useApiQuery(
    projectKeys.frameReviews(projectId, runId),
    (signal) => fetchFrameReviews.getHistory(projectId, runId, signal),
    { ...options, enabled: Boolean(projectId && runId) && (options?.enabled ?? true) },
  );
}
export function useSubmitFrameReviewMutation(projectId: string, runId: string) {
  return useApiMutation(
    (data: FrameReviewSubmit) => fetchFrameReviews.submit(projectId, runId, data),
    [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all],
  );
}
