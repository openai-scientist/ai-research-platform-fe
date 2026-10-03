import type { ApiResult } from "@/types/api";

import apiService from "../core";
import { projectPath } from "../request";
import type { ListParams } from "../types";

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

export interface SaveResearchContextRequest {
  body: string;
  front_matter?: FrontMatter | null;
  base_version?: number | null;
}

export type ResearchContextDetailResponse = ApiResult<ResearchContextItem>;
export type ResearchContextVersionListResponse = ApiResult<ResearchContextSummary[]>;

const contextPath = (projectId: string) => `${projectPath(projectId)}/research-context`;
export const fetchResearchContext = {
  getLatest: async (projectId: string, signal?: AbortSignal): Promise<ResearchContextDetailResponse> => {
    const response = await apiService.get<ResearchContextDetailResponse>(contextPath(projectId), undefined, { signal });
    return response.data;
  },
  save: async (projectId: string, data: SaveResearchContextRequest): Promise<ResearchContextDetailResponse> => {
    const response = await apiService.put<ResearchContextDetailResponse>(contextPath(projectId), data);
    return response.data;
  },
  getVersions: async (
    projectId: string,
    params?: ListParams,
    signal?: AbortSignal,
  ): Promise<ResearchContextVersionListResponse> => {
    const response = await apiService.get<ResearchContextVersionListResponse>(
      `${contextPath(projectId)}/versions`,
      params,
      { signal },
    );
    return response.data;
  },
  getVersion: async (
    projectId: string,
    versionNumber: number,
    signal?: AbortSignal,
  ): Promise<ResearchContextDetailResponse> => {
    const response = await apiService.get<ResearchContextDetailResponse>(
      `${contextPath(projectId)}/versions/${versionNumber}`,
      undefined,
      { signal },
    );
    return response.data;
  },
};
