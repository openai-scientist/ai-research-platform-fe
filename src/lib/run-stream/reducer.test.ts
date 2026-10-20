import { afterEach, describe, expect, it, vi } from "vitest";

import type { GateAnswer, ReviewMode, RunEvent, RunEventOf, RunEventType } from "./contract";
import { SHOW_DATA_STAGE } from "./features";
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
      topic: "Q",
      domains: [],
      dataset: { name: "d.csv", version: 1, rows: 10, columns: 2 },
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

  it("preserves the nested gate ID and review details when opening a gate", () => {
    const gate = {
      id: "publish-review-42",
      kind: "publish" as const,
      title: "Approve publication",
      why: "Review the final report before publication.",
      summary: ["The report is ready."],
      options: [
        {
          id: "publish",
          label: "Publish report",
          description: "Approve the reviewed report.",
          leads_to: "Publication",
          confirm_label: "Publish",
          recommended: true,
          disabled: false,
        },
      ],
      stop_index: 2,
      stop_total: 3,
      droppable: [],
      keepable: [],
    };
    const state = applyRunEvent(initialRunState("run-1"), event("gate.opened", { gate }));
    expect(state.gate).toEqual(gate);
  });

  it("keeps the ideas a flat hypotheses gate lets the person keep", () => {
    // The backend relays the engine's flat payload; set-aside ideas arrive as `keepable` threads.
    const payload = {
      gate_id: "gate-s08-a1",
      kind: "hypotheses",
      droppable: ["H1", "H2"],
      keepable: ["S2"],
    } as unknown as RunEventOf<"gate.opened">["payload"];
    const state = applyRunEvent(initialRunState("run-1"), event("gate.opened", payload));
    expect(state.gate).toMatchObject({ id: "gate-s08-a1", kind: "hypotheses", keepable: ["S2"] });
  });

  it("preserves the wire gate_id and fills missing review details for a flat gate payload", () => {
    // Live engine events may use the flat payload instead of the nested mock contract.
    const payload = { gate_id: "shortlist-review-17" } as unknown as RunEventOf<"gate.opened">["payload"];
    const state = applyRunEvent(initialRunState("run-1"), event("gate.opened", payload));
    expect(state.gate).toMatchObject({
      id: "shortlist-review-17",
      kind: "screen",
      title: "Review Paper Shortlist",
      stop_index: 1,
      stop_total: 1,
      droppable: [],
    });
    expect(state.gate?.options).toEqual([
      {
        id: "approve",
        label: "Approve literature shortlist",
        description: "Continue reading and synthesizing with the selected papers.",
        leads_to: "Stage 6: Read and extract knowledge cards",
        confirm_label: "Approve and continue",
        recommended: true,
        disabled: false,
      },
    ]);
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

  it("records an answer once when the engine reports it again", () => {
    const gate = {
      id: "g1",
      kind: "screen" as const,
      title: "",
      why: "",
      summary: [],
      options: [],
      stop_index: 1,
      stop_total: 1,
    };
    const state = replayRunEvents("run-1", [
      event("gate.opened", { gate }),
      event("gate.resolved", { gate_id: "g1", answer: { option_id: "approve" }, summary: "Approved the shortlist." }),
      event("gate.resolved", { gate_id: "g1", answer: { option_id: "approve" }, summary: "Approved the shortlist." }),
    ]);
    expect(state.decisions).toHaveLength(1);
    expect(state.feed.filter((f) => f.kind === "decision")).toHaveLength(1);
  });

  it("keeps one copy of each part when a stage sends its parts again", () => {
    const screenPlan = { ...dataPlan, key: "screen", stage: "screen" as const };
    const readPlan = { ...dataPlan, key: "read", stage: "read" as const };
    const paper = {
      id: "p1",
      title: "T",
      venue: "V",
      false_friend: "",
      reason: "off topic",
      decision: "rejected" as const,
    };
    const card = {
      id: "card-p1",
      paper_id: "p1",
      citation: "A, 2020",
      problem: "",
      method: "",
      data: "",
      metrics: "",
      findings: "",
      limitations: "",
    };
    const state = replayRunEvents("run-1", [
      event("stage.started", { plan: screenPlan }),
      event("screen.scored", { points: [{ id: "p1", relevance: 0.2, quality: 0.5 }] }, { stage_key: "screen" }),
      event("screen.scored", { points: [{ id: "p1", relevance: 0.2, quality: 0.5 }] }, { stage_key: "screen" }),
      event("screen.rejected", { paper }, { stage_key: "screen" }),
      event("screen.rejected", { paper }, { stage_key: "screen" }),
      event("stage.started", { plan: readPlan }),
      event("card.extracted", { card }, { stage_key: "read" }),
      event("card.extracted", { card: { ...card, findings: "newer" } }, { stage_key: "read" }),
    ]);
    const screen = state.stages.screen.content;
    const read = state.stages.read.content;
    if (screen.stage !== "screen" || read.stage !== "read") throw new Error("wrong stage");
    expect(screen.points).toHaveLength(1);
    expect(screen.rejected).toHaveLength(1);
    expect(read.cards).toEqual([{ ...card, findings: "newer" }]);
  });

  it("draws the map once, even when its parts are sent again", () => {
    const plan = { ...dataPlan, key: "map", stage: "map" as const };
    const node = { id: "RQ:topic", type: "question" as const, code: "RQ", label: "Q", text: "Q?", stage: 1 };
    const edge = {
      id: "e1",
      from: "RQ:topic",
      to: "RQ:SQ1",
      relation: "decomposes_into" as const,
      status: "stated" as const,
      rationale: "Covers the topic.",
      provenance: "Stage 2",
    };
    const piece = { id: "puzzle" as const, status: "filled" as const, items: [{ text: "Q?" }] };
    const state = replayRunEvents("run-1", [
      event("stage.started", { plan }),
      event("map.node", { node }, { stage_key: "map" }),
      event("map.node", { node: { ...node, label: "Newer" } }, { stage_key: "map" }),
      event("map.edge", { edge }, { stage_key: "map" }),
      event("map.edge", { edge }, { stage_key: "map" }),
      event("canvas.piece", { piece }, { stage_key: "map" }),
      event("canvas.piece", { piece }, { stage_key: "map" }),
    ]);
    const map = state.stages.map.content;
    if (map.stage !== "map") throw new Error("wrong stage");
    expect(map.nodes).toEqual([{ ...node, label: "Newer" }]);
    expect(map.edges).toEqual([edge]);
    expect(map.pieces).toEqual([piece]);
  });

  it("keeps the cards set aside from the clusters, once each, with the reason", () => {
    const plan = { ...dataPlan, key: "synthesize", stage: "synthesize" as const };
    const aside = { id: "A1", card_ids: ["card-p3"], reason: "studies another task" };
    const state = replayRunEvents("run-1", [
      event("stage.started", { plan }),
      event(
        "synthesis.cluster",
        { cluster: { id: "C1", title: "T", claim: "", card_ids: ["card-p1", "card-p2"] } },
        { stage_key: "synthesize" },
      ),
      event("synthesis.set_aside", { aside }, { stage_key: "synthesize" }),
      event("synthesis.set_aside", { aside }, { stage_key: "synthesize" }),
    ]);
    const synthesis = state.stages.synthesize.content;
    if (synthesis.stage !== "synthesize") throw new Error("wrong stage");
    expect(synthesis.setAside).toEqual([aside]);
  });
});

