import { describe, expect, it } from "vitest";

import {
  activeAgent,
  applyDatasetEvent,
  charterPending,
  emptyDatasetRun,
  foldDatasetEvents,
  nextStopFor,
  outcomePending,
  RELEASE_WAIT,
  stepViews,
} from "@/lib/run-stream/dataset-run-model";
import type { PipelineEnvelope } from "@/lib/run-stream/pipeline-adapter";

import charterEvents from "../../../../../../../tests/screens/fixtures/dataset-run-charter-events.json";
import real from "../../../../../../../tests/screens/fixtures/dataset-run-real-events.json";
import { splitClause } from "./dataset-run-visuals";

let seq = 0;
const ev = (
  type: string,
  payload: Record<string, unknown> = {},
  extra: Partial<PipelineEnvelope> = {},
): PipelineEnvelope => ({
  seq: ++seq,
  run_id: "run-1",
  ts: "2026-11-14T09:00:00Z",
  type,
  stage_key: "dataset",
  payload,
  ...extra,
});
const item = (key: string, state: string, reason = "") =>
  ev("dataset.item", { key, state, reason, spent_tokens: 0 }, { summary: `${key}: ${state}`, actor: "dataset" });

describe("dataset run model", () => {
  it("folds engine items into steps and finds the open one", () => {
    seq = 0;
    const model = foldDatasetEvents([
      ev("run.step_changed", {}, { step_key: "work" }),
      item("sources", "green"),
      item("table_model", "green"),
      item("profile_quality", "red", "No profile yet"),
      item("harmonisation", "not_applicable"),
    ]);
    const steps = stepViews(model, { local: false, ended: null });
    expect(steps.map((s) => [s.key, s.state])).toEqual([
      ["sources", "done"],
      ["table_model", "done"],
      ["profile_quality", "now"],
      ["dictionary", "todo"],
      ["cleaning_recipe", "todo"],
      ["question_map", "todo"],
      ["split", "todo"],
      ["data_checks", "todo"],
      ["fitness", "todo"],
      ["disclosure", "todo"],
      ["review", "todo"],
    ]);
    expect(steps[2].reason).toBe("No profile yet");
    expect(activeAgent(model, false)).toBe("steward");
  });

  it("marks the reviewer active during the review step and records its round", () => {
    seq = 0;
    const model = foldDatasetEvents([
      item("disclosure", "green"),
      ev("run.step_changed", {}, { step_key: "review" }),
      ev("run.phase_changed", { from: "drafting" }, { phase: "reviewing" }),
      ev("dataset.review", { object: "data_card", round: 1, findings: 3, blocking: 1 }, { summary: "Review round 1" }),
    ]);
    expect(model.review).toEqual({ object: "data_card", round: 1, findings: 3, blocking: 1 });
    expect(activeAgent(model, false)).toBe("reviewer");
    expect(model.feed.at(-1)?.actor).toBe("reviewer");
  });

  it("shows the Local Node release as a stop, and the next stop points to the app", () => {
    seq = 0;
    const model = foldDatasetEvents([ev("dataset.progress", { text: RELEASE_WAIT }, { summary: RELEASE_WAIT })]);
    expect(model.releaseWait).toBe(true);
    const steps = stepViews(model, { local: true, ended: null });
    expect(steps[0]).toMatchObject({ key: "release", state: "asking" });
    expect(activeAgent(model, false)).toBeNull();
    expect(nextStopFor(steps, true)?.detail).toContain("Releases");
    const after = applyDatasetEvent(model, item("sources", "red"));
    expect(after.releaseWait).toBe(false);
    expect(stepViews(after, { local: true, ended: null })[0].state).toBe("done");
  });

  it("tracks progress, pauses, gates, delivery and failure from the lifecycle events", () => {
    seq = 0;
    let model = foldDatasetEvents([
      ev(
        "dataset.progress",
        { task: "reading", state: "running", seconds: 12 },
        { summary: "Reading the file: 12 s so far" },
      ),
      ev("run.phase_changed", { from: "drafting", reason: "runner_offline" }, { phase: "paused" }),
    ]);
    expect(model.progress).toMatchObject({ task: "reading", seconds: 12 });
    expect(model.pauseReason).toBe("runner_offline");
    model = foldDatasetEvents(
      [
        ev("dataset.progress", { task: "reading", state: "done", seconds: 20 }, { summary: "done" }),
        ev("run.phase_changed", { from: "paused" }, { phase: "reviewing" }),
        ev(
          "run.gate_opened",
          { gate_id: "g1", kind: "artifact_review", prompt: "Accept the data card" },
          { phase: "awaiting_researcher" },
        ),
        ev("artifact.delivered", { artifact_id: "a", schema: "dataset.data_card/v1", version: 1, primary: true }),
      ],
      model,
    );
    expect(model.progress).toBeNull();
    expect(model.pauseReason).toBeUndefined();
    expect(model.gate).toEqual({ id: "g1", prompt: "Accept the data card" });
    expect(model.delivered).toEqual(["dataset.data_card/v1"]);
    model = foldDatasetEvents(
      [ev("run.gate_closed", { gate_id: "g1" }), ev("run.published", { artifact_id: "a" })],
      model,
    );
    expect(model.gate).toBeNull();
    expect(model.published).toBe(true);
    model = applyDatasetEvent(model, ev("run.failed", { message: "No capability", code: "LOCAL_NODE_CAPABILITY" }));
    expect(model.failure).toEqual({ message: "No capability", code: "LOCAL_NODE_CAPABILITY" });
  });

  it("ignores replayed events", () => {
    seq = 0;
    const first = ev("dataset.item", { key: "sources", state: "green" }, { summary: "sources: green" });
    const model = applyDatasetEvent(emptyDatasetRun(), first);
    expect(applyDatasetEvent(model, first)).toBe(model);
  });

  it("treats a finished run as done whatever the events said", () => {
    seq = 0;
    const model = foldDatasetEvents([item("sources", "red")]);
    expect(stepViews(model, { local: false, ended: "done" }).every((s) => s.state === "done")).toBe(true);
  });
});

