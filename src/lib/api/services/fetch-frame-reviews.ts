import { requestApi, runPath } from "../request";
import type { FrameReviewItem, FrameReviewSubmit } from "../types";

export const fetchFrameReviews = {
  getCurrent: (projectId: string, runId: string, signal?: AbortSignal) =>
    requestApi<FrameReviewItem>({ url: `${runPath(projectId, runId)}/frame-review`, signal }),
  submit: (projectId: string, runId: string, data: FrameReviewSubmit) =>
    requestApi<FrameReviewItem>({ method: "POST", url: `${runPath(projectId, runId)}/frame-review`, data }),
  getHistory: (projectId: string, runId: string, signal?: AbortSignal) =>
    requestApi<FrameReviewItem[]>({ url: `${runPath(projectId, runId)}/frame-reviews`, signal }),
};
