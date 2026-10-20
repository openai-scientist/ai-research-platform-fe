"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { fetchProjectAccess } from "@/lib/api/services/fetch-project-access";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuth } from "@/lib/redux/slices/auth-slice";
import { ApiError } from "@/types/api";

import { useApiQuery } from "./use-api";

export const projectAccessKey = (projectId: string) => ["projects", "detail", projectId, "access-context"] as const;

export function useDatasetAccessRefresh(projectId: string, error: Error | null) {
  const client = useQueryClient();
  useEffect(() => {
    if (error instanceof ApiError && ["DATASET_ACCESS_DENIED", "ROLE_REQUIRED", "NOT_FOUND"].includes(error.code)) {
      void client.invalidateQueries({ queryKey: projectAccessKey(projectId) });
    }
  }, [client, error, projectId]);
}

export function useProjectAccess(projectId: string) {
  const client = useQueryClient();
  const userId = useAppSelector(selectAuth).user?.id;
  const query = useApiQuery(
    [...projectAccessKey(projectId), userId],
    (signal) => fetchProjectAccess(projectId, signal),
    { enabled: Boolean(projectId && userId), staleTime: 0, refetchInterval: 10_000 },
  );
  const denied = query.isError || query.data?.data.permissions.can_read_raw_datasets === false;
  useEffect(() => {
    if (!denied) return;
    const filter = { queryKey: ["projects", "detail", projectId, "datasets"] };
    void client.cancelQueries(filter);
    client.removeQueries(filter);
  }, [client, denied, projectId]);
  return { ...query, context: query.isError ? undefined : query.data?.data, userId };
}
