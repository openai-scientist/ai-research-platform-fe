import { getApiBaseUrl } from "@/lib/api/config";
import type { MonitoringPipeline } from "@/lib/api/services/admin-monitoring-types";
import { ApiError, type ApiFailure } from "@/types/api";

export type StreamMessage = { event: string; data: string; retry?: number };
let cooldown: { until: number; error: ApiError } | null = null;

// Fetch streaming gives access to Retry-After, which native EventSource hides.
// The transport stays on the app origin and includes the authenticated session cookie.
export async function readMonitoringStream(
  params: { service_id?: string; environment?: string },
  signal: AbortSignal,
  onMessage: (message: StreamMessage) => void,
  onOpen: () => void,
) {
  if (cooldown && cooldown.until > Date.now()) {
    throw new ApiError(
      cooldown.error.status,
      cooldown.error.code,
      cooldown.error.message,
      [],
      null,
      Math.ceil((cooldown.until - Date.now()) / 1000),
    );
  }
  cooldown = null;
  const query = new URLSearchParams({ limit: "20", offset: "0" });
  if (params.service_id) query.set("service_id", params.service_id);
  if (params.environment) query.set("environment", params.environment);
  const response = await fetch(`${getApiBaseUrl()}/admin/log-monitoring/stream?${query}`, {
    credentials: "include",
    headers: { Accept: "text/event-stream" },
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const body: Partial<ApiFailure> | null = await response.json().catch(() => null);
    const header = response.headers.get("Retry-After");
    const seconds = header === null ? NaN : Number(header);
    const date = header === null ? NaN : Date.parse(header);
    const retryAfter = Number.isFinite(seconds)
      ? Math.max(0, seconds)
      : Number.isFinite(date)
        ? Math.max(0, Math.ceil((date - Date.now()) / 1000))
        : null;
    const error = new ApiError(
      response.status,
      body?.error?.code ?? "HTTP_ERROR",
      body?.message ?? "Unable to connect to monitoring updates.",
      [],
      body?.meta?.request_id,
      retryAfter,
    );
    if ((response.status === 429 || response.status === 503) && retryAfter !== null) {
      cooldown = { until: Date.now() + retryAfter * 1000, error };
    }
    throw error;
  }
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("Monitoring updates are temporarily unavailable.");
  }
  onOpen();
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let event = "message";
  let data: string[] = [];
  try {
    while (!signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += chunk.value;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (!line) {
          if (data.length) onMessage({ event, data: data.join("\n") });
          event = "message";
          data = [];
        } else if (line.startsWith("event:")) event = line.slice(6).trimStart();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        else if (/^retry:\s*\d+$/.test(line))
          onMessage({ event: "retry", data: "", retry: Number(line.slice(6).trim()) });
        newline = buffer.indexOf("\n");
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function parsePipeline(data: string): MonitoringPipeline | null {
  try {
    const value: unknown = JSON.parse(data);
    if (typeof value !== "object" || value === null) return null;
    const item = value as Record<string, unknown>;
    const statuses = ["healthy", "degraded", "unknown"];
    if (!statuses.includes(String(item.telemetry_connected)) || !statuses.includes(String(item.audit_pipeline_status)))
      return null;
    if (typeof item.worker_count !== "number" || (item.observed_at !== null && typeof item.observed_at !== "string"))
      return null;
    return {
      telemetry_connected: item.telemetry_connected as MonitoringPipeline["telemetry_connected"],
      audit_pipeline_status: item.audit_pipeline_status as MonitoringPipeline["audit_pipeline_status"],
      observed_at: item.observed_at as string | null,
      worker_count: item.worker_count,
    };
  } catch {
    return null;
  }
}