const all = real as unknown as PipelineEnvelope[];
// The first 30 events end at the first question; the whole run goes on to the stage outcome.
const early = all.slice(0, 30);

describe("the real run RUN-FAEC", () => {
  const model = foldDatasetEvents(early);
  const steps = stepViews(model, { local: false, ended: null });

  it("works on the dictionary, which is where the person is asked", () => {
    expect(steps.find((s) => s.state === "asking")?.key).toBe("dictionary");
    expect(steps.filter((s) => s.state === "now")).toEqual([]);
    expect(steps.find((s) => s.key === "cleaning_recipe")?.state).toBe("done");
    expect(activeAgent(model, false)).toBeNull();
  });

  it("flags the steps that wait for the question map and the source attributes", () => {
    expect(steps.filter((s) => s.needsYou).map((s) => s.key)).toEqual(["question_map", "fitness"]);
    expect(steps.map((s) => s.key)).not.toContain("split");
  });

  it("keeps the gate with its options and the stage run to answer", () => {
    expect(model.gate?.id).toBe("ask_user-1");
    expect(model.gate?.options?.map((o) => o.id)).toEqual(["approve", "reject", "other"]);
    expect(model.gate?.recommended).toBe("approve");
    expect(model.stageRunId).toBe("e6923871-5843-400e-9d8c-248824ad6b04");
  });
});

describe("narration of a question", () => {
  it("keeps only the decision line in the feed", () => {
    const model = foldDatasetEvents(early);
    expect(model.message?.text).toBe("Confirm what a model said a key column means.");
    expect(model.message?.text).not.toContain("\n");
  });
});

describe("the run scene and pointer", () => {
  const model = foldDatasetEvents(early);

  it("points at the newest item, and at the long computation while it runs", () => {
    expect(model.cursor).toBe("item:dictionary");
    expect(foldDatasetEvents(all.slice(0, 6)).cursor).toBe("progress");
  });

  it("reads column names out of a reason", () => {
    expect(splitClause("the meaning was written by a model, for the key: participant_id").columns).toEqual([
      "participant_id",
    ]);
    expect(splitClause("no meaning for: a_b, c").columns).toEqual(["a_b", "c"]);
    expect(splitClause("map the question with map_question").columns).toEqual([]);
  });
});

describe("the end of RUN-FAEC: published, waiting for the stage outcome", () => {
  const model = foldDatasetEvents(all);

  it("is not a release wait and has no gate", () => {
    expect(model.releaseWait).toBe(false);
    expect(model.gate).toBeNull();
    expect(model.published).toBe(true);
  });

  it("asks you to accept the stage, with the PI recommending it", () => {
    expect(outcomePending(model)).toBe(true);
    expect(model.outcome).toMatchObject({
      consultationId: "5f55c633-cfe8-4ee7-9160-21a8d5bf9ceb",
      action: "accept",
      confidence: 0.96,
      decided: false,
    });
    const steps = stepViews(model, { local: true, ended: null });
    expect(steps.find((s) => s.key === "release")?.state).toBe("done");
    expect(steps.find((s) => s.key === "review")?.state).toBe("asking");
    expect(steps.filter((s) => (s.state === "now" || s.key !== "review" ? s.state !== "done" : false))).toEqual([]);
    expect(activeAgent(model, false)).toBeNull();
  });

  it("closes the question once a decision is recorded", () => {
    const next = applyDatasetEvent(model, ev("decision.recorded", { kind: "stage_outcome" }, { seq: 999 }));
    expect(outcomePending(next)).toBe(false);
  });
});

describe("the PI's plan (charter) of a real run", () => {
  const events = charterEvents as unknown as PipelineEnvelope[];

  it("waits for you after the PI's recommendation and puts Plan first in the track", () => {
    const model = foldDatasetEvents(events.slice(0, 4));
    expect(charterPending(model)).toBe(true);
    expect(model.charter?.ready).toBe(true);
    const steps = stepViews(model, { local: true, ended: null });
    expect(steps[0]).toMatchObject({ key: "charter", state: "asking" });
    expect(activeAgent(model, false)).toBeNull();
  });

  it("is waiting but not yet ready before the PI answers", () => {
    const model = foldDatasetEvents(events.slice(0, 2));
    expect(charterPending(model)).toBe(true);
    expect(stepViews(model, { local: false, ended: null })[0]).toMatchObject({ key: "charter", state: "now" });
  });

  it("is done once the plan is endorsed", () => {
    const model = foldDatasetEvents(events);
    expect(charterPending(model)).toBe(false);
    expect(stepViews(model, { local: false, ended: null })[0]).toMatchObject({ key: "charter", state: "done" });
  });
});