describe("mock stages after the hypotheses", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function play(mode: ReviewMode, answer: (gate: RunEventOf<"gate.opened">["payload"]["gate"]) => GateAnswer) {
    vi.useFakeTimers({ toFake: ["setTimeout", "performance"] });
    const events: RunEvent[] = [];
    let run: MockRun | undefined;
    run = new MockRun(
      "RUN-TEST",
      mode,
      (e) => {
        events.push(e);
        if (e.type === "gate.opened") {
          const { gate } = e.payload;
          queueMicrotask(() => run?.answerGate(gate.id, answer(gate)));
        }
      },
      undefined,
      { withData: SHOW_DATA_STAGE },
    );
    run.setSpeed(50);
    run.start();
    for (let i = 0; i < 400 && !events.some((e) => e.type === "run.completed"); i++)
      await vi.advanceTimersByTimeAsync(1000);
    run.dispose();
    return events;
  }

  it("plays experiment, interpret, report and write in auto mode without stopping", async () => {
    const events = await play("auto", () => ({ option_id: "unused" }));
    const state = replayRunEvents("run", events);
    expect(state.completed).toBe(true);
    expect(events.some((e) => e.type === "gate.opened")).toBe(false);
    // Stages 1 to 9 always come from a real run: the mock plays none of them.
    expect([...new Set(state.plan.map((s) => s.stage))]).toEqual(
      (SHOW_DATA_STAGE ? ["data"] : []).concat(["experiment", "interpret", "report", "write"]),
    );
    // The PI pivots once, so round 2 tests H5 and H6.
    expect(Object.keys(finalResults(state)).sort()).toEqual(["H1", "H2", "H3", "H5", "H6"]);
    const write = state.stages.write.content;
    if (write.stage !== "write") throw new Error("wrong stage");
    expect(write.typeset).toBe(true);
    expect(write.fixedNumbers["typed-1"]?.value).toBe("6.1");
  });

  it("stops at each decision and at publishing in copilot mode", async () => {
    const events = await play("copilot", (gate) => ({
      option_id: gate.options.find((o) => o.recommended)?.id ?? gate.options[0].id,
    }));
    const state = replayRunEvents("run", events);
    expect(state.completed).toBe(true);
    const kinds = events
      .filter((e): e is RunEventOf<"gate.opened"> => e.type === "gate.opened")
      .map((e) => e.payload.gate.kind);
    expect(kinds).toEqual(["decision", "decision", "publish"]);
    expect(nextStop(state)).toBeNull();
  });

  it("locks the plan in the experiment stage, before the first version of any analysis", async () => {
    const events = await play("full", (gate) => ({
      option_id: gate.options.find((o) => o.recommended)?.id ?? gate.options[0].id,
    }));
    const lockAt = events.findIndex((e) => e.type === "plan.locked");
    const firstNode = events.findIndex((e) => e.type === "node.created");
    expect(lockAt).toBeGreaterThan(-1);
    expect(lockAt).toBeLessThan(firstNode);
    expect(events[lockAt].stage_key).toBe("r1-experiment");
    expect(Boolean(replayRunEvents("run", events).stages.data)).toBe(SHOW_DATA_STAGE);
  });
});
