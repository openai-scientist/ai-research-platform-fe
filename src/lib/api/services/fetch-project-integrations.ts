import type { ApiResult } from "@/types/api";

import apiService from "../core";
import { projectPath } from "../request";

export interface IntegrationProvider {
  key: string;
  label: string;
  url_placeholder: string;
  setup_steps: string[];
  docs_url: string;
}

export interface IntegrationCatalog {
  providers: IntegrationProvider[];
  events: { key: string; label: string; description: string; default: boolean }[];
  limits: { max_per_project: number };
}

export interface IntegrationError {
  code: string;
  message: string;
}

export interface ProjectIntegration {
  id: string;
  project_id: string;
  provider: string;
  name: string;
  url_hint: string;
  events: string[];
  status: "active" | "paused" | "error";
  last_delivered_at: string | null;
  last_error: (IntegrationError & { at: string }) | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationDelivery {
  id: string;
  event: string;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  response_code: number | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface CreateIntegrationRequest {
  provider: string;
  name: string;
  webhook_url: string;
  events: string[];
  enabled?: boolean;
}

export type UpdateIntegrationRequest = Partial<Omit<CreateIntegrationRequest, "provider">>;
export type IntegrationTestResult = { ok: true; error: null } | { ok: false; error: IntegrationError };

const integrationsPath = (projectId: string) => `${projectPath(projectId)}/integrations`;
const integrationPath = (projectId: string, id: string) => `${integrationsPath(projectId)}/${encodeURIComponent(id)}`;

export const fetchProjectIntegrations = {
  catalog: async (signal?: AbortSignal) => {
    const response = await apiService.get<ApiResult<IntegrationCatalog>>("/integrations/catalog", undefined, {
      signal,
    });
    return response.data;
  },
  list: async (projectId: string, signal?: AbortSignal) => {
    const response = await apiService.get<ApiResult<ProjectIntegration[]>>(integrationsPath(projectId), undefined, {
      signal,
    });
    return response.data;
  },
  create: async (projectId: string, input: CreateIntegrationRequest) => {
    const response = await apiService.post<ApiResult<ProjectIntegration>>(integrationsPath(projectId), input);
    return response.data;
  },
  update: async (projectId: string, id: string, input: UpdateIntegrationRequest) => {
    const response = await apiService.patch<ApiResult<ProjectIntegration>>(integrationPath(projectId, id), input);
    return response.data;
  },
  remove: async (projectId: string, id: string) => {
    const response = await apiService.delete<ApiResult<null>>(integrationPath(projectId, id));
    return response.data;
  },
  test: async (projectId: string, input: { provider: string; webhook_url: string } | { id: string }) => {
    const saved = "id" in input;
    const path = saved ? `${integrationPath(projectId, input.id)}/test` : `${integrationsPath(projectId)}/test`;
    const response = await apiService.post<ApiResult<IntegrationTestResult>>(path, saved ? undefined : input);
    return response.data;
  },
  deliveries: async (projectId: string, id: string, signal?: AbortSignal) => {
    const response = await apiService.get<ApiResult<IntegrationDelivery[]>>(
      `${integrationPath(projectId, id)}/deliveries`,
      { limit: 20 },
      { signal },
    );
    return response.data;
  },
};
