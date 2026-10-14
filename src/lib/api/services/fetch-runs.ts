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
  /** Set when the run is a pipeline of stages on engines; null for a Popper run. */
  pipeline_key?: string | null;
  interaction_mode?: string | null;
}

/** An answer to a gate a pipeline stage opened. */
export interface StageGateAnswer {
  action: "answer" | "approve" | "comment";
  option_id?: string;
  text?: string;
  params?: Record<string, unknown>;
  /** For `comment`: what the hypotheses must answer, each anchored to the set under review. */
  findings?: Record<string, unknown>[];
}

/** Accepts a finished pipeline stage with what goes forward. */
export interface AcceptStageRequest {
  selection: { hypothesis_ids: string[] };
  note?: string;
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
  answerStageGate: async (
    projectId: string,
    runId: string,
    stageRunId: string,
    gateId: string,
    answer: StageGateAnswer,
  ): Promise<ApiResult<{ gate_id: string; status: string }>> => {
    const response = await apiService.post<ApiResult<{ gate_id: string; status: string }>>(
      `${runPath(projectId, runId)}/stages/${encodeURIComponent(stageRunId)}/gates/${encodeURIComponent(gateId)}`,
      answer,
    );
    return response.data;
  },
  acceptStage: async (
    projectId: string,
    runId: string,
    stageRunId: string,
    body: AcceptStageRequest,
  ): Promise<ApiResult<unknown>> => {
    const response = await apiService.post<ApiResult<unknown>>(
      `${runPath(projectId, runId)}/stages/${encodeURIComponent(stageRunId)}/accept`,
      body,
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
