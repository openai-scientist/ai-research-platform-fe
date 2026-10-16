import { ApiError, type ApiResult, type RequestParams } from "@/types/api";

import apiService from "../core";
import type {
  AdminOverviewData,
  MonitoringAlert,
  MonitoringEvent,
  MonitoringEventDetail,
  MonitoringEventsParams,
  MonitoringMetricsData,
  MonitoringMetricsParams,
  MonitoringService,
  MonitoringServicesParams,
  OverviewParams,
} from "./admin-monitoring-types";

const root = "/admin/log-monitoring";
const cooldowns = new Map<string, { until: number; error: ApiError }>();

async function withBackoff<T>(path: string, request: () => Promise<T>): Promise<T> {
  const cooldown = cooldowns.get(path);
  if (cooldown && cooldown.until > Date.now()) {
    const error = cooldown.error;
    throw new ApiError(
      error.status,
      error.code,
      error.message,
      error.details,
      error.requestId,
      Math.ceil((cooldown.until - Date.now()) / 1000),
      error.reason,
    );
  }
  cooldowns.delete(path);
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 429 || error.status === 503) && error.retryAfter !== null) {
      cooldowns.set(path, { until: Date.now() + error.retryAfter * 1000, error });
    }
    throw error;
  }
}

function get<T>(path: string, params?: RequestParams, signal?: AbortSignal) {
  return withBackoff(path, async () => (await apiService.get<ApiResult<T>>(path, params, { signal })).data);
}

export const fetchAdminMonitoring = {
  overview: (params: OverviewParams, signal?: AbortSignal) => get<AdminOverviewData>("/admin/overview", params, signal),
  services: (params: MonitoringServicesParams, signal?: AbortSignal) =>
    get<MonitoringService[]>(`${root}/services`, params, signal),
  events: (params: MonitoringEventsParams, signal?: AbortSignal) =>
    get<MonitoringEvent[]>(`${root}/events`, params, signal),
  event: (id: string, signal?: AbortSignal) =>
    get<MonitoringEventDetail>(`${root}/events/${encodeURIComponent(id)}`, undefined, signal),
  metrics: (id: string, params: MonitoringMetricsParams, signal?: AbortSignal) =>
    get<MonitoringMetricsData>(`${root}/services/${encodeURIComponent(id)}/metrics`, params, signal),
  acknowledge: (id: string) => {
    const path = `${root}/alerts/${encodeURIComponent(id)}/acknowledge`;
    return withBackoff(path, async () => (await apiService.post<ApiResult<MonitoringAlert>>(path, {})).data);
  },
};
