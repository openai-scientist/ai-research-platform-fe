import type { ApiResult } from "@/types/api";

import apiService from "../core";
import { downloadUrl, projectPath, requestDownload } from "../request";
import type { FileDownload, ListParams } from "../types";

export interface DatasetVersionItem {
  id: string;
  dataset_id: string;
  version_number: number;
  original_filename: string;
  size_bytes: number;
  sha256: string;
  row_count: number;
  column_names: string[];
  created_by_user_id: string;
  created_at: string;
}

export interface DatasetItem {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  latest_version: DatasetVersionItem | null;
}

export interface CreateDatasetRequest {
  name: string;
  description?: string;
  file: File;
}

export interface UpdateDatasetRequest {
  name?: string;
  description?: string | null;
}

export type DatasetListResponse = ApiResult<DatasetItem[]>;
export type DatasetDetailResponse = ApiResult<DatasetItem>;
export type DatasetVersionListResponse = ApiResult<DatasetVersionItem[]>;
export type DatasetVersionDetailResponse = ApiResult<DatasetVersionItem>;

const datasetsPath = (projectId: string) => `${projectPath(projectId)}/datasets`;
const datasetPath = (projectId: string, datasetId: string) =>
  `${datasetsPath(projectId)}/${encodeURIComponent(datasetId)}`;
const versionDownloadPath = (projectId: string, datasetId: string, versionId: string) =>
  `${datasetPath(projectId, datasetId)}/versions/${encodeURIComponent(versionId)}/download`;

export const fetchDatasets = {
  getList: async (projectId: string, params?: ListParams, signal?: AbortSignal): Promise<DatasetListResponse> => {
    const response = await apiService.get<DatasetListResponse>(datasetsPath(projectId), params, { signal });
    return response.data;
  },
  getById: async (projectId: string, datasetId: string, signal?: AbortSignal): Promise<DatasetDetailResponse> => {
    const response = await apiService.get<DatasetDetailResponse>(datasetPath(projectId, datasetId), undefined, {
      signal,
    });
    return response.data;
  },
  create: async (
    projectId: string,
    data: CreateDatasetRequest,
    onProgress?: (progress: number) => void,
  ): Promise<DatasetDetailResponse> => {
    const form = new FormData();
    form.append("name", data.name);
    if (data.description !== undefined) form.append("description", data.description);
    form.append("file", data.file);
    const response = await apiService.upload<DatasetDetailResponse>(datasetsPath(projectId), form, onProgress);
    return response.data;
  },
  update: async (projectId: string, datasetId: string, data: UpdateDatasetRequest): Promise<DatasetDetailResponse> => {
    const response = await apiService.patch<DatasetDetailResponse>(datasetPath(projectId, datasetId), data);
    return response.data;
  },
  getVersions: async (
    projectId: string,
    datasetId: string,
    params?: ListParams,
    signal?: AbortSignal,
  ): Promise<DatasetVersionListResponse> => {
    const response = await apiService.get<DatasetVersionListResponse>(
      `${datasetPath(projectId, datasetId)}/versions`,
      params,
      { signal },
    );
    return response.data;
  },
  createVersion: async (
    projectId: string,
    datasetId: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<DatasetVersionDetailResponse> => {
    const form = new FormData();
    form.append("file", file);
    const response = await apiService.upload<DatasetVersionDetailResponse>(
      `${datasetPath(projectId, datasetId)}/versions`,
      form,
      onProgress,
    );
    return response.data;
  },
  downloadVersion: (
    projectId: string,
    datasetId: string,
    versionId: string,
    signal?: AbortSignal,
  ): Promise<FileDownload> => requestDownload(versionDownloadPath(projectId, datasetId, versionId), signal),
  getVersionDownloadUrl: (projectId: string, datasetId: string, versionId: string): string =>
    downloadUrl(versionDownloadPath(projectId, datasetId, versionId)),
};
