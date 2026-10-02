"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchComments } from "@/lib/api/services/fetch-comments";
import type { CommentCreate, CommentItem, CommentListParams, CommentPatch } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useCommentsQuery(
  projectId: string,
  runId: string,
  params?: CommentListParams,
  options?: ApiQueryOptions<ApiResult<CommentItem[]>>,
) {
  return useApiQuery(
    projectKeys.comments(projectId, runId, params),
    (signal) => fetchComments.getList(projectId, runId, params, signal),
    { ...options, enabled: Boolean(projectId && runId) && (options?.enabled ?? true) },
  );
}
export function useCreateCommentMutation(projectId: string, runId: string) {
  return useApiMutation(
    (data: CommentCreate) => fetchComments.create(projectId, runId, data),
    [projectKeys.run(projectId, runId), adminKeys.all],
  );
}
export function useUpdateCommentMutation(projectId: string, runId: string) {
  return useApiMutation(
    (data: { commentId: string; patch: CommentPatch }) =>
      fetchComments.update(projectId, runId, data.commentId, data.patch),
    [projectKeys.run(projectId, runId), adminKeys.all],
  );
}
export function useDeleteCommentMutation(projectId: string, runId: string) {
  return useApiMutation(
    (commentId: string) => fetchComments.remove(projectId, runId, commentId),
    [projectKeys.run(projectId, runId), adminKeys.all],
  );
}
