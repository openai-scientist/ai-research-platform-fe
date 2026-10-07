"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConnectionAccess, recordConnectionError, subscribeConnectionAccess } from "@/lib/api/connection-runtime";
import { connectionKeys } from "@/lib/api/query-keys";
import {
  type ConnectionItem,
  type ConnectionListParams,
  fetchDataConnections,
} from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import { useInfinityScroll } from "./use-infinity-scroll";

const reasonHints: Record<string, string> = {
  host_not_allowed: "Use a public database host. Localhost and private addresses are not supported.",
  unreachable: "Check the host, port and firewall settings.",
  timeout: "Check the firewall and try again.",
  tls_unavailable: "This server does not support TLS. Select disable only if you accept an unencrypted connection.",
  tls_verify_failed: "Check the certificate, or use require for a server with a self-signed certificate.",
  source_not_found: "Choose another table or check the database account's read permissions.",
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
      description = "Wait for the current database request to finish, then try again.";
  }
  toast.error(error instanceof Error ? error.message : "The database request could not be completed.", { description });
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
  return { configured: snapshot.configured, waitSeconds, rateLimited: waitSeconds > 0 };
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
