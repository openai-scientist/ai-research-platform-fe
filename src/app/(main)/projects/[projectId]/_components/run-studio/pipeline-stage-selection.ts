import type { PlannedStage, RunStage, StagePlan } from "@/lib/run-stream/contract";

export const DATASET_STAGE = "dataset";
/** The view key of a Writing stage run the Platform has started, which this page does not draw yet. */
export const WRITING_RUN = "writing-run";

export const PIPELINE_STAGES = [
  { id: DATASET_STAGE, label: "Dataset", short: "Dataset" },
  { id: "hypothesis", label: "Hypothesis", short: "Hypothesis" },
  { id: "experiment_design", label: "Experiment design", short: "Design" },
  { id: "execution", label: "Execution", short: "Execute" },
  { id: "writing", label: "Writing", short: "Writing" },
] as const;

type PipelineStage = (typeof PIPELINE_STAGES)[number]["id"];
type Plan = readonly Pick<PlannedStage, "key" | "stage">[];

const STAGE_GROUP: Partial<Record<RunStage | "done", PipelineStage>> = {
  scope: "hypothesis",
  search: "hypothesis",
  screen: "hypothesis",
  read: "hypothesis",
  synthesize: "hypothesis",
  hypothesize: "hypothesis",
  map: "hypothesis",
  experiment: "experiment_design",
  interpret: "execution",
  report: "execution",
  write: "writing",
  done: "writing",
};

export function pipelineStageOf(plan: Plan, key: string | null): PipelineStage | undefined {
  if (key === DATASET_STAGE) return DATASET_STAGE;
  const step = plan.find((item) => item.key === key);
  if (step) return STAGE_GROUP[step.stage];
  if (key === "scope" || key === "write" || key === "done") return STAGE_GROUP[key];
}

const HYPOTHESIS_LABELS: Readonly<Record<number, string>> = {
  1: "Scope",
  2: "Sub-questions",
  3: "Search plan",
  4: "Search",
  5: "Screen",
  6: "Read",
  7: "Synthesize",
  8: "Hypothesize",
  9: "Map",
};

/** Repeated hypothesis rounds share the original workflow milestone. */
export function hypothesisMilestones(plan: readonly PlannedStage[]) {
  const milestones = new Map<number, PlannedStage[]>();
  for (const stage of plan) {
    if (STAGE_GROUP[stage.stage] !== "hypothesis") continue;
    for (const number of stage.pipeline ?? []) {
      if (!HYPOTHESIS_LABELS[number]) continue;
      const screens = milestones.get(number) ?? [];
      screens.push(stage);
      milestones.set(number, screens);
    }
  }
  return [...milestones]
    .sort(([a], [b]) => a - b)
    .map(([number, screens]) => ({
      number,
      label: HYPOTHESIS_LABELS[number],
      screens,
    }));
}

export function currentMilestone(stage: Pick<StagePlan, "pipeline" | "steps">, stepId: string | null, viewed?: number) {
  const numbers = stage.pipeline ?? [];
  if (viewed !== undefined && numbers.includes(viewed)) return viewed;
  const active = stage.steps.find((step) => step.id === stepId)?.pipeline_stage;
  return active !== undefined && numbers.includes(active) ? active : numbers[0];
}

export function stagePosition(plan: readonly PlannedStage[], key: string, datasetFirst: boolean, milestone?: number) {
  if (key === "experiment_design" || key === "execution") {
    const stages = datasetFirst ? PIPELINE_STAGES : PIPELINE_STAGES.slice(1);
    return { index: stages.findIndex(({ id }) => id === key), total: stages.length };
  }
  if (pipelineStageOf(plan, key) === "hypothesis") {
    const milestones = hypothesisMilestones(plan);
    const numbers = plan.find((step) => step.key === key)?.pipeline;
    const number = milestone ?? numbers?.[0];
    if (number !== undefined && numbers?.includes(number) && milestones.length > 0)
      return { index: number - 1, total: milestones.at(-1)!.number };
  }
  return { index: plan.findIndex((step) => step.key === key), total: plan.length };
}

export function selectPipelineStage({
  plan,
  liveKey,
  viewKey,
  datasetFirst,
  accepted,
  handoff,
}: {
  plan: Plan;
  liveKey: string | null;
  viewKey: string | null;
  datasetFirst: boolean;
  accepted: boolean;
  handoff: boolean;
}) {
  const datasetLive = datasetFirst && (!accepted || handoff);
  const live = datasetLive ? DATASET_STAGE : (pipelineStageOf(plan, liveKey) ?? "hypothesis");
  const picked = pipelineStageOf(plan, viewKey);
  return {
    live,
    expanded: !picked || (picked === DATASET_STAGE && !datasetFirst) ? live : picked,
    blockedForDataset: datasetFirst && !accepted,
  };
}

export function summarizeTrackStep<T extends { key: string }>(
  items: readonly T[],
  viewedKey: string | null,
  currentKey?: string | null,
) {
  const viewed = items.findIndex((item) => item.key === viewedKey);
  const current = items.findIndex((item) => item.key === currentKey);
  const index = viewed >= 0 ? viewed : Math.max(0, current);
  const item = items[index];
  return item ? { item, position: index + 1, count: items.length } : null;
}
