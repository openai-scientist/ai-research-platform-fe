import { requestApi, runPath } from "../request";
import type { CommentCreate, CommentItem, CommentListParams, CommentPatch } from "../types";

const commentsPath = (projectId: string, runId: string) => `${runPath(projectId, runId)}/comments`;
export const fetchComments = {
  getList: (projectId: string, runId: string, params?: CommentListParams, signal?: AbortSignal) =>
    requestApi<CommentItem[]>({ url: commentsPath(projectId, runId), params, signal }),
  create: (projectId: string, runId: string, data: CommentCreate) =>
    requestApi<CommentItem>({ method: "POST", url: commentsPath(projectId, runId), data }),
  update: (projectId: string, runId: string, commentId: string, data: CommentPatch) =>
    requestApi<CommentItem>({
      method: "PATCH",
      url: `${commentsPath(projectId, runId)}/${encodeURIComponent(commentId)}`,
      data,
    }),
  remove: (projectId: string, runId: string, commentId: string) =>
    requestApi<CommentItem>({
      method: "DELETE",
      url: `${commentsPath(projectId, runId)}/${encodeURIComponent(commentId)}`,
    }),
};
