import type { ListParams, TimeRangeParams } from "../types";

export type OverviewSection = "overview" | "operations" | "projects" | "governance";
export interface OverviewParams extends TimeRangeParams {
  section: OverviewSection;
  timezone?: string;
}
export interface OverviewMetric {
  value: number | null;
  unit: string;
  scope: "snapshot" | "window";
  previous_value: number | null;
  change: number | null;
  change_unit: "percent" | "percentage_points" | null;
  desirable_direction: "up" | "down" | null;
  available: boolean;
  reason_code?: string | null;
}
export interface OverviewSeries {
  key: string;
  unit: string;
  interval_seconds: number;
  points: { timestamp: string; value: number | null; target: number | null }[];
  available: boolean;
}
export interface OverviewBreakdown {
  key: string;
  unit: string;
  items: { id: string; label: string; value: number }[];
  total: number | null;
  available: boolean;
}
export interface RecentAdminRun {
  id: string;
  project_id: string;
  project_name: string;
  status: string;
  topic: string | null;
  created_at: string;
  finished_at: string | null;
  duration_ms: number | null;
}
export interface AdminOverviewData {
  section: OverviewSection;
  generated_at: string;
  window: { from: string; to: string; timezone: string };
  comparison_window: { from: string; to: string };
  metrics: Record<string, OverviewMetric>;
  /** Gone since the Platform counts spending in tokens; older servers still send it. */
  money_metrics?: Record<
    string,
    {
      value_usd: string | null;
      previous_value_usd: string | null;
      change_percent: number | null;
      available: boolean;
      attribution?: string | null;
    }
  >;
  series: OverviewSeries[];
  breakdowns: OverviewBreakdown[];
  recent_runs: RecentAdminRun[];
  recent_events: MonitoringEvent[];
  governance_events: Record<string, unknown>[];
  decision_gates: Record<string, unknown>[];
  unavailable_fields: { key: string; reason_code: string }[];
}
export interface MonitoringAlert {
  id: string;
  service_id: string;
  severity: "warning" | "critical";
  code: string;
  message: string;
  started_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  details: Record<string, unknown>;
}
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
export interface MonitoringEvent {
  id: string;
  service_id: string;
  service: string;
  environment: string;
  level: LogLevel;
  event_type?: string;
  source?: string;
  attributes?: Record<string, string | number | boolean>;
  message: string;
  created_at: string;
  duration_ms: number | null;
  status: string | null;
  request_id: string | null;
  trace_id: string | null;
  project_id: string | null;
  run_id: string | null;
  actor_user_id: string | null;
  provider_id: string | null;
  method: string | null;
  route: string | null;
}
export interface MonitoringEventDetail extends MonitoringEvent {
  payload: Record<string, unknown>;
}
export interface MonitoringMetricsPoint {
  timestamp: string;
  request_rate_per_second: number | null;
  error_rate_percent: number | null;
  latency_ms: number | null;
  cpu_percent: number | null;
  memory_percent: number | null;
  queue_depth: number | null;
}
export interface MonitoringService {
  id: string;
  code: string;
  name: string;
  category: string;
  environment: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  observed_at: string | null;
  stale_after_seconds: number;
  metrics_window_seconds: number;
  latency_statistic: "p95";
  metrics: Omit<MonitoringMetricsPoint, "timestamp"> & { available: boolean; reason_code: string | null };
  alerts: MonitoringAlert[];
  recent_events: MonitoringEvent[];
}
export interface MonitoringServicesParams extends ListParams {
  environment?: string;
}
export interface MonitoringEventsParams extends TimeRangeParams {
  event_type?: string;
  source?: string;
  service_id?: string;
  environment?: string;
  level?: LogLevel;
  q?: string;
  request_id?: string;
  trace_id?: string;
  project_id?: string;
  run_id?: string;
}
export interface MonitoringMetricsParams extends TimeRangeParams {
  interval_seconds?: 60 | 300 | 900;
}
export interface MonitoringMetricsData {
  service_id: string;
  generated_at: string;
  window: { from: string; to: string };
  interval_seconds: number;
  latency_statistic: "p95";
  points: MonitoringMetricsPoint[];
  available: boolean;
  reason_code: string | null;
  metric_availability?: Partial<
    Record<
      Exclude<keyof MonitoringMetricsPoint, "timestamp">,
      { available: boolean; reason_code: string | null; source: string | null }
    >
  >;
}
export interface MonitoringPipeline {
  telemetry_connected: "healthy" | "degraded" | "unknown";
  audit_pipeline_status: "healthy" | "degraded" | "unknown";
  observed_at: string | null;
  worker_count: number;
}
