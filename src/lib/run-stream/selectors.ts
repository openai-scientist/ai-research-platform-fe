import type { GateKind, PlannedStage, RecordedResult, RunStage } from "./contract";
import type { RunState } from "./run-state";

export const STAGE_GATE: Partial<Record<RunStage, GateKind>> = {
  scope: "scope",
  screen: "screen",
  hypothesize: "hypotheses",
  interpret: "decision",
  report: "report",
  write: "publish",
  // Pipeline runs only: the map has a stop only when its plan says so.
  map: "accept",
};

export const GATE_TITLE: Record<GateKind, string> = {
  charter: "Endorse the PI's plan",
  scope: "Check the scope",
  screen: "Approve the shortlist",
  hypotheses: "Approve the hypotheses",
  decision: "Decide what's next",
  report: "Check the report",
  publish: "Approve the paper",
  accept: "Accept the hypotheses",
};

/** A title inside a sentence: only its first letter is lowered, so names like "PI" stay as they are. */
export function inSentence(title: string) {
  return title.charAt(0).toLowerCase() + title.slice(1);
}

/** Key of the stage the run is on now; `done` once the paper is published. */
export function liveStageKey(state: RunState) {
  if (!state.completed) return state.currentStageKey;
  return state.paperTitle ? "done" : (state.stageOrder[state.stageOrder.length - 1] ?? null);
}

export function plannedIndex(state: RunState, key: string | null) {
  return state.plan.findIndex((s) => s.key === key);
}

export type RunDisplayStatus = "running" | "waiting" | "paused" | "completed" | "stopped" | "failed";

export function displayStatus(state: RunState): RunDisplayStatus {
  if (state.completed) return "completed";
  if (state.lifecycle === "failed") return state.stopped ? "stopped" : "failed";
  if (state.gate) return "waiting";
  if (state.lifecycle === "paused") return "paused";
  return "running";
}

/** The next place the run will stop for the person, if any. */
export function nextStop(state: RunState): { stage: PlannedStage; gate: GateKind; stepsAway: number | null } | null {
  if (state.completed) return null;
  const current = state.currentStageKey ? state.stages[state.currentStageKey] : undefined;
  if (current) {
    const steps = current.plan.steps;
    const at = current.currentStepId
      ? steps.findIndex((s) => s.id === current.currentStepId)
      : current.doneStepIds.length;
    const ahead = steps.slice(Math.max(at, 0)).findIndex((s) => s.gate && !current.doneStepIds.includes(s.id));
    if (ahead >= 0) {
      const gateStep = steps[Math.max(at, 0) + ahead];
      const planned = state.plan.find((s) => s.key === current.plan.key);
      if (gateStep.gate && planned) return { stage: planned, gate: gateStep.gate, stepsAway: ahead };
    }
  }
  const from = plannedIndex(state, state.currentStageKey);
  for (const stage of state.plan.slice(from + 1)) {
    const gate = stage.gate ?? STAGE_GATE[stage.stage];
    if (stage.has_gate && gate) return { stage, gate, stepsAway: null };
  }
  return null;
}

/** The latest result per hypothesis that has a number. */
export function finalResults(state: RunState): Record<string, RecordedResult> {
  const out: Record<string, RecordedResult> = {};
  for (const result of Object.values(state.results).sort((a, b) => a.round - b.round)) {
    if (result.estimate !== null) out[result.hypothesis_id] = result;
  }
  return out;
}

export function stageTitle(stage: PlannedStage) {
  return `${stage.title}${stage.round ? ` · R${stage.round}` : ""}`;
}

/** Label for the Popper pipeline stages a screen covers, such as `Stages 03–04`. */
export function pipelineLabel(stages: number[] | undefined) {
  if (!stages?.length) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return stages.length === 1 ? `Stage ${pad(stages[0])}` : `Stages ${pad(stages[0])}–${pad(stages[stages.length - 1])}`;
}

export const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}`;
