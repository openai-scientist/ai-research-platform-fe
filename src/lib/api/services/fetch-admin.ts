import type { PlatformRole } from "@/lib/auth/types";
import { ApiError, type ApiResult } from "@/types/api";
import type { RunStatus, UserStatus } from "@/types/enums";

import apiService from "../core";
import type { ListParams, TimeRangeParams } from "../types";

export { UserStatus } from "@/types/enums";

export interface UserAdminItem {
  id: string;
  email: string;
  display_name: string | null;
  status: UserStatus;
  platform_role: PlatformRole;
  avatar_url: string | null;
  email_verified: boolean;
  invite_sent_at: string | null;
  last_login_at: string | null;
  created_by_user_id: string | null;
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
  /** Tokens (input and output) the counted runs used. */
  tokens_used: number;
  /** The sum of the counted runs' token budgets. */
  token_budget: number;
  last_run_at: string | null;
  /** The active Project Managers, the owner first. Absent from a backend that does not send them yet. */
  managers?: ProjectManagerRef[];
}

/** Who runs a project: operational metadata an admin may see. */
export interface ProjectManagerRef {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

/** `q` searches project names; `from` and `to` choose which runs are counted. */
export interface ProjectUsageParams extends TimeRangeParams {
  q?: string;
}

/** What the PI is consulted about; the backend keeps one step limit per kind. */
export const CONSULTATION_KINDS = ["charter", "stage_outcome", "failure", "close"] as const;
export type ConsultationKind = (typeof CONSULTATION_KINDS)[number];

/**
 * The platform's behaviour settings (`PlatformSettings` in the management service). Token fields count input and
 * output tokens. A save sends the whole object: the backend refuses unknown keys.
 */
export interface PlatformSettings {
  max_auto_revisions: number;
  max_iterations: number;
  max_rounds: number;
  run_default_token_budget: number;
  run_max_token_budget: number;
  allowed_signup_domains: string[];
  max_active_runs_per_user: number;
  max_active_runs_total: number;
  user_monthly_token_limit: number;
  platform_monthly_token_limit: number;
  credits_per_million_tokens?: number;
  release_share_max_days: number;
  oversight_llm_timeout_seconds: number;
  oversight_contact_email: string | null;
  oversight_evalue_alpha: number;
  oversight_pi_steps_by_kind: Record<ConsultationKind, number>;
  oversight_pi_proposal_steps: number;
  project_brief_chars: number;
  project_lesson_min_runs: number;
  max_active_runs_per_engine: number;
  engine_run_retention_days: number;
  sweep_engine_concurrency: number;
  sweep_pass_seconds: number;
  stage_finish_grace_seconds: number;
}

/** The JSON schema of the settings and the defaults the backend fills in. */
export interface PlatformSettingsSchema {
  schema: Record<string, unknown>;
  defaults: PlatformSettings;
}

/** What "sign out everywhere" did: how many sessions of the user it ended. */
export interface SessionsRevoked {
  sessions: number;
}

export interface UserListParams extends ListParams {
  q?: string;
  status?: UserStatus;
  platform_role?: PlatformRole;
  email_verified?: boolean;
}
export interface CreateUserRequest {
  email: string;
  display_name?: string;
  send_email?: boolean;
}
export interface UserCreated extends UserAdminItem {
  invite_email_sent: boolean;
}

export interface AuditListParams extends TimeRangeParams {
  project_id?: string;
  action?: string;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface UpdatePlatformRoleRequest {
  role: PlatformRole;
}

export type UserListResponse = ApiResult<UserAdminItem[]>;
export type UserDetailResponse = ApiResult<UserAdminItem>;
export type AuditListResponse = ApiResult<AuditItem[]>;
export type ProjectUsageListResponse = ApiResult<ProjectUsageItem[]>;

/** The model a run uses for one role. The API key never comes back; `has_api_key` says whether one is saved. */
export interface ModelProfile {
  provider: string;
  base_url: string | null;
  model: string;
  extra: Record<string, unknown>;
  has_api_key: boolean;
  updated_at: string;
}

export type ModelRole = "stage" | "review";

/** `null` for a role that has no model yet. */
export type ModelProfiles = Record<ModelRole, ModelProfile | null>;

interface ProviderRequestBucket {
  start: string;
  requests: number;
}

export interface ProviderRequestBreakdown {
  label: string;
  requests: number;
}

export interface ProviderMetrics {
  observed_from: string | null;
  through: string;
  requests_today: number | null;
  average_latency_ms: number | null;
  failure_rate: number | null;
  reliability: (ProviderRequestBucket & { successful_requests: number })[];
  recent_requests: ProviderRequestBucket[];
  by_provider: ProviderRequestBreakdown[];
  by_model: ProviderRequestBreakdown[];
  by_capability: ProviderRequestBreakdown[];
}

export interface SaveModelRequest {
  provider: "openai_compatible";
  base_url: string | null;
  model: string;
  /** Left out to keep the saved key. */
  api_key?: string;
}

/** What a connection test sends: the form's values; a field left out is taken from the saved profile. */
export interface TestModelRequest {
  base_url?: string;
  model?: string;
  api_key?: string;
}

export interface ModelTestResult {
  ok: boolean;
  latency_ms: number | null;
  message: string;
}

/** A key an engine uses (a literature source, a decision provider). Its value never comes back. */
export interface IntegrationItem {
  name: string;
  configured: boolean;
  updated_at: string | null;
}

export const fetchAdmin = {
  createUser: async (data: CreateUserRequest): Promise<ApiResult<UserCreated>> => {
    const response = await apiService.post<ApiResult<UserCreated>>("/users", data);
    return response.data;
  },
  inviteUser: async (userId: string): Promise<ApiResult<UserCreated>> => {
    const response = await apiService.post<ApiResult<UserCreated>>(`/users/${encodeURIComponent(userId)}/invite`);
    return response.data;
  },
  updateUserProfile: async (userId: string, data: { display_name: string }): Promise<UserDetailResponse> => {
    const response = await apiService.patch<UserDetailResponse>(`/users/${encodeURIComponent(userId)}`, data);
    return response.data;
  },
  uploadUserAvatar: async (userId: string, file: File): Promise<UserDetailResponse> => {
    const body = new FormData();
    body.append("file", file);
    const response = await apiService.upload<UserDetailResponse>(`/users/${encodeURIComponent(userId)}/avatar`, body);
    return response.data;
  },
  removeUserAvatar: async (userId: string): Promise<UserDetailResponse> => {
    const response = await apiService.delete<UserDetailResponse>(`/users/${encodeURIComponent(userId)}/avatar`);
    return response.data;
  },
  getUsers: async (params?: UserListParams, signal?: AbortSignal): Promise<UserListResponse> => {
    const response = await apiService.get<UserListResponse>("/users", params, { signal });
    return response.data;
  },
  updateUserStatus: async (userId: string, data: UpdateUserStatusRequest): Promise<UserDetailResponse> => {
    const response = await apiService.patch<UserDetailResponse>(`/users/${encodeURIComponent(userId)}/status`, data);
    return response.data;
  },
  updatePlatformRole: async (userId: string, data: UpdatePlatformRoleRequest): Promise<UserDetailResponse> => {
    const response = await apiService.put<UserDetailResponse>(
      `/users/${encodeURIComponent(userId)}/platform-role`,
      data,
    );
    return response.data;
  },
  /** Ends every session of a user. It does not suspend the account: they can sign in again. */
  revokeUserSessions: async (userId: string): Promise<ApiResult<SessionsRevoked>> => {
    const response = await apiService.post<ApiResult<SessionsRevoked>>(
      `/admin/users/${encodeURIComponent(userId)}/sessions/revoke`,
    );
    return response.data;
  },
  getAudit: async (params?: AuditListParams, signal?: AbortSignal): Promise<AuditListResponse> => {
    const response = await apiService.get<AuditListResponse>("/audit", params, { signal });
    return response.data;
  },
  getModels: async (signal?: AbortSignal): Promise<ApiResult<ModelProfiles>> => {
    const response = await apiService.get<ApiResult<ModelProfiles>>("/admin/models", undefined, { signal });
    return response.data;
  },
  getProviderMetrics: async (signal?: AbortSignal): Promise<ProviderMetrics | null> => {
    try {
      const response = await apiService.get<ApiResult<ProviderMetrics>>("/admin/providers/metrics", undefined, {
        signal,
      });
      return response.data.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
  saveModel: async (role: ModelRole, data: SaveModelRequest): Promise<ApiResult<ModelProfile>> => {
    const response = await apiService.put<ApiResult<ModelProfile>>(`/admin/models/${role}`, data);
    return response.data;
  },
  testModel: async (role: ModelRole, data: TestModelRequest): Promise<ApiResult<ModelTestResult>> => {
    const response = await apiService.post<ApiResult<ModelTestResult>>(`/admin/models/${role}/test`, data);
    return response.data;
  },
  getIntegrations: async (signal?: AbortSignal): Promise<ApiResult<IntegrationItem[]>> => {
    const response = await apiService.get<ApiResult<IntegrationItem[]>>("/admin/integrations", undefined, { signal });
    return response.data;
  },
  saveIntegration: async (name: string, value: string): Promise<ApiResult<IntegrationItem>> => {
    const response = await apiService.put<ApiResult<IntegrationItem>>(
      `/admin/integrations/${encodeURIComponent(name)}`,
      {
        value,
      },
    );
    return response.data;
  },
  deleteIntegration: async (name: string): Promise<ApiResult<IntegrationItem>> => {
    const response = await apiService.delete<ApiResult<IntegrationItem>>(
      `/admin/integrations/${encodeURIComponent(name)}`,
    );
    return response.data;
  },
  getSettings: async (signal?: AbortSignal): Promise<ApiResult<PlatformSettings>> => {
    const response = await apiService.get<ApiResult<PlatformSettings>>("/admin/settings", undefined, { signal });
    return response.data;
  },
  getSettingsSchema: async (signal?: AbortSignal): Promise<ApiResult<PlatformSettingsSchema>> => {
    const response = await apiService.get<ApiResult<PlatformSettingsSchema>>("/admin/settings/schema", undefined, {
      signal,
    });
    return response.data;
  },
  /** Publishes a new settings version. Takes the whole object; the saved one comes back. */
  saveSettings: async (data: PlatformSettings): Promise<ApiResult<PlatformSettings>> => {
    const response = await apiService.put<ApiResult<PlatformSettings>>("/admin/settings", data);
    return response.data;
  },
  getProjectUsage: async (params?: ProjectUsageParams, signal?: AbortSignal): Promise<ProjectUsageListResponse> => {
    const response = await apiService.get<ProjectUsageListResponse>("/admin/usage/projects", params, { signal });
    return response.data;
  },
};
