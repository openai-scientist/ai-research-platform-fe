"use client";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function readableKey(value: string) {
  return value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

const reasons: Record<string, string> = {
  CAPTURE_NOT_STARTED: "Telemetry capture has not started.",
  CAPTURE_INCOMPLETE: "Waiting for complete telemetry coverage.",
  SAMPLE_LIMIT_EXCEEDED: "The observation limit was exceeded for this window.",
  SOURCE_NOT_AVAILABLE: "This source is not measured yet.",
  SOURCE_NOT_CONFIGURED: "This source is not configured yet.",
  INSUFFICIENT_SAMPLES: "Not enough observations to calculate this metric.",
  NO_TERMINAL_RUNS: "No completed or failed runs in this time window.",
  OUTCOME_MAPPING_UNDEFINED: "Decision outcomes are not configured for this chart yet.",
};
export function availabilityReason(reason?: string | null) {
  return reason ? (reasons[reason] ?? readableKey(reason)) : "This source is not measured yet.";
}
export function formatMeasurement(value: number | null | undefined, unit = "") {
  if (value == null) return "Unavailable";
  const number = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (unit === "percent") return `${number}%`;
  if (unit === "ms" || unit === "milliseconds") return `${number} ms`;
  if (unit === "requests_per_second" || unit === "req/s") return `${number} req/s`;
  return number;
}
export function TelemetryEmpty({ title = "Unavailable", description }: { title?: string; description?: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description ?? "This source is not measured yet."}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
