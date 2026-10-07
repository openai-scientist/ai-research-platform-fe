import type { AuditListParams, UserListParams } from "@/lib/api/services/fetch-admin";
import type { CommentListParams } from "@/lib/api/services/fetch-comments";
import type { NotificationListParams } from "@/lib/api/services/fetch-notifications";
import type { ProjectListParams } from "@/lib/api/services/fetch-project";

import type { ListParams, TimeRangeParams } from "./types";

export const authKeys = { all: ["auth"] as const, me: ["auth", "me"] as const, csrf: ["auth", "csrf"] as const };
export const connectionKeys = {
  project: (id: string) => ["projects", "detail", id, "connections"] as const,
  lists: (id: string) => ["projects", "detail", id, "connections", "list"] as const,
  list: (id: string, q?: string) => ["projects", "detail", id, "connections", "list", q] as const,
};
export const invitationKeys = {
  all: ["invitations"] as const,
  list: (params?: ListParams) => ["invitations", params] as const,
};
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => ["projects", "list"] as const,
  list: (params?: ProjectListParams) => ["projects", "list", params] as const,
  details: () => ["projects", "detail"] as const,
  detail: (id: string) => ["projects", "detail", id] as const,
  managerResearch: (id: string) => ["projects", "detail", id, "manager-research"] as const,
  memberLists: (id: string) => ["projects", "detail", id, "members"] as const,
  members: (id: string, params?: ListParams) => ["projects", "detail", id, "members", params] as const,
  fileLists: (id: string) => ["projects", "detail", id, "files"] as const,
  datasets: (id: string, params?: ListParams) => ["projects", "detail", id, "datasets", "list", params] as const,
  dataset: (id: string, datasetId: string) => ["projects", "detail", id, "datasets", datasetId] as const,
  datasetVersions: (id: string, datasetId: string, params?: ListParams) =>
    ["projects", "detail", id, "datasets", datasetId, "versions", params] as const,
  context: (id: string) => ["projects", "detail", id, "context"] as const,
  contextVersions: (id: string, params?: ListParams) =>
    ["projects", "detail", id, "context", "versions", params] as const,
  contextVersion: (id: string, version: number) => ["projects", "detail", id, "context", "version", version] as const,
  runLists: (id: string) => ["projects", "detail", id, "runs", "list"] as const,
  runs: (id: string, params?: ListParams) => ["projects", "detail", id, "runs", "list", params] as const,
  run: (id: string, runId: string) => ["projects", "detail", id, "runs", runId] as const,
  frameReview: (id: string, runId: string) => ["projects", "detail", id, "runs", runId, "frame-review"] as const,
  frameReviews: (id: string, runId: string) => ["projects", "detail", id, "runs", runId, "frame-reviews"] as const,
  artifacts: (id: string, runId: string) => ["projects", "detail", id, "runs", runId, "artifacts"] as const,
  comments: (id: string, runId: string, params?: CommentListParams) =>
    ["projects", "detail", id, "runs", runId, "comments", params] as const,
};
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: NotificationListParams) => ["notifications", "list", params] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};
export const adminKeys = {
  all: ["admin"] as const,
  auditLists: () => ["admin", "audit"] as const,
  usageLists: () => ["admin", "usage"] as const,
  users: (params?: UserListParams) => ["admin", "users", params] as const,
  audit: (params?: AuditListParams) => ["admin", "audit", params] as const,
  usage: (params?: TimeRangeParams) => ["admin", "usage", params] as const,
};
