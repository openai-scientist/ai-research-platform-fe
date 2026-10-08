import type { ApiResult } from "@/types/api";

import apiService from "../core";
import { projectPath, requestDownload } from "../request";
import type { FileDownload, ListParams } from "../types";

export type ProjectFileKind = "pdf" | "csv" | "excel";

export interface ProjectFileItem {
  id: string;
  project_id: string;
  filename: string;
  kind: ProjectFileKind;
  content_type: string;
  size_bytes: number;
  sha256: string;
  created_by_user_id: string;
  created_at: string;
}

export interface ProjectFileListParams extends ListParams {
  q?: string;
  kind?: ProjectFileKind;
}

export type ProjectFileListResponse = ApiResult<ProjectFileItem[]>;

const filesPath = (projectId: string) => `${projectPath(projectId)}/files`;
const filePath = (projectId: string, fileId: string) => `${filesPath(projectId)}/${encodeURIComponent(fileId)}`;

export const fetchProjectFiles = {
  getList: async (
    projectId: string,
    params?: ProjectFileListParams,
    signal?: AbortSignal,
  ): Promise<ProjectFileListResponse> => {
    const response = await apiService.get<ProjectFileListResponse>(filesPath(projectId), params, { signal });
    return response.data;
  },
  upload: async (projectId: string, file: File): Promise<ApiResult<ProjectFileItem>> => {
    const form = new FormData();
    form.append("file", file);
    const response = await apiService.upload<ApiResult<ProjectFileItem>>(filesPath(projectId), form);
    return response.data;
  },
  download: (projectId: string, fileId: string, signal?: AbortSignal): Promise<FileDownload> =>
    requestDownload(`${filePath(projectId, fileId)}/download`, signal),
  delete: async (projectId: string, fileId: string): Promise<ApiResult<null>> => {
    const response = await apiService.delete<ApiResult<null>>(filePath(projectId, fileId));
    return response.data;
  },
};
