"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConnectionAccess, recordConnectionError, subscribeConnectionAccess } from "@/lib/api/connection-runtime";
import { collectPages } from "@/lib/api/infinite-pagination";
import { connectionKeys } from "@/lib/api/query-keys";
import {
  type ConnectionItem,
  type ConnectionListParams,
  fetchDataConnections,
} from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import { useInfinityScroll } from "./use-infinity-scroll";

const reasonHints: Record<string, string> = {
  host_not_allowed: "Use a public host. Localhost and private addresses are not supported.",
  unreachable: "The data source could not be reached. Check access and try again.",
  timeout: "The data source took too long to respond. Try again.",
  tls_unavailable: "This server does not support TLS. Select disable only if you accept an unencrypted connection.",
  tls_verify_failed: "Check the server certificate and hostname.",
  source_not_found: "Reload the source list and columns. The source may have been renamed or removed.",
  access_revoked: "Reconnect this connection using the original Google account.",
  rate_limited: "The source is limiting requests. Please try again later.",
  source_too_large:
    "Choose a smaller source. For time series, narrow the range, increase the bucket or choose fewer tags.",
  too_many_points: "Choose a larger bucket or a shorter time range. Prometheus allows at most 11,000 buckets.",
  query_timeout: "Narrow the query before trying again.",
  scan_limit_exceeded: "Filter by partition or select fewer columns. The scan limit is 1 GiB.",
  cell_too_large: "Exclude the affected column or shorten it in your SELECT query.",
};

export function showConnectionError(error: unknown, projectId?: string) {
  if (projectId) recordConnectionError(projectId, error);
  let description: string | undefined;
  if (error instanceof ApiError) {
    description = error.reason ? reasonHints[error.reason] : undefined;
    if (error.code === "CONNECTIONS_NOT_CONFIGURED")
      description = "Contact your administrator to enable data connections.";
    if (error.code === "CONNECTION_SECRET_UNREADABLE") description = "Delete this connection and create it again.";
    if (error.code === "RATE_LIMITED" && error.retryAfter !== null)
      description = `Try again in ${error.retryAfter} seconds.`;
    if (error.code === "CONNECTION_BUSY")
      description = "Wait for the current data source request to finish, then try again.";
  }
  toast.error(error instanceof Error ? error.message : "The data source request could not be completed.", {
    description,
  });
}

export function useGoogleConnectionsAvailable(enabled: boolean) {
  const query = useQuery({
    queryKey: ["google-connections", "availability"],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/google-connections", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Unable to check Google connections availability.");
      const body: { available: boolean } = await response.json();
      return body.available;
    },
  });
  return query.data === true;
}

export function useConnectionAccess(projectId: string) {
  const snapshot = useSyncExternalStore(
    subscribeConnectionAccess,
    () => getConnectionAccess(projectId),
    () => getConnectionAccess(""),
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (snapshot.retryAt <= Date.now()) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= snapshot.retryAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [snapshot.retryAt]);
  const waitSeconds = Math.max(0, Math.ceil((snapshot.retryAt - now) / 1000));
  return {
    configured: snapshot.configured,
    revokedConnectionIds: snapshot.revokedConnectionIds,
    waitSeconds,
    rateLimited: waitSeconds > 0,
  };
}

export function useInfiniteDataConnections(projectId: string, q?: string) {
  const access = useConnectionAccess(projectId);
  const query = useInfinityScroll<ConnectionItem, ConnectionListParams>({
    queryKey: connectionKeys.list(projectId, q),
    filters: { q },
    fetchPage: (params, signal) => fetchDataConnections.getList(projectId, params, signal),
    enabled: Boolean(projectId) && !access.rateLimited,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return { ...query, connections: query.items };
}

/** Every connection in the project, for per-provider counts and instant client-side filtering. */
export function useAllDataConnections(projectId: string) {
  const access = useConnectionAccess(projectId);
  return useQuery({
    queryKey: [...connectionKeys.lists(projectId), "all"],
    queryFn: ({ signal }) => collectPages((params) => fetchDataConnections.getList(projectId, params, signal)),
    enabled: Boolean(projectId) && !access.rateLimited,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useConnectionActions(projectId: string) {
  const queryClient = useQueryClient();
  const options = {
    retry: false as const,
    onError: (error: Error) => showConnectionError(error, projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: connectionKeys.project(projectId) });
    },
  };
  const rename = useMutation({
    ...options,
    mutationFn: ({ id, name }: { id: string; name: string }) => fetchDataConnections.rename(projectId, id, name),
  });
  const remove = useMutation({ ...options, mutationFn: (id: string) => fetchDataConnections.remove(projectId, id) });
  const test = useMutation({ ...options, mutationFn: (id: string) => fetchDataConnections.test(projectId, id) });
  return { rename, remove, test, pending: rename.isPending || remove.isPending || test.isPending };
}
