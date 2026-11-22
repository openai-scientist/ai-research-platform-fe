"use client";

import type { StepView } from "@/lib/run-stream/dataset-run-model";

import { RunTrack } from "../run-studio/run-track";

const PHASES = [
  {
    key: "source",
    label: "Source",
    title: "Verify the source",
    steps: ["charter", "release", "sources", "table_model"],
  },
  {
    key: "profile",
    label: "Profile",
    title: "Profile the data",
    steps: ["profile_quality"],
  },
  {
    key: "dictionary",
    label: "Fields",
    title: "Define the fields",
    steps: ["dictionary", "cleaning_recipe"],
  },
  {
    key: "question",
    label: "Question",
    title: "Map the question",
    steps: ["question_map"],
  },
  {
    key: "validate",
    label: "Validate",
    title: "Validate the data",
    steps: ["split", "data_checks", "fitness"],
  },
  {
    key: "handoff",
    label: "Handoff",
    title: "Review and deliver",
    steps: ["disclosure", "harmonisation", "gap_search", "review"],
  },
];

export const datasetPhaseFor = (key?: string | null) =>
  key ? PHASES.find((phase) => phase.steps.includes(key)) : undefined;

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
  onView(key: string | null): void;
  liveFill: number;
  inline?: boolean;
}) {
  const current = ended ? undefined : steps.find((step) => step.state === "asking" || step.state === "now");
  const active = datasetPhaseFor(current?.key);
  const visible = datasetPhaseFor(viewKey ?? current?.key ?? (ended ? steps.at(-1)?.key : steps[0]?.key));
  const phases = PHASES.map((phase) => ({
    ...phase,
    checks: steps.filter((step) => phase.steps.includes(step.key)),
  })).filter((phase) => phase.checks.length > 0);

  return (
    <RunTrack
      label="Steps of the Dataset stage"
      minimumWidth={0}
      minimumItemWidth={67}
      inline={inline}
      currentKey={active?.key}
      viewKey={visible?.key ?? null}
      onView={(key) => {
        const phase = phases.find((item) => item.key === key);
        if (!phase) return;
        const target =
          phase.checks.find((step) => step.state !== "done") ??
          (key === "handoff" ? phase.checks.at(-1) : phase.checks[0]);
        onView(key === active?.key ? null : (target?.key ?? null));
      }}
      items={phases.map(({ key, label, title, checks }) => {
        const done = checks.filter((step) => step.state === "done").length;
        const live = key === active?.key;
        const waiting = live && current?.state === "asking";
        return {
          key,
          label,
          fullLabel: title,
          past: done === checks.length,
          live,
          waiting,
          fill: (done * 100 + (live ? liveFill : 0)) / checks.length,
          available: true,
          gate: checks.some((step) => step.gate || step.state === "asking"),
        };
      })}
    />
  );
}
