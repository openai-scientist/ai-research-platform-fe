"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type FrameReviewDetailResponse,
  type FrameReviewListResponse,
  fetchFrameReviews,
  type SubmitFrameReviewRequest,
} from "@/lib/api/services/fetch-frame-reviews";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useFrameReviewQuery(
  projectId: string,
  runId: string,
  options?: ApiQueryOptions<FrameReviewDetailResponse>,
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
  options?: ApiQueryOptions<FrameReviewListResponse>,
) {
  return useApiQuery(
    projectKeys.frameReviews(projectId, runId),
    (signal) => fetchFrameReviews.getHistory(projectId, runId, signal),
    { ...options, enabled: Boolean(projectId && runId) && (options?.enabled ?? true) },
  );
}
export function useSubmitFrameReviewMutation(projectId: string, runId: string) {
  return useApiMutation(
    (data: SubmitFrameReviewRequest) => fetchFrameReviews.submit(projectId, runId, data),
    [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all],
  );
}
