"use client";

import { type ReactNode, useMemo } from "react";

import {
  buildLiveSidePanel,
  type DatasetStepKey,
  type DesignStepKey,
  type ExecutionStepKey,
  type LiveStepKey,
  type LiveViewInput,
  mapDatasetViews,
  mapDesignViews,
  mapExecutionViews,
} from "@/lib/run-stream/live-views";

import {
  CleaningVisual,
  DataChecksVisual,
  DatasetReviewVisual,
  DictionaryVisual,
  DisclosureVisual,
  FitnessVisual,
  ProfileVisual,
  QuestionMapVisual,
  SourcesVisual,
  SplitVisual,
  TableModelVisual,
} from "./dataset-visuals";
import { DesignAcceptVisual, DesignReviewVisual, DesignWorkVisual } from "./design-visuals";
import { CheckVisual, DeliverVisual, PrepareVisual, RunVisual, UnsealVisual, VerifyVisual } from "./execution-visuals";
import { LiveCard } from "./live-card";
import { type LivePanelEntry, usePublishLivePanel } from "./live-panel";
import { LIVE_STEPS } from "./live-steps";
import { useLiveInput } from "./use-live-input";

export const DATASET_STEPS: readonly DatasetStepKey[] = [
  "sources",
  "table_model",
  "profile_quality",
  "dictionary",
  "cleaning_recipe",
  "question_map",
  "split",
  "data_checks",
  "fitness",
  "disclosure",
  "review",
];
export const DESIGN_STEPS: readonly DesignStepKey[] = ["design_work", "design_review", "design_accept"];
export const EXECUTION_STEPS: readonly ExecutionStepKey[] = [
  "execution_verify",
  "execution_prepare",
  "execution_run",
  "execution_unseal",
  "execution_check",
  "execution_deliver",
];

/** The step to show: the one asked for, else the first that is not complete, else the last. */
export function pickStep<K extends LiveStepKey>(
  keys: readonly K[],
  views: Record<K, { progress: number }>,
  asked: string | null | undefined,
): K {
  const named = keys.find((key) => key === asked);
  if (named) return named;
  return keys.find((key) => views[key].progress < 1) ?? keys[keys.length - 1];
}

interface CardProps {
  projectId: string | undefined;
  runId: string | undefined;
  /** The step the engine is on. */
  stepKey: string | null | undefined;
  /** A finished step the person opened again; the card shows it and the side panel stays on `stepKey`. */
  focusKey?: string | null;
  /** The way back to the live step, offered while a finished step is open. */
  onBack?(): void;
  live: boolean;
}

type ViewProps = Omit<CardProps, "projectId" | "runId"> & { input: LiveViewInput };
type PanelView = Parameters<typeof buildLiveSidePanel>[0][LiveStepKey] & { progress: number };

/**
 * One card for a stage: the step to show, the panel entry of the live step, and the "finished step" banner when the
 * shown step is not the live one. `asked` is the live step as the run reports it; the panel is published only when
 * it is one of the stage's mapped steps.
 */
function useStageCard<K extends LiveStepKey>({
  stage,
  title,
  keys,
  views,
  asked,
  focusKey,
  onBack,
}: {
  stage: string;
  title: string;
  keys: readonly K[];
  views: Record<K, PanelView>;
  asked: string | null | undefined;
  focusKey: string | null | undefined;
  onBack: (() => void) | undefined;
}) {
  const liveKey = pickStep(keys, views, asked);
  const key = focusKey ? pickStep(keys, views, focusKey) : liveKey;
  const panel = useMemo(() => buildLiveSidePanel(views, liveKey), [views, liveKey]);
  const entry = useMemo<LivePanelEntry>(
    () => ({
      panel,
      stage: title,
      position: keys.indexOf(liveKey) + 1,
      count: keys.length,
      actor: LIVE_STEPS[liveKey].actor,
    }),
    [panel, title, keys, liveKey],
  );
  usePublishLivePanel(stage, keys.some((item) => item === asked) ? entry : null);
  return { key, reopened: focusKey && focusKey !== asked && onBack ? { onBack } : undefined };
}

