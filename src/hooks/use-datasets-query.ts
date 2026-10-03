"use client";

import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type CreateDatasetRequest,
  type DatasetDetailResponse,
  type DatasetItem,
  type DatasetListResponse,
  type DatasetVersionItem,
  type DatasetVersionListResponse,
  fetchDatasets,
  type UpdateDatasetRequest,
} from "@/lib/api/services/fetch-datasets";
import type { ListParams } from "@/lib/api/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";
import { type InfiniteQueryOptions, useInfinityScroll } from "./use-infinity-scroll";

export function useInfiniteDatasets(projectId: string, options?: InfiniteQueryOptions<DatasetItem>) {
  const query = useInfinityScroll<DatasetItem, ListParams>({
    ...options,
    queryKey: projectKeys.datasets(projectId),
    fetchPage: (params, signal) => fetchDatasets.getList(projectId, params, signal),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
  return { ...query, datasets: query.items };
}

export function useInfiniteDatasetVersions(
  projectId: string,
  datasetId: string,
  options?: InfiniteQueryOptions<DatasetVersionItem>,
) {
  const query = useInfinityScroll<DatasetVersionItem, ListParams>({
    ...options,
    queryKey: projectKeys.datasetVersions(projectId, datasetId),
    fetchPage: (params, signal) => fetchDatasets.getVersions(projectId, datasetId, params, signal),
    enabled: Boolean(projectId && datasetId) && (options?.enabled ?? true),
  });
  return { ...query, versions: query.items };
}

export function useDatasetsQuery(
  projectId: string,
  params?: ListParams,
  options?: ApiQueryOptions<DatasetListResponse>,
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
  options?: ApiQueryOptions<DatasetDetailResponse>,
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
  options?: ApiQueryOptions<DatasetVersionListResponse>,
) {
  return useApiQuery(
    projectKeys.datasetVersions(projectId, datasetId, params),
    (signal) => fetchDatasets.getVersions(projectId, datasetId, params, signal),
    { ...options, enabled: Boolean(projectId && datasetId) && (options?.enabled ?? true) },
  );
}
export function useCreateDatasetMutation(projectId: string, onProgress?: (progress: number) => void) {
  return useApiMutation(
    (data: CreateDatasetRequest) => fetchDatasets.create(projectId, data, onProgress),
    [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all],
  );
}
export function useUpdateDatasetMutation(projectId: string, datasetId: string) {
  return useApiMutation(
    (data: UpdateDatasetRequest) => fetchDatasets.update(projectId, datasetId, data),
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
