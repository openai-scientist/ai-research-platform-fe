import type { ApiResult } from "@/types/api";
import type { ArtifactKind } from "@/types/enums";

import apiService from "../core";
import { downloadUrl, requestDownload, runPath } from "../request";
import type { FileDownload } from "../types";

export { ArtifactKind } from "@/types/enums";

export interface RunArtifactItem {
  id: string;
  run_id: string;
  kind: ArtifactKind;
  filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  created_at: string;
}

export type ArtifactListResponse = ApiResult<RunArtifactItem[]>;

const artifactDownloadPath = (projectId: string, runId: string, artifactId: string) =>
  `${runPath(projectId, runId)}/artifacts/${encodeURIComponent(artifactId)}/download`;
export const fetchArtifacts = {
  getList: async (projectId: string, runId: string, signal?: AbortSignal): Promise<ArtifactListResponse> => {
    const response = await apiService.get<ArtifactListResponse>(`${runPath(projectId, runId)}/artifacts`, undefined, {
      signal,
    });
    return response.data;
  },
  download: (projectId: string, runId: string, artifactId: string, signal?: AbortSignal): Promise<FileDownload> =>
    requestDownload(artifactDownloadPath(projectId, runId, artifactId), signal),
  getDownloadUrl: (projectId: string, runId: string, artifactId: string): string =>
    downloadUrl(artifactDownloadPath(projectId, runId, artifactId)),
};
