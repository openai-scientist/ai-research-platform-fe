import type { GateAnswer, ReviewMode } from "@/lib/run-stream/contract";
import type { ApiResult } from "@/types/api";
import type { RunStatus } from "@/types/enums";

import apiService from "../core";
import { projectPath, runPath } from "../request";
import type { ListParams } from "../types";

export { RunStatus } from "@/types/enums";

export interface CreateRunRequest {
  topic: string;
  domains: string[];
  review_mode: ReviewMode;
  budget_usd?: string | null;
}

export interface RunItem {
  id: string;
  project_id: string;
  dataset_id: string | null;
  dataset_version_id: string | null;
  dataset_version_number: number | null;
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
  // Runs started from a topic. The backend adds these with the run event stream.
  label?: string;
  topic?: string | null;
  domains?: string[];
  review_mode?: ReviewMode | null;
  /** Highest event `seq` stored for the run. */
  last_seq?: number;
}

export type RunListResponse = ApiResult<RunItem[]>;
export type RunDetailResponse = ApiResult<RunItem>;
/** Stored run events in `seq` order. Each one is checked by the run event reader before use. */
export type RunEventsResponse = ApiResult<unknown[]>;
export type GateAnswerResponse = ApiResult<{ gate_id: string; resolved_seq: number }>;

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
  getEvents: async (
    projectId: string,
    runId: string,
    params: { after: number; limit: number },
    signal?: AbortSignal,
  ): Promise<RunEventsResponse> => {
    const response = await apiService.get<RunEventsResponse>(`${runPath(projectId, runId)}/events`, params, { signal });
    return response.data;
  },
  answerGate: async (
    projectId: string,
    runId: string,
    gateId: string,
    answer: GateAnswer,
  ): Promise<GateAnswerResponse> => {
    const response = await apiService.post<GateAnswerResponse>(
      `${runPath(projectId, runId)}/gates/${encodeURIComponent(gateId)}`,
      answer,
    );
    return response.data;
  },
  pause: async (projectId: string, runId: string): Promise<RunDetailResponse> => {
    const response = await apiService.post<RunDetailResponse>(`${runPath(projectId, runId)}/pause`);
    return response.data;
  },
  resume: async (projectId: string, runId: string): Promise<RunDetailResponse> => {
    const response = await apiService.post<RunDetailResponse>(`${runPath(projectId, runId)}/resume`);
    return response.data;
  },
};
