import type { ApiResult } from "@/types/api";
import type { RunStatus } from "@/types/enums";

import apiService from "../core";
import { projectPath, runPath } from "../request";
import type { ListParams } from "../types";

export { RunStatus } from "@/types/enums";

export interface CreateRunRequest {
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

export type RunListResponse = ApiResult<RunItem[]>;
export type RunDetailResponse = ApiResult<RunItem>;

export const fetchRuns = {
  getList: async (projectId: string, params?: ListParams, signal?: AbortSignal): Promise<RunListResponse> => {
    const response = await apiService.get<RunListResponse>(`${projectPath(projectId)}/runs`, params, { signal });
    return response.data;
  },
  getById: async (projectId: string, runId: string, signal?: AbortSignal): Promise<RunDetailResponse> => {
    const response = await apiService.get<RunDetailResponse>(runPath(projectId, runId), undefined, { signal });
    return response.data;
  },
  create: async (projectId: string, data: CreateRunRequest): Promise<RunDetailResponse> => {
    const response = await apiService.post<RunDetailResponse>(`${projectPath(projectId)}/runs`, data);
    return response.data;
  },
  sync: async (projectId: string, runId: string): Promise<RunDetailResponse> => {
    const response = await apiService.post<RunDetailResponse>(`${runPath(projectId, runId)}/sync`);
    return response.data;
  },
  abandon: async (projectId: string, runId: string): Promise<RunDetailResponse> => {
    const response = await apiService.post<RunDetailResponse>(`${runPath(projectId, runId)}/abandon`);
    return response.data;
  },
};
