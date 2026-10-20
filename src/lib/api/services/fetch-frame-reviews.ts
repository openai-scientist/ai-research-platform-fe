import type { ApiResult } from "@/types/api";
import type { FrameReviewStatus, ReviewSignalKind } from "@/types/enums";

import apiService from "../core";
import { runPath } from "../request";

export { FrameReviewStatus, ReviewSignalKind } from "@/types/enums";

export interface ReviewSignal {
  id: string;
  signal: ReviewSignalKind;
  value?: unknown;
  note?: string;
}

export interface SubmitFrameReviewRequest {
  approve_all?: boolean;
  signals?: ReviewSignal[];
  note?: string;
}

export interface FrameReviewItem {
  id: string;
  run_id: string;
  sequence: number;
  status: FrameReviewStatus;
  requested_at: string;
  request: { items: Record<string, unknown>; [key: string]: unknown };
  decision: Record<string, unknown> | null;
  submitted_by_user_id: string | null;
  submitted_at: string | null;
}

export type FrameReviewDetailResponse = ApiResult<FrameReviewItem>;
export type FrameReviewListResponse = ApiResult<FrameReviewItem[]>;

export const fetchFrameReviews = {
  getCurrent: async (projectId: string, runId: string, signal?: AbortSignal): Promise<FrameReviewDetailResponse> => {
    const response = await apiService.get<FrameReviewDetailResponse>(
      `${runPath(projectId, runId)}/frame-review`,
      undefined,
      { signal },
    );
    return response.data;
  },
  submit: async (
    projectId: string,
    runId: string,
    data: SubmitFrameReviewRequest,
  ): Promise<FrameReviewDetailResponse> => {
    const response = await apiService.post<FrameReviewDetailResponse>(
      `${runPath(projectId, runId)}/frame-review`,
      data,
    );
    return response.data;
  },
  getHistory: async (projectId: string, runId: string, signal?: AbortSignal): Promise<FrameReviewListResponse> => {
    const response = await apiService.get<FrameReviewListResponse>(
      `${runPath(projectId, runId)}/frame-reviews`,
      undefined,
      { signal },
    );
    return response.data;
  },
};
