"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import type { ApiResult } from "@/lib/api/request";
import { fetchDatasets } from "@/lib/api/services/fetch-datasets";
import type { DatasetCreate, DatasetItem, DatasetPatch, DatasetVersionItem, ListParams } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

export function useDatasetsQuery(
  projectId: string,
  params?: ListParams,
  options?: ApiQueryOptions<ApiResult<DatasetItem[]>>,
) {
  return useApiQuery(
    projectKeys.datasets(projectId, params),
    (signal) => fetchDatasets.getList(projectId, params, signal),
    { ...options, enabled: Boolean(projectId) && (options?.enabled ?? true) },
  );
}
export function useDatasetDetailQuery(
  projectId: string,
  datasetId: string,
  options?: ApiQueryOptions<ApiResult<DatasetItem>>,
) {
  return useApiQuery(
    projectKeys.dataset(projectId, datasetId),
    (signal) => fetchDatasets.getById(projectId, datasetId, signal),
    { ...options, enabled: Boolean(projectId && datasetId) && (options?.enabled ?? true) },
  );
}
export function useDatasetVersionsQuery(
  projectId: string,
  datasetId: string,
  params?: ListParams,
  options?: ApiQueryOptions<ApiResult<DatasetVersionItem[]>>,
) {
  return useApiQuery(
    projectKeys.datasetVersions(projectId, datasetId, params),
    (signal) => fetchDatasets.getVersions(projectId, datasetId, params, signal),
    { ...options, enabled: Boolean(projectId && datasetId) && (options?.enabled ?? true) },
  );
}
export function useCreateDatasetMutation(projectId: string, onProgress?: (progress: number) => void) {
  return useApiMutation(
    (data: DatasetCreate) => fetchDatasets.create(projectId, data, onProgress),
    [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all],
  );
}
export function useUpdateDatasetMutation(projectId: string, datasetId: string) {
  return useApiMutation(
    (data: DatasetPatch) => fetchDatasets.update(projectId, datasetId, data),
    [projectKeys.detail(projectId), adminKeys.all],
  );
}
export function useCreateDatasetVersionMutation(
  projectId: string,
  datasetId: string,
  onProgress?: (progress: number) => void,
) {
  return useApiMutation(
    (file: File) => fetchDatasets.createVersion(projectId, datasetId, file, onProgress),
    [projectKeys.detail(projectId), adminKeys.all],
  );
}
export function useDownloadDatasetVersionMutation(projectId: string, datasetId: string) {
  return useApiMutation((versionId: string) => fetchDatasets.downloadVersion(projectId, datasetId, versionId));
}
