import type { ApiResult } from "@/types/api";

import { connectionRequest } from "../connection-runtime";
import apiService from "../core";
import { downloadUrl, projectPath, requestDownload } from "../request";
import type { FileDownload, ListParams } from "../types";
import type { ConnectionProviderId, ConnectionSource } from "./fetch-data-connections";

/** What a version read from a data connection keeps about that connection, as it was then. */
export interface ConnectionOrigin {
  connection_id: string;
  connection_name: string;
  connection_kind: ConnectionProviderId;
  source: ConnectionSource;
  fetched_at: string;
}

/** What a version imported from a public repository keeps about the record it came from. */
export interface PublicOrigin {
  /** The repository that published it, such as `zenodo` or `dataverse`. */
  source: string;
  record_id: string;
  doi: string | null;
  source_url: string | null;
  license: string | null;
  citation: string | null;
  file_url: string | null;
  imported_at: string;
}

interface DatasetVersionFields {
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

/**
 * A version and where it came from. The three origins are a union so that reading a connection's
 * fields off a version requires narrowing on `source_type` first: a public import carries a record
 * of its repository, not a connection.
 */
export type DatasetVersionItem = DatasetVersionFields &
  (
    | { source_type: "upload"; source: null }
    | { source_type: "connection"; source: ConnectionOrigin }
    | { source_type: "public"; source: PublicOrigin }
  );

/** The connection a version was read from, or null when it was uploaded or imported openly. */
export function connectionOrigin(version: DatasetVersionItem | null | undefined): ConnectionOrigin | null {
  return version?.source_type === "connection" ? version.source : null;
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

export interface ImportConnectionSource {
  connection_id: string;
  source: ConnectionSource;
}
export interface ImportConnectionDatasetRequest extends ImportConnectionSource {
  name: string;
  description?: string;
}

export type DatasetListResponse = ApiResult<DatasetItem[]>;
export type DatasetDetailResponse = ApiResult<DatasetItem>;
export type DatasetUploadOutcome = "created_dataset" | "created_version" | "created_copy";
export type DatasetUploadResponse = DatasetDetailResponse & {
  meta: DatasetDetailResponse["meta"] & {
    upload: { outcome: DatasetUploadOutcome; dataset_id: string; version_id: string };
  };
};
export interface DatasetPreviewData {
  dataset_id: string;
  version_id: string;
  columns: string[];
  rows: string[][];
  truncated: boolean;
  masking_applied: boolean;
  masked_cells: number;
  detection_status: "ready" | "off";
}
export type DatasetVersionListResponse = ApiResult<DatasetVersionItem[]>;
export type DatasetVersionDetailResponse = ApiResult<DatasetVersionItem>;

const datasetsPath = (projectId: string) => `${projectPath(projectId)}/datasets`;
const datasetPath = (projectId: string, datasetId: string) =>
  `${datasetsPath(projectId)}/${encodeURIComponent(datasetId)}`;
const versionDownloadPath = (projectId: string, datasetId: string, versionId: string) =>
  `${datasetPath(projectId, datasetId)}/versions/${encodeURIComponent(versionId)}/download`;

export const fetchDatasets = {
  importConnection: (projectId: string, input: ImportConnectionDatasetRequest): Promise<DatasetUploadResponse> =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.post<DatasetUploadResponse>(`${datasetsPath(projectId)}/from-connection`, input, {
            timeout: 330_000,
          })
        ).data,
      undefined,
      input.connection_id,
    ),
  importConnectionVersion: (
    projectId: string,
    datasetId: string,
    input: ImportConnectionSource,
  ): Promise<DatasetVersionDetailResponse> =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.post<DatasetVersionDetailResponse>(
            `${datasetPath(projectId, datasetId)}/versions/from-connection`,
            input,
            { timeout: 330_000 },
          )
        ).data,
      undefined,
      input.connection_id,
    ),
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
  ): Promise<DatasetUploadResponse> => {
    const form = new FormData();
    form.append("name", data.name);
    if (data.description !== undefined) form.append("description", data.description);
    form.append("file", data.file);
    const response = await apiService.upload<DatasetUploadResponse>(datasetsPath(projectId), form, onProgress);
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
  /** Refused with `DATASET_IN_USE` (409) once a research run has used the dataset. */
  remove: async (projectId: string, datasetId: string): Promise<ApiResult<null>> => {
    const response = await apiService.delete<ApiResult<null>>(datasetPath(projectId, datasetId));
    return response.data;
  },
  getVersionDownloadUrl: (projectId: string, datasetId: string, versionId: string): string =>
    downloadUrl(versionDownloadPath(projectId, datasetId, versionId)),
  preview: async (projectId: string, datasetId: string, versionId: string, signal?: AbortSignal) => {
    const response = await apiService.get<ApiResult<DatasetPreviewData>>(
      `${datasetPath(projectId, datasetId)}/versions/${encodeURIComponent(versionId)}/preview`,
      { limit: 100 },
      { signal },
    );
    return response.data;
  },
};
