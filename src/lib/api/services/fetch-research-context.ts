import { projectPath, requestApi } from "../request";
import type { ListParams, ResearchContextItem, ResearchContextSave, ResearchContextSummary } from "../types";

const contextPath = (projectId: string) => `${projectPath(projectId)}/research-context`;
export const fetchResearchContext = {
  getLatest: (projectId: string, signal?: AbortSignal) =>
    requestApi<ResearchContextItem>({ url: contextPath(projectId), signal }),
  save: (projectId: string, data: ResearchContextSave) =>
    requestApi<ResearchContextItem>({ method: "PUT", url: contextPath(projectId), data }),
  getVersions: (projectId: string, params?: ListParams, signal?: AbortSignal) =>
    requestApi<ResearchContextSummary[]>({ url: `${contextPath(projectId)}/versions`, params, signal }),
  getVersion: (projectId: string, versionNumber: number, signal?: AbortSignal) =>
    requestApi<ResearchContextItem>({ url: `${contextPath(projectId)}/versions/${versionNumber}`, signal }),
};
