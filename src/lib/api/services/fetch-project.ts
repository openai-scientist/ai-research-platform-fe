import type { ProjectRole } from "@/lib/auth/types";
import type { ApiResult } from "@/types/api";
import type { ProjectStatus } from "@/types/enums";

import apiService from "../core";
import { projectPath } from "../request";
import type { ListParams } from "../types";

export { ProjectStatus } from "@/types/enums";

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  domain: string | null;
  objective: string | null;
  tags: string[];
  status: ProjectStatus;
  owner_user_id: string;
  my_role: ProjectRole | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
  domain?: string | null;
  objective?: string | null;
  tags?: string[];
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>;

export interface ProjectListParams extends ListParams {
  include_archived?: boolean;
}

export type ProjectListResponse = ApiResult<ProjectItem[]>;
export type ProjectDetailResponse = ApiResult<ProjectItem>;

export type Project = ProjectItem;

export const fetchProject = {
  transferOwnership: async (id: string, newOwnerUserId: string): Promise<ProjectDetailResponse> => {
    const response = await apiService.post<ProjectDetailResponse>(`${projectPath(id)}/transfer-ownership`, {
      new_owner_user_id: newOwnerUserId,
    });
    return response.data;
  },
  remove: async (id: string): Promise<ApiResult<null>> => {
    const response = await apiService.delete<ApiResult<null>>(projectPath(id));
    return response.data;
  },
  getList: async (params?: ProjectListParams, signal?: AbortSignal): Promise<ProjectListResponse> => {
    const response = await apiService.get<ProjectListResponse>("/projects", params, { signal });
    return response.data;
  },
  getById: async (id: string, signal?: AbortSignal): Promise<ProjectDetailResponse> => {
    const response = await apiService.get<ProjectDetailResponse>(projectPath(id), undefined, { signal });
    return response.data;
  },
  create: async (data: CreateProjectRequest): Promise<ProjectDetailResponse> => {
    const response = await apiService.post<ProjectDetailResponse>("/projects", data);
    return response.data;
  },
  update: async (id: string, data: UpdateProjectRequest): Promise<ProjectDetailResponse> => {
    const response = await apiService.patch<ProjectDetailResponse>(projectPath(id), data);
    return response.data;
  },
  archive: async (id: string): Promise<ProjectDetailResponse> => {
    const response = await apiService.post<ProjectDetailResponse>(`${projectPath(id)}/archive`);
    return response.data;
  },
  restore: async (id: string): Promise<ProjectDetailResponse> => {
    const response = await apiService.post<ProjectDetailResponse>(`${projectPath(id)}/restore`);
    return response.data;
  },
  complete: async (id: string): Promise<ProjectDetailResponse> => {
    const response = await apiService.post<ProjectDetailResponse>(`${projectPath(id)}/complete`);
    return response.data;
  },
  reopen: async (id: string): Promise<ProjectDetailResponse> => {
    const response = await apiService.post<ProjectDetailResponse>(`${projectPath(id)}/reopen`);
    return response.data;
  },
};
