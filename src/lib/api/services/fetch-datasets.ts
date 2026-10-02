import type { AxiosProgressEvent } from "axios";

import { downloadUrl, projectPath, requestApi, requestDownload } from "../request";
import type { DatasetCreate, DatasetItem, DatasetPatch, DatasetVersionItem, ListParams } from "../types";

const datasetsPath = (projectId: string) => `${projectPath(projectId)}/datasets`;
const datasetPath = (projectId: string, datasetId: string) =>
  `${datasetsPath(projectId)}/${encodeURIComponent(datasetId)}`;
const versionDownloadPath = (projectId: string, datasetId: string, versionId: string) =>
  `${datasetPath(projectId, datasetId)}/versions/${encodeURIComponent(versionId)}/download`;
function uploadProgress(onProgress?: (progress: number) => void) {
  return ({ loaded, total }: AxiosProgressEvent) => {
    if (total) onProgress?.(Math.round((loaded * 100) / total));
  };
}

export const fetchDatasets = {
  getList: (projectId: string, params?: ListParams, signal?: AbortSignal) =>
    requestApi<DatasetItem[]>({ url: datasetsPath(projectId), params, signal }),
  getById: (projectId: string, datasetId: string, signal?: AbortSignal) =>
    requestApi<DatasetItem>({ url: datasetPath(projectId, datasetId), signal }),
  create: (projectId: string, data: DatasetCreate, onProgress?: (progress: number) => void) => {
    const form = new FormData();
    form.append("name", data.name);
    if (data.description !== undefined) form.append("description", data.description);
    form.append("file", data.file);
    return requestApi<DatasetItem>({
      method: "POST",
      url: datasetsPath(projectId),
      data: form,
      onUploadProgress: uploadProgress(onProgress),
    });
  },
  update: (projectId: string, datasetId: string, data: DatasetPatch) =>
    requestApi<DatasetItem>({ method: "PATCH", url: datasetPath(projectId, datasetId), data }),
  getVersions: (projectId: string, datasetId: string, params?: ListParams, signal?: AbortSignal) =>
    requestApi<DatasetVersionItem[]>({ url: `${datasetPath(projectId, datasetId)}/versions`, params, signal }),
  createVersion: (projectId: string, datasetId: string, file: File, onProgress?: (progress: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return requestApi<DatasetVersionItem>({
      method: "POST",
      url: `${datasetPath(projectId, datasetId)}/versions`,
      data: form,
      onUploadProgress: uploadProgress(onProgress),
    });
  },
  downloadVersion: (projectId: string, datasetId: string, versionId: string, signal?: AbortSignal) =>
    requestDownload(versionDownloadPath(projectId, datasetId, versionId), signal),
  getVersionDownloadUrl: (projectId: string, datasetId: string, versionId: string) =>
    downloadUrl(versionDownloadPath(projectId, datasetId, versionId)),
};
