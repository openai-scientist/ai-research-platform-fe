import type { ApiResult, RequestParams } from "@/types/api";

import apiService from "../core";
import { projectPath } from "../request";

export type ActivityCategory = "research" | "data" | "members" | "settings";
export interface ActivityParams extends RequestParams {
  category?: ActivityCategory;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
export interface ProjectActivity {
  id: string;
  project_id: string;
  category: ActivityCategory;
  action: string;
  actor: { user_id: string | null; display_name: string; avatar_url: string | null; type: "user" | "system" };
  resource: { type: string; id: string | null; display_name: string; available: boolean };
  summary: string;
  changes: { field: string; before: unknown; after: unknown }[];
  created_at: string;
}
export interface SpendingUsage {
  project_id: string;
  month: string;
  timezone: string;
  currency: "USD";
  start_at: string;
  end_at: string;
  as_of: string;
  coverage: { status: "complete" | "partial" | "unavailable"; from: string | null; reason_code: string | null };
  totals: {
    spent: string | null;
    run_count: number | null;
    average_cost_per_run: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
  };
  budget: {
    capped: boolean;
    limit: string | null;
    remaining: string | null;
    used_percent: number | null;
    warning_percent: number;
    status: "within_budget" | "warning" | "exceeded" | "uncapped" | "unknown";
    at_limit: "stop" | "pause" | "notify";
    enforced: boolean;
    reason_code: string | null;
  } | null;
  by_model: {
    provider: string | null;
    model_id: string;
    display_name: string;
    run_count: number;
    input_tokens: number | null;
    output_tokens: number | null;
    cost: string | null;
  }[];
}
export type NotificationEventKey = "review" | "finished" | "comments" | "members" | "budget" | "integrations";
export type NotificationChannels = { in_app: boolean; email: boolean };
type Capability = { supported: boolean; reason_code: string | null };
export interface NotificationPreferences {
  project_id: string;
  version: number;
  updated_at: string | null;
  events: ({
    key: NotificationEventKey;
    label: string;
    supported: NotificationChannels;
    reason_codes: { in_app: string | null; email: string | null };
  } & NotificationChannels)[];
  digest: { frequency: "off" | "daily" | "weekly"; timezone: string; send_at: string; weekday: number };
  quiet_hours: { enabled: boolean; timezone: string; start: string; end: string };
  capabilities: Record<string, Capability>;
}
export interface NotificationPreferencesPatch {
  version: number;
  events?: Partial<Record<NotificationEventKey, Partial<Pick<NotificationChannels, "in_app">>>>;
  digest?: Partial<NotificationPreferences["digest"]>;
  quiet_hours?: Partial<NotificationPreferences["quiet_hours"]>;
}

export const fetchWorkspaceSettings = {
  activity: async (projectId: string, params: ActivityParams, signal?: AbortSignal) => {
    const response = await apiService.get<ApiResult<ProjectActivity[]>>(`${projectPath(projectId)}/activity`, params, {
      signal,
    });
    return response.data;
  },
  usage: async (projectId: string, month?: string, signal?: AbortSignal) => {
    const response = await apiService.get<ApiResult<SpendingUsage>>(
      `${projectPath(projectId)}/spending/usage`,
      { month },
      { signal },
    );
    return response.data;
  },
  preferences: async (projectId: string, signal?: AbortSignal) => {
    const response = await apiService.get<ApiResult<NotificationPreferences>>(
      `${projectPath(projectId)}/notification-preferences/me`,
      undefined,
      { signal },
    );
    return response.data;
  },
  updatePreferences: async (projectId: string, body: NotificationPreferencesPatch) => {
    const response = await apiService.patch<ApiResult<NotificationPreferences>>(
      `${projectPath(projectId)}/notification-preferences/me`,
      body,
    );
    return response.data;
  },
};
