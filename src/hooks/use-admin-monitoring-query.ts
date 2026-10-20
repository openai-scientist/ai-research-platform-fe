"use client";

import type {
  MonitoringEventsParams,
  MonitoringMetricsParams,
  MonitoringServicesParams,
  OverviewParams,
} from "@/lib/api/services/admin-monitoring-types";
import { fetchAdminMonitoring } from "@/lib/api/services/fetch-admin-monitoring";
import { ApiError } from "@/types/api";

import { useApiMutation, useApiQuery } from "./use-api";

export const monitoringKeys = {
  all: ["admin", "monitoring"] as const,
  overview: (params: OverviewParams) => ["admin", "overview", params] as const,
  services: (params: MonitoringServicesParams) => ["admin", "monitoring", "services", params] as const,
  events: (params: MonitoringEventsParams) => ["admin", "monitoring", "events", params] as const,
  event: (id: string) => ["admin", "monitoring", "event", id] as const,
  metrics: (id: string, params: MonitoringMetricsParams, windowSeconds?: number) =>
    ["admin", "monitoring", "metrics", id, params, windowSeconds] as const,
};

// Honor server backoff for transient failures; auth and validation errors never retry.
const retry = (count: number, error: Error) =>
  count < 1 && (!(error instanceof ApiError) || error.status === 0 || error.status === 429 || error.status >= 500);
const retryDelay = (_count: number, error: Error) =>
  error instanceof ApiError && error.retryAfter !== null ? error.retryAfter * 1000 : 3000;
const queryOptions = (enabled: boolean) => ({ enabled, retry, retryDelay, refetchOnWindowFocus: false });

export function useAdminOverviewQuery(params: OverviewParams, enabled: boolean) {
  return useApiQuery(
    monitoringKeys.overview(params),
    (signal) => fetchAdminMonitoring.overview(params, signal),
    queryOptions(enabled),
  );
}
export function useMonitoringServices(params: MonitoringServicesParams, enabled: boolean) {
  return useApiQuery(
    monitoringKeys.services(params),
    (signal) => fetchAdminMonitoring.services(params, signal),
    queryOptions(enabled),
  );
}
export function useMonitoringEvents(params: MonitoringEventsParams, enabled: boolean) {
  return useApiQuery(
    monitoringKeys.events(params),
    (signal) => fetchAdminMonitoring.events(params, signal),
    queryOptions(enabled),
  );
}
export function useMonitoringMetrics(
  id: string,
  params: MonitoringMetricsParams,
  enabled: boolean,
  windowSeconds?: number,
) {
  return useApiQuery(
    monitoringKeys.metrics(id, params, windowSeconds),
    (signal) => {
      // Recompute the rolling window on every SSE refresh without changing the cache key.
      // Keep the backend's capture delay so the requested interval has persisted coverage.
      if (windowSeconds && !params.from && !params.to) {
        const to = new Date(Date.now() - 45000);
        const from = new Date(to.getTime() - windowSeconds * 1000);
        return fetchAdminMonitoring.metrics(id, { ...params, from: from.toISOString(), to: to.toISOString() }, signal);
      }
      return fetchAdminMonitoring.metrics(id, params, signal);
    },
    queryOptions(enabled && Boolean(id)),
  );
}
export function useMonitoringEvent(id: string, enabled: boolean) {
  return useApiQuery(
    monitoringKeys.event(id),
    (signal) => fetchAdminMonitoring.event(id, signal),
    queryOptions(enabled && Boolean(id)),
  );
}
export function useAcknowledgeMonitoringAlert() {
  return useApiMutation(fetchAdminMonitoring.acknowledge, [monitoringKeys.all]);
}
