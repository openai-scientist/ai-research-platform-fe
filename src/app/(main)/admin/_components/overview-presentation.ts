import type { AdminOverviewData, OverviewSection } from "@/lib/api/services/admin-monitoring-types";

import type { AnalyticsKpiItem } from "../../dashboard/analytics/_components/analytics-kpi-strip";
import type { RealtimeBreakdownItem } from "../../dashboard/analytics/_components/realtime-visitors";
import type { TrafficSourceTab } from "../../dashboard/analytics/_components/top-traffic-sources";
import { availabilityReason, formatMeasurement } from "./telemetry-ui";

const kpis: Record<OverviewSection, readonly [string, string][]> = {
  overview: [
    ["active_projects", "Active Projects"],
    ["experiment_runs", "Experiment Runs"],
    ["successful_runs_rate", "Successful Runs"],
    ["token_usage", "Token Usage"],
    ["review_queue", "Review Queue"],
  ],
  projects: [
    ["active_projects", "Active projects"],
    ["experiment_runs", "Experiment runs"],
    ["validated_findings", "Validated findings"],
    ["token_usage", "Tokens consumed"],
    ["estimated_spend", "Estimated spend"],
  ],
  operations: [
    ["request_rate", "Request rate"],
    ["error_rate", "Error rate"],
    ["p95_latency", "P95 latency"],
    ["queue_depth", "Queue depth"],
    ["service_uptime", "Service uptime"],
  ],
  governance: [
    ["decisions_evaluated", "Decisions evaluated"],
    ["evidence_gate_pass_rate", "Evidence gate pass rate"],
    ["audit_coverage", "Audit coverage"],
    ["human_review_queue", "Human review queue"],
    ["decision_overrides", "Decision overrides"],
  ],
};

export function overviewKpis(section: OverviewSection, data: AdminOverviewData | undefined): AnalyticsKpiItem[] {
  return kpis[section].map<AnalyticsKpiItem>(([key, label]) => {
    const metric = data?.metrics[key];
    const money = data?.money_metrics?.[key];
    const available = metric?.available && metric.value !== null;
    const change = metric?.change;
    return {
      label,
      value: available
        ? formatMeasurement(metric.value, metric.unit)
        : money?.available && money.value_usd !== null
          ? `$${money.value_usd}`
          : "—",
      change:
        available && change != null
          ? `${Math.abs(change).toLocaleString("en-US", { maximumFractionDigits: 1 })}${metric.change_unit === "percentage_points" ? "pp" : "%"}`
          : "",
      direction: change != null && change < 0 ? "down" : "up",
      positive: metric?.desirable_direction === "down" ? (change ?? 0) <= 0 : (change ?? 0) >= 0,
      from: available && metric.previous_value !== null ? formatMeasurement(metric.previous_value, metric.unit) : "",
      period: !data
        ? "Loading…"
        : available
          ? metric.scope === "snapshot"
            ? "current snapshot"
            : "previous window"
          : availabilityReason(metric?.reason_code),
    };
  });
}

export function breakdownTabs(
  data: AdminOverviewData | undefined,
  tabs: readonly [string, string][],
): TrafficSourceTab[] {
  return tabs.map(([key, label]) => {
    const breakdown = data?.breakdowns.find((item) => item.key === key);
    return {
      label,
      value: key,
      data: breakdown?.available
        ? breakdown.items.map((item) => ({
            source: item.label,
            visitors: item.value,
            label: formatMeasurement(item.value, breakdown.unit),
          }))
        : [],
      emptyText: breakdown?.available
        ? undefined
        : !data
          ? "Loading…"
          : availabilityReason(data.unavailable_fields.find((item) => item.key === `breakdowns.${key}`)?.reason_code),
    };
  });
}

export function liveBreakdown(data: AdminOverviewData | undefined, key: string): RealtimeBreakdownItem[] {
  const breakdown = data?.breakdowns.find((item) => item.key === key);
  return breakdown?.available
    ? breakdown.items.map((item) => ({
        label: item.label,
        value: item.value,
        markerClassName: "size-2 rounded-full bg-primary",
      }))
    : [];
}
