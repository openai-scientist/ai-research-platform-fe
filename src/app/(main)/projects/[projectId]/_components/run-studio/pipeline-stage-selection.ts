import type { PlannedStage, RunStage } from "@/lib/run-stream/contract";

export const DATASET_STAGE = "dataset";

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
