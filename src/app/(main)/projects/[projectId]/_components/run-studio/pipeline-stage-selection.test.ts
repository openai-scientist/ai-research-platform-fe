import { describe, expect, it } from "vitest";

import {
  currentMilestone,
  hypothesisMilestones,
  pipelineStageOf,
  selectPipelineStage,
  stagePosition,
  summarizeTrackStep,
} from "./pipeline-stage-selection";

const plan = [
  { key: "scope", stage: "scope" },
  { key: "search", stage: "search" },
  { key: "r2-hypothesize", stage: "hypothesize" },
  { key: "report", stage: "report" },
] as const;

const selected = (overrides: Partial<Parameters<typeof selectPipelineStage>[0]> = {}) =>
  selectPipelineStage({
    plan,
    liveKey: "scope",
    viewKey: null,
    datasetFirst: true,
    accepted: false,
    handoff: false,
    ...overrides,
  });

describe("Run Studio pipeline step expansion", () => {
  it("shows all nine Hypothesis milestones across the existing screens", () => {
    const hypothesisPlan = [
      { key: "scope", stage: "scope", title: "Scope", has_gate: true, pipeline: [1, 2] },
      { key: "search", stage: "search", title: "Search", has_gate: false, pipeline: [3, 4] },
      { key: "screen", stage: "screen", title: "Screen", has_gate: true, pipeline: [5] },
      { key: "read", stage: "read", title: "Read", has_gate: false, pipeline: [6] },
      { key: "synthesize", stage: "synthesize", title: "Synthesize", has_gate: false, pipeline: [7] },
      { key: "hypothesize", stage: "hypothesize", title: "Hypothesize", has_gate: false, pipeline: [8] },
      { key: "map", stage: "map", title: "Map", has_gate: true, pipeline: [9] },
    ] satisfies Parameters<typeof hypothesisMilestones>[0];
    const round = { ...hypothesisPlan[5], key: "r2-hypothesize", round: 2 };
    const fullPlan = [
      ...hypothesisPlan,
      round,
      { key: "experiment_design", stage: "experiment", title: "Design", has_gate: true },
      { key: "execution", stage: "interpret", title: "Execution", has_gate: false },
    ] as const;
    const milestones = hypothesisMilestones(fullPlan);
    expect(milestones.map(({ number }) => number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(milestones[1].screens[0].key).toBe("scope");
    expect(milestones[3].screens[0].key).toBe("search");
    expect(milestones[7].screens).toEqual([hypothesisPlan[5], round]);
    expect(stagePosition(fullPlan, "search", true, 3)).toEqual({ index: 2, total: 9 });
    expect(stagePosition(fullPlan, "search", true, 4)).toEqual({ index: 3, total: 9 });
    expect(stagePosition(fullPlan, "synthesize", true)).toEqual({ index: 6, total: 9 });
    expect(stagePosition(fullPlan, "r2-hypothesize", true)).toEqual({ index: 7, total: 9 });
    expect(stagePosition(fullPlan, "experiment_design", true)).toEqual({ index: 2, total: 5 });
  });

  it("uses the actual active step and allows viewing its sibling milestone", () => {
    const search = {
      pipeline: [3, 4],
      steps: [{ id: "collect", pipeline_stage: 4, title: "Collect candidates", actor: "librarian", explain: "" }],
    } as const;
    const screen = { ...search, pipeline: [...search.pipeline], steps: [...search.steps] };
    expect(currentMilestone(screen, "collect")).toBe(4);
    expect(currentMilestone(screen, "collect", 3)).toBe(3);
    expect(currentMilestone(screen, "collect", 9)).toBe(4);
  });

  it("opens Dataset and keeps Hypothesis locked until the card is accepted", () => {
    expect(selected()).toEqual({ live: "dataset", expanded: "dataset", blockedForDataset: true });
    expect(selected({ viewKey: "search" })).toEqual({
      live: "dataset",
      expanded: "hypothesis",
      blockedForDataset: true,
    });
  });

  it("shows the hand-off in Dataset before switching to Hypothesis", () => {
    expect(selected({ accepted: true, handoff: true }).expanded).toBe("dataset");
    expect(selected({ accepted: true, liveKey: null })).toEqual({
      live: "hypothesis",
      expanded: "hypothesis",
      blockedForDataset: false,
    });
  });

  it("re-expands a finished Dataset without changing the live group", () => {
    expect(selected({ accepted: true, liveKey: "search", viewKey: "dataset" })).toEqual({
      live: "hypothesis",
      expanded: "dataset",
      blockedForDataset: false,
    });
  });

  it("groups numbered hypothesis rounds and preserves research-only run selection", () => {
    expect(pipelineStageOf(plan, "r2-hypothesize")).toBe("hypothesis");
    expect(selected({ datasetFirst: false, viewKey: "dataset" }).expanded).toBe("hypothesis");
    expect(selected({ datasetFirst: false, viewKey: "report" }).expanded).toBe("execution");
  });

  it("opens the Writing preview independently of the live research step", () => {
    expect(selected({ accepted: true, viewKey: "write" }).expanded).toBe("writing");
  });
});

describe("Compact step track", () => {
  const steps = [{ key: "release" }, { key: "sources" }, { key: "review" }];

  it("summarizes the step the user is reviewing while another step is live", () => {
    expect(summarizeTrackStep(steps, "release", "review")).toEqual({ item: steps[0], position: 1, count: 3 });
  });

  it("follows the live step when the selection belongs to a different stage", () => {
    expect(summarizeTrackStep(steps, "dataset", "sources")).toEqual({ item: steps[1], position: 2, count: 3 });
  });

  it("uses the first planned step before activity and handles an empty plan", () => {
    expect(summarizeTrackStep(steps, null, null)?.item).toEqual(steps[0]);
    expect(summarizeTrackStep([], null, null)).toBeNull();
  });
});
