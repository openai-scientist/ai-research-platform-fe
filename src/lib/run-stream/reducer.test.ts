import { afterEach, describe, expect, it, vi } from "vitest";

import type { GateAnswer, ReviewMode, RunEvent, RunEventOf, RunEventType } from "./contract";
import { MockRun } from "./mock/mock-run";
import { applyRunEvent, replayRunEvents } from "./reducer";
import { initialRunState } from "./run-state";
import { finalResults, nextStop } from "./selectors";

let seq = 0;
function event<T extends RunEventType>(
  type: T,
  payload: RunEventOf<T>["payload"],
  extra: Partial<RunEvent> = {},
): RunEvent {
  seq += 1;
  return { seq, run_id: "run-1", ts: "2026-10-06T00:00:00Z", type, payload, ...extra } as RunEvent;
}

const dataPlan = {
  key: "data",
  stage: "data" as const,
  title: "Check the data",
  purpose: "",
  cast: ["steward" as const],
  has_gate: false,
  steps: [{ id: "profile", title: "Profile every column", actor: "steward" as const, explain: "" }],
};

describe("applyRunEvent", () => {
  afterEach(() => {
    seq = 0;
  });

  it("ignores events it has already applied", () => {
    const first = event("run.started", {
      mode: "auto",
      question: "Q",
      dataset: { name: "d.csv", version: 1, rows: 10, columns: 2 },
      context_version: 1,
    });
    const state = applyRunEvent(initialRunState("run-1"), first);
    expect(applyRunEvent(state, first)).toBe(state);
  });

  it("streams agent messages and files them in the feed when done", () => {
    const state = replayRunEvents("run-1", [
      event("agent.message", { message_id: "m1", delta: "Reading " }, { actor: "steward" }),
      event("agent.message", { message_id: "m1", delta: "the file.", done: true }, { actor: "steward" }),
    ]);
    expect(state.message).toEqual({ id: "m1", actor: "steward", text: "Reading the file.", done: true });
    expect(state.feed).toHaveLength(1);
    expect(state.feed[0].text).toBe("Reading the file.");
  });

  it("tracks data fixes against the sample rows", () => {
    const state = replayRunEvents("run-1", [
      event("stage.started", { plan: dataPlan }),
      event(
        "data.sample",
        {
          file: "d.csv",
          columns: [{ name: "age", type: "number", unit: "years" }],
          rows: [["212"], ["20"]],
          total_rows: 2,
        },
        { stage_key: "data" },
      ),
      event(
        "data.issue_fixed",
        {
          issue_id: "i1",
          fix: "Removed",
          method: "Drop row",
          replacements: [{ row: 1, column: "age", value: "21" }],
          removed_rows: [0],
        },
        { stage_key: "data" },
      ),
      event(
        "data.version_created",
        { version: 2, rows: 1, removed: 1, fixes: 1, sha256: "abc" },
        { stage_key: "data" },
      ),
    ]);
    const content = state.stages.data.content;
    if (content.stage !== "data") throw new Error("wrong stage");
    expect(content.replaced["1:age"]).toEqual({ from: "20", to: "21" });
    expect(content.removed).toEqual([0]);
    expect(content.rowsNow).toBe(1);
  });

  it("merges consecutive text deltas but keeps numbers as sourced pieces", () => {
    const writePlan = { ...dataPlan, key: "write", stage: "write" as const };
    const state = replayRunEvents("run-1", [
      event("stage.started", { plan: writePlan }),
      event(
        "paper.outline",
        { title: "T", authors: "A", sections: [{ id: "s", title: "S", numbered: false, uses: "" }], sources: [] },
        { stage_key: "write" },
      ),
      event("paper.block", { section_id: "s", block: { id: "b1", kind: "paragraph" } }, { stage_key: "write" }),
      event("paper.delta", { block_id: "b1", piece: { kind: "text", text: "Scores rose " } }, { stage_key: "write" }),
      event("paper.delta", { block_id: "b1", piece: { kind: "text", text: "by " } }, { stage_key: "write" }),
      event(
        "paper.delta",
        { block_id: "b1", piece: { kind: "number", value: "6.1", source: "result:h1" } },
        { stage_key: "write" },
      ),
    ]);
    const content = state.stages.write.content;
    if (content.stage !== "write") throw new Error("wrong stage");
    expect(content.pieces.b1).toEqual([
      { kind: "text", text: "Scores rose by " },
      { kind: "number", value: "6.1", source: "result:h1" },
    ]);
    expect(content.sourcesUsed["result:h1"]).toBe(1);
  });

  it("closes the gate and records the answer as a decision", () => {
    const gate = {
      id: "g1",
      kind: "publish" as const,
      title: "Approve",
      why: "",
      summary: [],
      options: [],
      stop_index: 1,
      stop_total: 1,
    };
    const state = replayRunEvents("run-1", [
      event("gate.opened", { gate }),
      event("gate.resolved", { gate_id: "g1", answer: { option_id: "publish" }, summary: "Approved publishing." }),
    ]);
    expect(state.gate).toBeNull();
    expect(state.decisions.map((d) => d.text)).toEqual(["Approved publishing."]);
  });
});

describe("mock run", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function play(mode: ReviewMode, answer: (gate: RunEventOf<"gate.opened">["payload"]["gate"]) => GateAnswer) {
    vi.useFakeTimers({ toFake: ["setTimeout", "performance"] });
    const events: RunEvent[] = [];
    let run: MockRun | undefined;
    run = new MockRun("RUN-TEST", mode, (e) => {
      events.push(e);
      if (e.type === "gate.opened") {
        const { gate } = e.payload;
        queueMicrotask(() => run?.answerGate(gate.id, answer(gate)));
      }
    });
    run.setSpeed(50);
    run.start();
    for (let i = 0; i < 400 && !events.some((e) => e.type === "run.completed"); i++)
      await vi.advanceTimersByTimeAsync(1000);
    run.dispose();
    return events;
  }

  it("plays a whole run in auto mode without stopping", async () => {
    const events = await play("auto", () => ({ option_id: "unused" }));
    const state = replayRunEvents("run", events);
    expect(state.completed).toBe(true);
    expect(events.some((e) => e.type === "gate.opened")).toBe(false);
    // The PI pivots once, so round 2 tests H5 and H6.
    expect(Object.keys(finalResults(state)).sort()).toEqual(["H1", "H2", "H3", "H5", "H6"]);
    const write = state.stages.write.content;
    if (write.stage !== "write") throw new Error("wrong stage");
    expect(write.typeset).toBe(true);
    expect(write.fixedNumbers["typed-1"]?.value).toBe("6.1");
  });

  it("stops at every copilot gate and honours dropped hypotheses", async () => {
    const events = await play("copilot", (gate) =>
      gate.kind === "hypotheses" && gate.stop_index === 1
        ? { option_id: "drop", dropped: ["H4"] }
        : { option_id: gate.options.find((o) => o.recommended)?.id ?? gate.options[0].id },
    );
    const state = replayRunEvents("run", events);
    expect(state.completed).toBe(true);
    const kinds = events
      .filter((e): e is RunEventOf<"gate.opened"> => e.type === "gate.opened")
      .map((e) => e.payload.gate.kind);
    expect(kinds).toEqual(["hypotheses", "decision", "hypotheses", "decision", "publish"]);
    expect(Object.keys(finalResults(state))).not.toContain("H4");
    expect(nextStop(state)).toBeNull();
  });
});
