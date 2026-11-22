"use client";

import { cn } from "cn";
import { Check, ChevronDown, ChevronRight, CircleCheck, Lock, PenLine } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StepView } from "@/lib/run-stream/dataset-run-model";
import { DESIGN_STAGE } from "@/lib/run-stream/experiment-design";
import { SHOW_WRITING_PREVIEW } from "@/lib/run-stream/features";
import { incompleteRapidReview } from "@/lib/run-stream/hypothesis-work";
import type { RunState } from "@/lib/run-stream/run-state";
import { liveStageKey } from "@/lib/run-stream/selectors";

import { DatasetRunTrack } from "../dataset-run/dataset-run-track";
import {
  currentMilestone,
  DATASET_STAGE,
  hypothesisMilestones,
  PIPELINE_STAGES,
  pipelineStageOf,
  selectPipelineStage,
  WRITING_RUN,
} from "./pipeline-stage-selection";
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
  onView(key: string | null): void;
};

/** Opens one pipeline stage at a time. The stage pills stay visible while its steps scroll. */
export function StageTrack({
  state,
  viewKey,
  hypothesisMilestone,
  onView,
  dataset,
  designFocus,
  onDesignStep,
  openHypothesisDemo,
  execution,
  allowWritingPreview = false,
  writingRun,
}: {
  state: RunState;
  viewKey: string | null;
  hypothesisMilestone?: number;
  onView(key: string, milestone?: number): void;
  dataset?: DatasetTrack;
  designFocus?: string | null;
  onDesignStep?(key: string): void;
  openHypothesisDemo?: () => void;
  execution?: {
    focus: string | null;
    labels: Readonly<Record<string, string>>;
    releasePending: boolean;
    inspect(key: string): void;
  };
  allowWritingPreview?: boolean;
  /** The Platform has a Writing stage run for this run. */
  writingRun?: boolean;
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
  const liveStageIndex = stages.findIndex(({ id }) => id === pipelineLive);
  const plan = [
    ...state.plan,
    ...(state.plan.some((step) => step.stage === "write") ? [{ key: "done", stage: "done" as const }] : []),
  ];
  const designOnly = state.completed && live === DESIGN_STAGE;
  const preview =
    allowWritingPreview &&
    SHOW_WRITING_PREVIEW &&
    !plan.some((step) => step.stage === "write") &&
    state.completed &&
    !designOnly;
  const tracked = plan.filter((step) => pipelineStageOf(state.plan, step.key) === expanded);
  const liveIndex = plan.findIndex((step) => step.key === live);
  const isRunning = !state.completed && state.lifecycle !== "failed";
  const writingMine = HOST.runId === state.runId;
  const group = stages.find(({ id }) => id === expanded);
  const stepsLabel = group ? `Steps of the ${group.label} stage` : "Research steps";
  const design = state.stages[DESIGN_STAGE];
  const executionRun = state.stages.execution;
  const milestones = expanded === "hypothesis" ? hypothesisMilestones(state.plan) : [];
  const viewedHypothesis = viewKey ? state.stages[viewKey] : undefined;
  const liveHypothesis = live ? state.stages[live] : undefined;
  const liveMilestone = liveHypothesis
    ? currentMilestone(liveHypothesis.plan, liveHypothesis.currentStepId)
    : milestones.find(({ screens }) => screens.some(({ key }) => key === live))?.number;
  const viewedMilestone = viewedHypothesis
    ? currentMilestone(viewedHypothesis.plan, viewedHypothesis.currentStepId, hypothesisMilestone)
    : undefined;
  const viewedRounds = milestones.find(({ number }) => number === viewedMilestone)?.screens;
  const milestoneItems = milestones.map(({ number, label, screens }) => {
    const liveScreen = screens.find(({ key }) => key === live);
    const screen =
      screens.find(({ key }) => key === viewKey) ??
      liveScreen ??
      screens.findLast(({ key }) => Boolean(state.stages[key])) ??
      screens[0];
    const stage = state.stages[liveScreen?.key ?? screen.key];
    const relatedSteps = stage?.plan.steps.filter((step) => step.pipeline_stage === number) ?? [];
    const complete = relatedSteps.filter((step) => stage?.doneStepIds.includes(step.id)).length;
    const incomplete = stage && (number === 4 || number === 5) && incompleteRapidReview(stage.content);
    const past =
      !blockedForDataset &&
      !incomplete &&
      (stage?.status === "done" || (complete > 0 && complete === relatedSteps.length));
    const active = Boolean(liveScreen) && number === liveMilestone && isRunning && !blockedForDataset;
    return {
      key: String(number),
      screenKey: screen.key,
      number,
      label,
      past,
      live: active,
      waiting: active && Boolean(state.gate),
      fill: past ? 100 : active ? Math.max(4, (complete / (relatedSteps.length || 1)) * 100) : 0,
      available: Boolean(stage) || blockedForDataset || (liveIndex === -1 && number === 1),
      gate: relatedSteps.some((step) => step.gate) || (screen.pipeline?.length === 1 && screen.has_gate),
    };
  });
  const designLabel: Record<string, string> = {
    design_work: "Design",
    design_review: "Review",
    design_accept: "Accept",
  };
  const steps =
    expanded === DATASET_STAGE && dataset ? (
      <DatasetRunTrack
        inline
        steps={dataset.steps}
        ended={dataset.accepted || !isRunning}
        viewKey={dataset.viewKey}
        onView={dataset.onView}
        liveFill={dataset.liveFill}
      />
    ) : expanded === DESIGN_STAGE && design ? (
      <RunTrack
        inline
        label={stepsLabel}
        currentKey={design.currentStepId}
        viewKey={designFocus ?? design.currentStepId}
        onView={(key) => onDesignStep?.(key)}
        minimumWidth={0}
        items={design.plan.steps.map((step) => {
          const past = design.doneStepIds.includes(step.id);
          const active = design.currentStepId === step.id && isRunning;
          return {
            key: step.id,
            label: step.title === "Lock" || step.title === "Record" ? step.title : (designLabel[step.id] ?? step.title),
            fullLabel: step.title,
            past,
            live: active,
            waiting: active && Boolean(state.gate),
            fill: past ? 100 : active ? 35 : 0,
            available: past || active,
            gate: Boolean(step.gate),
          };
        })}
      />
    ) : milestoneItems.length > 0 ? (
      <div className="flex min-w-0 items-center gap-1">
        <div className="min-w-0 flex-1">
          <RunTrack
            inline
            label={stepsLabel}
            currentKey={liveMilestone === undefined || blockedForDataset ? null : String(liveMilestone)}
            viewKey={viewedMilestone === undefined ? null : String(viewedMilestone)}
            onView={(key) => {
              const milestone = milestoneItems.find((item) => item.key === key);
              if (milestone) onView(milestone.screenKey, milestone.number);
            }}
            minimumWidth={0}
            items={milestoneItems}
          />
        </div>
        {viewedRounds && viewedRounds.length > 1 && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="ghost" className="shrink-0" aria-label="Hypothesis round">
                R{viewedRounds.find(({ key }) => key === viewKey)?.round ?? 1}
                <ChevronDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup value={viewKey ?? ""} onValueChange={(key) => onView(key, viewedMilestone)}>
                {viewedRounds.map(({ key, round }) => (
                  <DropdownMenuRadioItem key={key} value={key} disabled={!state.stages[key]}>
                    Round {round ?? 1}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    ) : expanded === "execution" && execution && executionRun ? (
      <RunTrack
        inline
        label={stepsLabel}
        currentKey={executionRun.currentStepId}
        viewKey={execution.focus ?? executionRun.currentStepId ?? executionRun.plan.steps.at(-1)?.id ?? null}
        onView={execution.inspect}
        minimumWidth={0}
        items={executionRun.plan.steps.map((step) => {
          const past = executionRun.doneStepIds.includes(step.id);
          const active = executionRun.currentStepId === step.id && isRunning;
          return {
            key: step.id,
            label: execution.labels[step.id] ?? step.title,
            fullLabel: step.title,
            past,
            live: active,
            waiting: active && (execution.releasePending || state.gate?.stageKey === "execution"),
            fill: past ? 100 : active ? 35 : 0,
            available: past || active,
          };
        })}
      />
    ) : (
      <RunTrack
        inline
        label={stepsLabel}
        currentKey={blockedForDataset ? null : live}
        viewKey={viewKey}
        onView={onView}
        minimumWidth={0}
        items={[
          ...tracked.map((item) => {
            const row = "round" in item ? item : undefined;
            const stage = state.stages[item.key];
            const past = !blockedForDataset && (stage?.status === "done" || (item.key === "done" && state.completed));
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
                  {item.key === "execution"
                    ? stage?.plan.steps.length > 1
                      ? "Rehearsal"
                      : "Prepare"
                    : STAGE_SHORT[item.stage]}
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
    );

  return (
    <nav aria-label="Pipeline stages" className="h-12 min-w-0 shrink-0 overflow-x-clip border-b">
      <ol className="flex h-full min-w-0 items-center gap-1 px-2 sm:gap-2 sm:px-4 md:px-5">
        {stages.map(({ id, label, short }, index) => {
          const items = plan.filter((step) => pipelineStageOf(state.plan, step.key) === id);
          const inView = id === expanded;
          const done =
            id === DATASET_STAGE
              ? Boolean(dataset?.accepted)
              : items.length > 0 &&
                ((state.completed && !designOnly) ||
                  items.every((item) => state.stages[item.key]?.status === "done") ||
                  (index < liveStageIndex && items.some((item) => state.stages[item.key]?.status === "done")));
          const writingStarted = id === "writing" && Boolean(writingRun) && !preview;
          const current = (id === pipelineLive || writingStarted) && isRunning && !done;
          const nextAfterDataset = id === "hypothesis" && blockedForDataset;
          const openDemo = id === "hypothesis" ? openHypothesisDemo : undefined;
          const available =
            Boolean(openDemo) ||
            id === DATASET_STAGE ||
            (id === "writing" && preview) ||
            writingStarted ||
            items.some((item) => state.stages[item.key]) ||
            current;
          const locked = nextAfterDataset || !available;
          const target =
            id === DATASET_STAGE
              ? id
              : id === "writing" && preview
                ? "write"
                : writingStarted
                  ? WRITING_RUN
                  : ((current ? live : null) ??
                    items.find((item) => state.stages[item.key])?.key ??
                    items[0]?.key ??
                    "scope");
          return (
            <motion.li
              key={id}
              layout={reducedMotion ? false : "position"}
              transition={{ layout: { duration: 0.24, ease: RUN_EASE } }}
              className={cn("relative flex min-w-0 items-center", inView ? "flex-1 gap-1 sm:gap-2" : "shrink-0")}
            >
              <button
                type="button"
                aria-label={label}
                aria-expanded={inView}
                aria-current={current ? "step" : undefined}
                disabled={locked && !nextAfterDataset}
                title={nextAfterDataset ? "Starts after the Dataset stage is accepted" : label}
                onClick={openDemo ?? (() => onView(target))}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-1.5 md:gap-1.5 md:px-2",
                  inView ? "border-foreground/20 bg-muted text-foreground" : "border-transparent text-muted-foreground",
                  locked && "border-foreground/20 border-dashed",
                  done && !inView && "border-border bg-muted/40",
                  !locked && !inView && "hover:bg-muted",
                )}
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {done && <Check aria-label="Done" className="size-3 shrink-0 text-emerald-600" />}
                {current && !locked && <PulseDot className="bg-sky-500" />}
                {locked && <Lock aria-label="Locked" className="size-3 shrink-0" />}
                <span className={cn("lg:hidden", !inView && "max-sm:hidden")}>{short}</span>
                <span className="hidden lg:inline">{label}</span>
                {inView && <ChevronRight aria-hidden className="size-3 text-muted-foreground max-sm:hidden" />}
              </button>
              <AnimatePresence initial={false} mode="popLayout">
                {inView && (
                  <motion.div
                    className="min-w-0 flex-1 overflow-hidden"
                    data-stage-steps={id}
                    initial={reducedMotion ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
                    animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
                    exit={reducedMotion ? undefined : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.24, ease: RUN_EASE }}
                  >
                    {steps}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}
