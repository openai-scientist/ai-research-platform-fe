import type { CaseReference, Charter, GateAnswer, IntentKind, ReviewMode } from "@/lib/run-stream/contract";
import type { ApiResult } from "@/types/api";
import type { RunStatus } from "@/types/enums";

import apiService from "../core";
import { projectPath, runPath } from "../request";
import type { ListParams } from "../types";

export { RunStatus } from "@/types/enums";

/** The body of `POST …/runs`: the research case and how the run stops for you. */
export interface CreateRunRequest {
  /** Required unless the intent is explore_dataset. */
  problem?: string | null;
  intent: { kind: IntentKind; text: string };
  context?: string;
  constraints?: string[];
  references?: CaseReference[];
  domains: string[];
  review_mode: ReviewMode;
}

/** The one source of a run's aim, scope and limits. It is a draft until the PI's charter settles it. */
export interface ResearchCase {
  version: number;
  status: "draft" | "settled";
  intent: { kind: IntentKind; text: string };
  /** Null only while an explore_dataset run waits for the dataset stage to propose one. */
  problem: { text: string; source: "researcher" | "dataset_proposed" } | null;
  context: string;
  constraints: string[];
  references: { citation: string; note: string }[];
  domains: string[];
  dataset_version_id: string | null;
  clarifications?: { question: string; answer: string }[];
  amendments?: { version: number; fields: string[]; reason: string; at: string }[];
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
  label?: string;
  /** The research problem, or "Explore dataset <name>". */
  title?: string;
  case?: ResearchCase;
  /** Optional parts of the case left empty: a hint, never a block. */
  case_gaps?: string[];
  domains?: string[];
  review_mode?: ReviewMode | null;
  /** Highest event `seq` stored for the run. */
  last_seq?: number;
  /** Set when the run is a pipeline of stages on engines; null for a Popper run. */
  pipeline_key?: string | null;
  interaction_mode?: string | null;
  /** Pipeline runs count tokens rather than dollars. */
  tokens_used?: number;
  token_budget?: number;
  /** A pipeline run's open stage. */
  current_stage?: { stage_run_id: string; stage_key: string; status: string; phase?: string | null } | null;
  /** Whether the Platform repairs the run by itself, or needs someone to act. */
  recovery?: RunRecovery | null;
}

/** The question a run answers, as the researcher wrote it; null for a run that explores a dataset. */
export const runProblem = (run: RunItem) => run.case?.problem?.text ?? null;
/** What a run is called: its problem, or the title the server gives a run without one. */
export const runTitle = (run: RunItem) => runProblem(run) ?? run.title ?? null;

export interface RunRecovery {
  state: "healing" | "needs_you" | "none";
  reason: string;
  attempt?: number | null;
  max_attempts?: number | null;
  next_try_at?: string | null;
  action?:
    | "wait"
    | "rerun"
    | "raise_budget"
    | "accept"
    | "answer_gate"
    | "redo"
    | "endorse_charter"
    | "answer_pi"
    | null;
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

/** One question the run put to the PI, with its answer once it has one. */
export interface PiConsultation {
  id: string;
  kind: "charter" | "stage_review" | "stage_outcome" | "failure" | "close";
  authority: "pi" | "researcher";
  status: string;
  result: { decision?: { charter?: Charter | null; note?: string | null } | null } | null;
  failure: { code?: string; message?: string } | null;
  created_at: string;
  decided_at: string | null;
}

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
  /** Asks the engine of the open stage where it is: for a run that looks stuck. */
  sync: async (projectId: string, runId: string): Promise<RunDetailResponse> => {
    const response = await apiService.post<RunDetailResponse>(`${runPath(projectId, runId)}/sync`);
    return response.data;
  },
  /** Cancels the open stage; the run ends as stopped and its stage can be rerun. */
  stop: async (projectId: string, runId: string): Promise<RunDetailResponse> => {
    const response = await apiService.post<RunDetailResponse>(`${runPath(projectId, runId)}/stop`, {});
    return response.data;
  },
  /** A new total token budget; a run that stopped on its budget goes on. */
  raiseBudget: async (projectId: string, runId: string, tokenBudget: number): Promise<RunDetailResponse> => {
    const response = await apiService.post<RunDetailResponse>(`${runPath(projectId, runId)}/budget`, {
      token_budget: tokenBudget,
    });
    return response.data;
  },
  /** Starts a failed or stopped stage again; `fresh` starts it from its first step. */
  rerunStage: async (projectId: string, runId: string, stageRunId: string, fresh = false) => {
    const response = await apiService.post<ApiResult<unknown>>(
      `${runPath(projectId, runId)}/stages/${encodeURIComponent(stageRunId)}/rerun`,
      { fresh },
    );
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
  getConsultations: async (
    projectId: string,
    runId: string,
    signal?: AbortSignal,
  ): Promise<ApiResult<PiConsultation[]>> => {
    const response = await apiService.get<ApiResult<PiConsultation[]>>(
      `${runPath(projectId, runId)}/pi/consultations`,
      undefined,
      { signal },
    );
    return response.data;
  },
  /** Takes the PI's recommendation as your own decision. */
  endorseConsultation: async (projectId: string, runId: string, consultationId: string, reason?: string) => {
    const response = await apiService.post<ApiResult<{ consultation_id: string; status: string }>>(
      `${runPath(projectId, runId)}/pi/consultations/${encodeURIComponent(consultationId)}/endorse`,
      reason ? { reason } : {},
    );
    return response.data;
  },
  retryConsultation: async (projectId: string, runId: string, consultationId: string) => {
    const response = await apiService.post<ApiResult<{ consultation_id: string; status: string }>>(
      `${runPath(projectId, runId)}/pi/consultations/${encodeURIComponent(consultationId)}/retry`,
    );
    return response.data;
  },
  /** Writes the charter yourself; it replaces the PI's draft. */
  putCharter: async (projectId: string, runId: string, charter: Charter, reason?: string) => {
    const response = await apiService.put<ApiResult<{ charter_status: string }>>(
      `${runPath(projectId, runId)}/pi/charter`,
      {
        charter,
        ...(reason ? { reason } : {}),
      },
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
