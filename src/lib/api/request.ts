import { getApiBaseUrl } from "./config";
import apiService from "./core";
import type { FileDownload } from "./types";

export const projectPath = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;
export const runPath = (projectId: string, runId: string) =>
  `${projectPath(projectId)}/runs/${encodeURIComponent(runId)}`;
export const downloadUrl = (path: string) => `${getApiBaseUrl()}${path}`;

export async function requestDownload(url: string, signal?: AbortSignal): Promise<FileDownload> {
  const response = await apiService.get<Blob>(url, undefined, { responseType: "blob", signal });
  const disposition = String(response.headers["content-disposition"] ?? "");
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename="([^"]+)"|filename=([^;]+)/i.exec(disposition);
  let filename = plain?.[1] ?? plain?.[2]?.trim() ?? null;
  if (encoded) {
    try {
      filename = decodeURIComponent(encoded);
    } catch {
      filename = encoded;
    }
  }
  return { blob: response.data, filename, contentType: String(response.headers["content-type"] ?? response.data.type) };
}
