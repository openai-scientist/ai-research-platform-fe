import { projectPath, requestApi, runPath } from "../request";
import type { ListParams, RunCreate, RunItem } from "../types";

export const fetchRuns = {
  getList: (projectId: string, params?: ListParams, signal?: AbortSignal) =>
    requestApi<RunItem[]>({ url: `${projectPath(projectId)}/runs`, params, signal }),
  getById: (projectId: string, runId: string, signal?: AbortSignal) =>
    requestApi<RunItem>({ url: runPath(projectId, runId), signal }),
  create: (projectId: string, data: RunCreate) =>
    requestApi<RunItem>({ method: "POST", url: `${projectPath(projectId)}/runs`, data }),
  sync: (projectId: string, runId: string) =>
    requestApi<RunItem>({ method: "POST", url: `${runPath(projectId, runId)}/sync` }),
  abandon: (projectId: string, runId: string) =>
    requestApi<RunItem>({ method: "POST", url: `${runPath(projectId, runId)}/abandon` }),
};
