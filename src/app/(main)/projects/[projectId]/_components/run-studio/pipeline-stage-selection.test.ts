import { describe, expect, it } from "vitest";

import { pipelineStageOf, selectPipelineStage } from "./pipeline-stage-selection";

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