export function DatasetLiveView({ input, stepKey, focusKey, onBack, live }: ViewProps) {
  const views = useMemo(() => mapDatasetViews(input), [input]);
  const { key, reopened } = useStageCard({
    stage: "dataset",
    title: "Dataset stage",
    keys: DATASET_STEPS,
    views,
    asked: stepKey,
    focusKey,
    onBack,
  });
  const visuals: Record<DatasetStepKey, ReactNode> = {
    sources: <SourcesVisual step={views.sources} />,
    table_model: <TableModelVisual step={views.table_model} />,
    profile_quality: <ProfileVisual step={views.profile_quality} />,
    dictionary: <DictionaryVisual step={views.dictionary} />,
    cleaning_recipe: <CleaningVisual step={views.cleaning_recipe} />,
    question_map: <QuestionMapVisual step={views.question_map} />,
    split: <SplitVisual step={views.split} />,
    data_checks: <DataChecksVisual step={views.data_checks} />,
    fitness: <FitnessVisual step={views.fitness} />,
    disclosure: <DisclosureVisual step={views.disclosure} />,
    review: <DatasetReviewVisual step={views.review} />,
  };
  return (
    <LiveCard stepKey={key} step={views[key]} views={views} live={live && !reopened} reopened={reopened}>
      {visuals[key]}
    </LiveCard>
  );
}

export function DatasetLiveCard({ projectId, runId, ...rest }: CardProps) {
  const input = useLiveInput({
    projectId,
    runId,
    stageKey: "dataset",
    scoped: [
      "dataset.snapshot/v1",
      "dataset.data_card/v1",
      "dataset.brief/v2",
      "review.findings/v1",
      "revision.response/v1",
    ],
    live: rest.live,
  });
  return <DatasetLiveView input={input} {...rest} />;
}

export function DesignLiveView({ input, stepKey, focusKey, onBack, live }: ViewProps) {
  const views = useMemo(() => mapDesignViews(input), [input]);
  const { key, reopened } = useStageCard({
    stage: "experiment_design",
    title: "Experiment design stage",
    keys: DESIGN_STEPS,
    views,
    asked: stepKey,
    focusKey,
    onBack,
  });
  const visuals: Record<DesignStepKey, ReactNode> = {
    design_work: <DesignWorkVisual step={views.design_work} />,
    design_review: <DesignReviewVisual step={views.design_review} />,
    design_accept: <DesignAcceptVisual step={views.design_accept} />,
  };
  return (
    <LiveCard stepKey={key} step={views[key]} views={views} live={live && !reopened} reopened={reopened}>
      {visuals[key]}
    </LiveCard>
  );
}

export function DesignLiveCard({ projectId, runId, ...rest }: CardProps) {
  const input = useLiveInput({
    projectId,
    runId,
    stageKey: "experiment_design",
    scoped: [
      "experiment_design.plan/v1",
      "experiment_design.design_diagnosis/v1",
      "experiment_design.lock/v1",
      "review.findings/v1",
      "revision.response/v1",
    ],
    upstream: ["dataset.brief/v2"],
    live: rest.live,
  });
  return <DesignLiveView input={input} {...rest} />;
}

export function ExecutionLiveView({ input, stepKey, focusKey, onBack, live }: ViewProps) {
  const views = useMemo(() => mapExecutionViews(input), [input]);
  const { key, reopened } = useStageCard({
    stage: "execution",
    title: "Execution stage",
    keys: EXECUTION_STEPS,
    views,
    asked: stepKey,
    focusKey,
    onBack,
  });
  const visuals: Record<ExecutionStepKey, ReactNode> = {
    execution_verify: <VerifyVisual step={views.execution_verify} live={live && !reopened} />,
    execution_prepare: <PrepareVisual step={views.execution_prepare} />,
    execution_run: <RunVisual step={views.execution_run} />,
    execution_unseal: <UnsealVisual step={views.execution_unseal} />,
    execution_check: <CheckVisual step={views.execution_check} />,
    execution_deliver: <DeliverVisual step={views.execution_deliver} />,
  };
  return (
    <LiveCard stepKey={key} step={views[key]} views={views} live={live && !reopened} reopened={reopened}>
      {visuals[key]}
    </LiveCard>
  );
}

export function ExecutionLiveCard({ projectId, runId, ...rest }: CardProps) {
  const input = useLiveInput({
    projectId,
    runId,
    stageKey: "execution",
    scoped: ["execution.bundle/v1", "evidence.records/v1", "platform.experiment_result/v1"],
    upstream: ["experiment_design.plan/v1"],
    live: rest.live,
  });
  return <ExecutionLiveView input={input} {...rest} />;
}
