import type { ApiResult } from "@/types/api";

import apiService from "../core";
import { runPath } from "../request";
import type { ListParams } from "../types";

export interface CommentItem {
  id: string;
  run_id: string;
  artifact_id: string | null;
  author_user_id: string;
  author_display_name: string | null;
  body: string | null;
  deleted: boolean;
  created_at: string;
  edited_at: string | null;
}

export interface CommentListParams extends ListParams {
  artifact_id?: string;
}

export interface CreateCommentRequest {
  body: string;
  artifact_id?: string | null;
}

export interface UpdateCommentRequest {
  body: string;
}

export type CommentListResponse = ApiResult<CommentItem[]>;
export type CommentDetailResponse = ApiResult<CommentItem>;

const commentsPath = (projectId: string, runId: string) => `${runPath(projectId, runId)}/comments`;
export const fetchComments = {
  getList: async (
    projectId: string,
    runId: string,
    params?: CommentListParams,
    signal?: AbortSignal,
  ): Promise<CommentListResponse> => {
    const response = await apiService.get<CommentListResponse>(commentsPath(projectId, runId), params, { signal });
    return response.data;
  },
  create: async (projectId: string, runId: string, data: CreateCommentRequest): Promise<CommentDetailResponse> => {
    const response = await apiService.post<CommentDetailResponse>(commentsPath(projectId, runId), data);
    return response.data;
  },
  update: async (
    projectId: string,
    runId: string,
    commentId: string,
    data: UpdateCommentRequest,
  ): Promise<CommentDetailResponse> => {
    const response = await apiService.patch<CommentDetailResponse>(
      `${commentsPath(projectId, runId)}/${encodeURIComponent(commentId)}`,
      data,
    );
    return response.data;
  },
  remove: async (projectId: string, runId: string, commentId: string): Promise<CommentDetailResponse> => {
    const response = await apiService.delete<CommentDetailResponse>(
      `${commentsPath(projectId, runId)}/${encodeURIComponent(commentId)}`,
    );
    return response.data;
  },
};
