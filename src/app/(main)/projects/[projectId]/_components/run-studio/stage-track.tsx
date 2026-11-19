"use client";

import { cn } from "cn";
import { Check, CircleCheck, Lock, PenLine } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { StepView } from "@/lib/run-stream/dataset-run-model";
import { SHOW_WRITING_PREVIEW } from "@/lib/run-stream/features";
import type { RunState } from "@/lib/run-stream/run-state";
import { liveStageKey } from "@/lib/run-stream/selectors";

import { DatasetRunTrack } from "../dataset-run/dataset-run-track";
import { DATASET_STAGE, PIPELINE_STAGES, pipelineStageOf, selectPipelineStage } from "./pipeline-stage-selection";
import { PulseDot } from "./run-bits";
import { STAGE_SHORT } from "./run-meta";
import { RUN_EASE, RunTrack } from "./run-track";
import { HOST, useWritingRun, S as writing, writingProgress } from "./writing/engine";

type DatasetTrack = {
  steps: StepView[];
  accepted: boolean;
  handoff: boolean;
  viewKey: string | null;
  liveFill: number;
  onView(key: string): void;
};

/** Opens one pipeline stage at a time. The stage pills stay visible while its steps scroll. */
export function StageTrack({
  state,
  viewKey,
  onView,
  dataset,
}: {
  state: RunState;
  viewKey: string | null;
  onView(key: string): void;
  dataset?: DatasetTrack;
}) {
  "use no memo";
  const reducedMotion = useReducedMotion();
  useWritingRun();
  const live = liveStageKey(state);
  const {
    expanded,
    live: pipelineLive,
    blockedForDataset,
  } = selectPipelineStage({
    plan: state.plan,
    liveKey: live,
    viewKey,
    datasetFirst: Boolean(dataset),
    accepted: Boolean(dataset?.accepted),
    handoff: Boolean(dataset?.handoff),
  });
  const stages = dataset ? PIPELINE_STAGES : PIPELINE_STAGES.slice(1);
  const plan = [
    ...state.plan,
    ...(state.plan.some((step) => step.stage === "write") ? [{ key: "done", stage: "done" as const }] : []),
  ];
  const preview = SHOW_WRITING_PREVIEW && !plan.some((step) => step.stage === "write") && state.completed;
  const tracked = plan.filter((step) => pipelineStageOf(state.plan, step.key) === expanded);
  const liveIndex = plan.findIndex((step) => step.key === live);
  const isRunning = !state.completed && state.lifecycle !== "failed";
  const writingMine = HOST.runId === state.runId;
  const group = stages.find(({ id }) => id === expanded);

  return (
    <nav aria-label="Pipeline stages" className="min-w-0 shrink-0">
      <ol className="flex gap-1 overflow-x-auto border-b px-2 py-2 sm:gap-1.5 sm:px-4 md:px-5">
        {stages.map(({ id, label, short }, index) => {
          const items = plan.filter((step) => pipelineStageOf(state.plan, step.key) === id);
          const inView = id === expanded;
          const done =
            id === DATASET_STAGE
              ? Boolean(dataset?.accepted)
              : items.length > 0 &&
                (state.completed || items.every((item) => state.stages[item.key]?.status === "done"));
          const current = id === pipelineLive && isRunning && !done;
          const nextAfterDataset = id === "hypothesis" && blockedForDataset;
          const available =
            id === DATASET_STAGE ||
            (id === "writing" && preview) ||
            items.some((item) => state.stages[item.key]) ||
            current;
          const locked = nextAfterDataset || !available;
          const target =
            id === DATASET_STAGE
              ? id
              : id === "writing" && preview
                ? "write"
                : ((current ? live : null) ??
                  items.find((item) => state.stages[item.key])?.key ??
                  items[0]?.key ??
                  "scope");
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                aria-label={label}
                aria-expanded={inView}
                aria-current={current ? "step" : undefined}
                disabled={locked && !nextAfterDataset}
                title={nextAfterDataset ? "Starts after the Dataset stage is accepted" : undefined}
                onClick={() => onView(target)}
                className={cn(
                  "inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border px-1 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-1.5 md:gap-1.5 md:px-2",
                  inView ? "border-foreground/20 bg-muted text-foreground" : "border-transparent text-muted-foreground",
                  locked && "border-foreground/20 border-dashed",
                  !locked && !inView && "hover:bg-muted",
                )}
              >
                <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {done && <Check aria-label="Done" className="size-3 shrink-0 text-emerald-600" />}
                {current && !locked && <PulseDot className="bg-sky-500" />}
                {locked && <Lock aria-label="Locked" className="size-3 shrink-0" />}
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={expanded}
          initial={reducedMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.24, ease: RUN_EASE }}
          className="overflow-hidden"
          aria-label={group ? `${group.label} steps` : undefined}
        >
          {expanded === DATASET_STAGE && dataset ? (
            <DatasetRunTrack
              steps={dataset.steps}
              ended={dataset.accepted || !isRunning}
              viewKey={dataset.viewKey}
              onView={dataset.onView}
              liveFill={dataset.liveFill}
            />
          ) : (
            <RunTrack
              label={group ? `Steps of the ${group.label} stage` : "Research steps"}
              currentKey={blockedForDataset ? null : live}
              viewKey={viewKey}
              onView={onView}
              minimumWidth={0}
              items={[
                ...tracked.map((item) => {
                  const row = "round" in item ? item : undefined;
                  const stage = state.stages[item.key];
                  const past =
                    !blockedForDataset && (stage?.status === "done" || (item.key === "done" && state.completed));
                  const active = item.key === live && isRunning && !blockedForDataset;
                  const fill = active
                    ? Math.max(4, ((stage?.doneStepIds.length ?? 0) / (stage?.plan.steps.length || 1)) * 100)
                    : 0;
                  return {
                    key: item.key,
                    label: (
                      <>
                        {row?.round && (
                          <em className="rounded bg-muted px-1 font-mono text-[10px] not-italic">R{row.round}</em>
                        )}
                        {item.key === "done" && <CircleCheck className="size-3" />}
                        {STAGE_SHORT[item.stage]}
                      </>
                    ),
                    past,
                    live: active,
                    waiting: active && Boolean(state.gate),
                    fill: past ? 100 : fill,
                    available:
                      Boolean(stage) ||
                      blockedForDataset ||
                      (item.key === "done" && state.completed) ||
                      (liveIndex === -1 && item.key === "scope"),
                    gate: row?.has_gate,
                  };
                }),
                ...(expanded === "writing" && preview
                  ? [
                      {
                        key: "write",
                        label: (
                          <>
                            <PenLine className="size-3" />
                            Write <span className="text-muted-foreground">Preview</span>
                          </>
                        ),
                        past: writingMine && writing.done,
                        live: writingMine && !writing.done && writing.lifecycle !== "failed",
                        waiting: writingMine && (Boolean(writing.gate) || writing.lifecycle === "blocked"),
                        fill: writingMine ? Math.max(4, writingProgress() * 100) : 0,
                        available: true,
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </nav>
  );
}
