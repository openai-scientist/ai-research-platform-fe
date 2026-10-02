import type { PlatformRole, ProjectRole } from "@/lib/auth/types";

export type { PlatformRole, ProjectRole } from "@/lib/auth/types";
export type { Pagination } from "@/types/api";

export type ProjectStatus = "draft" | "data_ready" | "researching" | "needs_review" | "completed" | "archived";
export type RunStatus = "queued" | "running" | "awaiting_review" | "completed" | "budget_exceeded" | "failed";

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  domain: string | null;
  objective: string | null;
  tags: string[];
  status: ProjectStatus;
  owner_user_id: string;
  my_role: ProjectRole | null;
  created_at: string;
  updated_at: string;
}
export interface ProjectCreate {
  name: string;
  description?: string | null;
  domain?: string | null;
  objective?: string | null;
  tags?: string[];
}
export type ProjectPatch = Partial<ProjectCreate>;
export interface ProjectMemberItem {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: ProjectRole;
  created_at: string;
}

export interface DatasetVersionItem {
  id: string;
  dataset_id: string;
  version_number: number;
  original_filename: string;
  size_bytes: number;
  sha256: string;
  row_count: number;
  column_names: string[];
  created_by_user_id: string;
  created_at: string;
}
export interface DatasetItem {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  latest_version: DatasetVersionItem | null;
}

export interface FrontMatter {
  domain?: string | null;
  objectives?: unknown[] | null;
  variables?: Record<string, unknown> | null;
  design?: Record<string, unknown> | null;
  assumptions?: unknown[] | null;
  constraints?: Record<string, unknown> | null;
  concepts?: unknown[] | null;
  notes?: Record<string, unknown> | null;
}
export interface ResearchContextSummary {
  id: string;
  project_id: string;
  version_number: number;
  created_by_user_id: string;
  created_at: string;
}
export interface ResearchContextItem extends ResearchContextSummary {
  body: string;
  front_matter: FrontMatter | null;
}
export interface ResearchContextSave {
  body: string;
  front_matter?: FrontMatter | null;
  base_version?: number | null;
}

export interface RunCreate {
  dataset_version_id: string;
  research_context_version?: number | null;
  budget_usd?: string | number | null;
  auto_review?: boolean;
}
export interface RunItem {
  id: string;
  project_id: string;
  dataset_id: string;
  dataset_version_id: string;
  dataset_version_number: number;
  research_context_id: string;
  research_context_version: number;
  created_by_user_id: string;
  status: RunStatus;
  auto_review: boolean;
  budget_usd: string;
  cost_usd: string;
  failure_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

export type ReviewSignalKind = "approve" | "edit" | "reject" | "unknown";
export interface ReviewSignal {
  id: string;
  signal: ReviewSignalKind;
  value?: unknown;
  note?: string;
}
export interface FrameReviewSubmit {
  approve_all?: boolean;
  signals?: ReviewSignal[];
  note?: string;
}
export interface FrameReviewItem {
  id: string;
  run_id: string;
  sequence: number;
  status: "pending" | "submitted" | "closed";
  requested_at: string;
  request: { items: Record<string, unknown>; [key: string]: unknown };
  decision: Record<string, unknown> | null;
  submitted_by_user_id: string | null;
  submitted_at: string | null;
}

export interface RunArtifactItem {
  id: string;
  run_id: string;
  kind: "paper_pdf" | "paper_tex" | "figure" | "results" | "other";
  filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  created_at: string;
}

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

export interface NotificationItem {
  id: string;
  kind: "run_awaiting_review" | "run_finished" | "added_to_project" | "run_commented";
  project_id: string;
  project_name: string;
  run_id: string | null;
  actor_user_id: string | null;
  actor_display_name: string | null;
  created_at: string;
  read_at: string | null;
}

export interface UserAdminItem {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  platform_role: PlatformRole | null;
  created_at: string;
}
export interface AuditItem {
  id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  project_id: string | null;
  request_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
export interface ProjectUsageItem {
  project_id: string;
  project_name: string;
  archived: boolean;
  run_count: number;
  runs_by_status: Partial<Record<RunStatus, number>>;
  cost_usd: string;
  budget_usd: string;
  last_run_at: string | null;
}

export interface ListParams {
  limit?: number;
  offset?: number;
}
export interface ProjectListParams extends ListParams {
  include_archived?: boolean;
}
export interface CommentListParams extends ListParams {
  artifact_id?: string;
}
export interface NotificationListParams extends ListParams {
  unread_only?: boolean;
}
export interface UserListParams extends ListParams {
  email?: string;
}
export interface TimeRangeParams extends ListParams {
  from?: string;
  to?: string;
}
export interface AuditListParams extends TimeRangeParams {
  project_id?: string;
  action?: string;
}
export interface MemberCreate {
  email: string;
  role: ProjectRole;
}
export interface DatasetCreate {
  name: string;
  description?: string;
  file: File;
}
export interface DatasetPatch {
  name?: string;
  description?: string | null;
}
export interface CommentCreate {
  body: string;
  artifact_id?: string | null;
}
export interface CommentPatch {
  body: string;
}
export interface FileDownload {
  blob: Blob;
  filename: string | null;
  contentType: string;
}
