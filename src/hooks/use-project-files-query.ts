"use client";

import { projectKeys } from "@/lib/api/query-keys";
import {
  fetchProjectFiles,
  type ProjectFileItem,
  type ProjectFileListParams,
} from "@/lib/api/services/fetch-project-files";

import { useApiMutation } from "./use-api";
import { type InfiniteFilters, useInfinityScroll } from "./use-infinity-scroll";

export function useInfiniteProjectFiles(projectId: string, filters?: InfiniteFilters<ProjectFileListParams>) {
  const query = useInfinityScroll<ProjectFileItem, ProjectFileListParams>({
    queryKey: projectKeys.fileLists(projectId),
    filters,
    fetchPage: (params, signal) => fetchProjectFiles.getList(projectId, params, signal),
    enabled: Boolean(projectId),
  });
  return { ...query, files: query.items };
}

export function useUploadProjectFileMutation(projectId: string) {
  return useApiMutation((file: File) => fetchProjectFiles.upload(projectId, file), [projectKeys.fileLists(projectId)]);
}

export function useDeleteProjectFileMutation(projectId: string) {
  return useApiMutation(
    (fileId: string) => fetchProjectFiles.delete(projectId, fileId),
    [projectKeys.fileLists(projectId)],
  );
}

export function useDownloadProjectFileMutation(projectId: string) {
  return useApiMutation((fileId: string) => fetchProjectFiles.download(projectId, fileId));
}
