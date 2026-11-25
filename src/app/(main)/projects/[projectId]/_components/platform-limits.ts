"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceKeys } from "@/lib/api/query-keys";
import { fetchWorkspaceSettings, type PlatformLimits } from "@/lib/api/services/fetch-workspace-settings";

/**
 * The Platform's limits for this project, or null while they load or when they can't be read.
 * They are a hint beside a setting, never required: an older backend without the route, or a refusal,
 * shows nothing extra and no error.
 */
export function usePlatformLimits(projectId: string): PlatformLimits | null {
  const query = useQuery({
    queryKey: workspaceKeys.platformLimits(projectId),
    queryFn: ({ signal }) => fetchWorkspaceSettings.platformLimits(projectId, signal),
    enabled: Boolean(projectId),
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  return query.data?.data ?? null;
}

export const formatTokens = (value: number) => `${value.toLocaleString("en-US")} tokens`;
