"use client";

import { cn } from "cn";

import { VitalWaveform, type WaveformKind } from "@/app/(main)/dashboard/patient-monitoring/_components/vital-waveform";
import type {
  MonitoringMetricsData,
  MonitoringMetricsPoint,
  MonitoringService,
} from "@/lib/api/services/admin-monitoring-types";

import { availabilityReason } from "../../_components/telemetry-ui";

export const signalDefinitions = [
  {
    key: "request_rate_per_second",
    label: "Request rate",
    unit: "req/s",
    kind: "ecg",
    color: "text-lime-500 dark:text-lime-400",
  },
  { key: "latency_ms", label: "P95 latency", unit: "ms", kind: "pleth", color: "text-cyan-500 dark:text-cyan-400" },
  {
    key: "error_rate_percent",
    label: "Error rate",
    unit: "%",
    kind: "respiration",
    color: "text-amber-500 dark:text-amber-400",
  },
  { key: "queue_depth", label: "Queue depth", unit: "jobs", kind: "arterial", color: "text-red-500 dark:text-red-400" },
  { key: "cpu_percent", label: "CPU load", unit: "%", kind: "ecg", color: "text-lime-500 dark:text-lime-400" },
  {
    key: "memory_percent",
    label: "Memory",
    unit: "%",
    kind: "respiration",
    color: "text-amber-500 dark:text-amber-400",
  },
] as const;

const numericDefinitions = [
  signalDefinitions[0],
  { ...signalDefinitions[2], color: "text-cyan-500 dark:text-cyan-400" },
  { ...signalDefinitions[1], color: "text-amber-500 dark:text-amber-400" },
  { ...signalDefinitions[3], label: "Queue", color: "text-foreground" },
  { ...signalDefinitions[4], label: "CPU", color: "text-red-500 dark:text-red-400" },
  { ...signalDefinitions[5], color: "text-foreground" },
] as const;

export function MonitorSignal({
  metrics,
  metricKey,
  kind,
  compact = false,
}: {
  metrics?: MonitoringMetricsData;
  metricKey: Exclude<keyof MonitoringMetricsPoint, "timestamp">;
  kind: WaveformKind;
  compact?: boolean;
}) {
  const data = metrics?.available ? metrics.points.map((point) => ({ value: point[metricKey] })) : [];
  const values = data.flatMap((point) => (point.value === null ? [] : [point.value]));
  const maximum = Math.max(1, ...values);
  return (
    <div className={cn("relative min-w-0 flex-1", compact ? "h-9" : "min-h-16")}>
      <VitalWaveform
        ariaLabel={`Recent ${metricKey.replace(/_/g, " ")} telemetry`}
        data={data}
        domain={[0, maximum * 1.1]}
        kind={kind}
        compact={compact}
        showGrid={!compact}
      />
      {values.length === 0 && (
        <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-[10px] text-muted-foreground">
          {compact
            ? "No telemetry"
            : metrics?.available && metricKey === "latency_ms"
              ? "At least 20 latency samples are required per interval."
              : availabilityReason(metrics?.reason_code)}
        </span>
      )}
    </div>
  );
}

export function MonitoringSignals({
  service,
  metrics,
}: {
  service: MonitoringService;
  metrics?: MonitoringMetricsData;
}) {
  return (
    <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_15.5rem]">
      <div className="min-w-0 border-border xl:border-r">
        {signalDefinitions.map((signal) => (
          <div key={signal.key} className="grid min-h-16 grid-cols-[6.5rem_minmax(0,1fr)] border-b border-border">
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <span className={cn("font-medium text-sm", signal.color)}>{signal.label}</span>
              <span className="text-[10px] text-muted-foreground">{signal.unit}</span>
            </div>
            <MonitorSignal metrics={metrics} metricKey={signal.key} kind={signal.kind} />
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-2 xl:grid-cols-1">
        {numericDefinitions.map((signal) => {
          const value = service.metrics.available ? service.metrics[signal.key] : null;
          return (
            <div
              key={signal.key}
              className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border px-3 py-1"
            >
              <div>
                <dt className={cn("font-medium text-sm", signal.color)}>{signal.label}</dt>
                <p className="text-[10px] text-muted-foreground">
                  {value === null ? "Unavailable" : `${service.metrics_window_seconds / 60}-minute window`}
                </p>
              </div>
              <dd
                className={cn(
                  "flex items-baseline gap-0.5 text-right font-medium text-4xl tabular-nums leading-none",
                  signal.color,
                )}
              >
                {value === null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                <span className="text-xs">{value === null ? "" : signal.unit}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
