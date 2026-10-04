"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type CommentItem,
  type CommentListParams,
  type CommentListResponse,
  type CreateCommentRequest,
  fetchComments,
  type UpdateCommentRequest,
} from "@/lib/api/services/fetch-comments";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";
import { type InfiniteFilters, type InfiniteQueryOptions, useInfinityScroll } from "./use-infinity-scroll";

export function useInfiniteComments(
  projectId: string,
  runId: string,
  filters?: InfiniteFilters<CommentListParams>,
  options?: InfiniteQueryOptions<CommentItem>,
) {
  const query = useInfinityScroll<CommentItem, CommentListParams>({
    ...options,
    queryKey: projectKeys.comments(projectId, runId),
    filters,
    fetchPage: (params, signal) => fetchComments.getList(projectId, runId, params, signal),
    enabled: Boolean(projectId && runId) && (options?.enabled ?? true),
  });
  return { ...query, comments: query.items };
}

export function useCommentsQuery(
  projectId: string,
  runId: string,
  params?: CommentListParams,
  options?: ApiQueryOptions<CommentListResponse>,
) {
  return useApiQuery(
    projectKeys.comments(projectId, runId, params),
    (signal) => fetchComments.getList(projectId, runId, params, signal),
    { ...options, enabled: Boolean(projectId && runId) && (options?.enabled ?? true) },
  );
}
export function useCreateCommentMutation(projectId: string, runId: string) {
  return useApiMutation(
    (data: CreateCommentRequest) => fetchComments.create(projectId, runId, data),
    [projectKeys.run(projectId, runId), [...projectKeys.detail(projectId), "review-workspace"], adminKeys.all],
  );
}
export function useUpdateCommentMutation(projectId: string, runId: string) {
  return useApiMutation(
    (data: { commentId: string; patch: UpdateCommentRequest }) =>
      fetchComments.update(projectId, runId, data.commentId, data.patch),
    [projectKeys.run(projectId, runId), [...projectKeys.detail(projectId), "review-workspace"], adminKeys.all],
  );
}
export function useDeleteCommentMutation(projectId: string, runId: string) {
  return useApiMutation(
    (commentId: string) => fetchComments.remove(projectId, runId, commentId),
    [projectKeys.run(projectId, runId), [...projectKeys.detail(projectId), "review-workspace"], adminKeys.all],
  );
}
