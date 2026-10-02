import { downloadUrl, requestApi, requestDownload, runPath } from "../request";
import type { RunArtifactItem } from "../types";

const artifactDownloadPath = (projectId: string, runId: string, artifactId: string) =>
  `${runPath(projectId, runId)}/artifacts/${encodeURIComponent(artifactId)}/download`;
export const fetchArtifacts = {
  getList: (projectId: string, runId: string, signal?: AbortSignal) =>
    requestApi<RunArtifactItem[]>({ url: `${runPath(projectId, runId)}/artifacts`, signal }),
  download: (projectId: string, runId: string, artifactId: string, signal?: AbortSignal) =>
    requestDownload(artifactDownloadPath(projectId, runId, artifactId), signal),
  getDownloadUrl: (projectId: string, runId: string, artifactId: string) =>
    downloadUrl(artifactDownloadPath(projectId, runId, artifactId)),
};
