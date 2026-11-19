"use client";

import type { StepView } from "@/lib/run-stream/dataset-run-model";

import { RunTrack } from "../run-studio/run-track";

export function DatasetRunTrack({
  steps,
  ended,
  viewKey,
  onView,
  liveFill,
  inline,
}: {
  steps: StepView[];
  ended: boolean;
  viewKey: string | null;
  onView(key: string): void;
  liveFill: number;
  inline?: boolean;
}) {
  const current = steps.find((step) => step.state === "asking" || step.state === "now");
  return (
    <RunTrack
      label="Steps of the Dataset stage"
      inline={inline}
      currentKey={current?.key}
      viewKey={viewKey ?? current?.key ?? (ended ? steps.at(-1)?.key : steps[0]?.key) ?? null}
      onView={onView}
      items={steps.map((step) => {
        const live = !ended && (step.state === "now" || step.state === "asking");
        const past = step.state === "done";
        return {
          key: step.key,
          label: step.short,
          fullLabel: step.title,
          past,
          live,
          waiting: step.state === "asking",
          fill: past ? 100 : live ? liveFill : 0,
          available: true,
          gate: step.gate || step.state === "asking",
        };
      })}
    />
  );
}
