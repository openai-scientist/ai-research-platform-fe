import { afterEach, describe, expect, it, vi } from "vitest";

import type { GateAnswer, ReviewMode, RunEvent, RunEventOf, RunEventType } from "./contract";
import { SHOW_DATA_STAGE } from "./features";
import { MockRun } from "./mock/mock-run";
import { applyRunEvent, replayRunEvents } from "./reducer";
import { initialRunState } from "./run-state";
import { finalResults, liveStageKey, nextStop } from "./selectors";

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
    };
    const state = applyRunEvent(initialRunState("run-1"), event("gate.opened", { gate }));
    expect(state.gate).toEqual(gate);
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

describe("mock run", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function play(
    mode: ReviewMode,
    answer: (gate: RunEventOf<"gate.opened">["payload"]["gate"]) => GateAnswer,
    endsAt: "hypotheses" | "paper" = "paper",
  ) {
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
      { withData: SHOW_DATA_STAGE, endsAt },
    );
    run.setSpeed(50);
    run.start();
    for (let i = 0; i < 400 && !events.some((e) => e.type === "run.completed"); i++)
      await vi.advanceTimersByTimeAsync(1000);
    run.dispose();
    return events;
  }

  it("ends once the hypotheses are picked, stopping at the shortlist and at the hypotheses", async () => {
    const events = await play(
      "copilot",
      (gate) => ({ option_id: gate.options.find((o) => o.recommended)?.id ?? gate.options[0].id }),
      "hypotheses",
    );
    const state = replayRunEvents("run", events);
    expect(state.completed).toBe(true);
    expect(state.paperTitle).toBeUndefined();
    const kinds = events
      .filter((e): e is RunEventOf<"gate.opened"> => e.type === "gate.opened")
      .map((e) => e.payload.gate.kind);
    expect(kinds).toEqual(["screen", "hypotheses"]);
    expect(state.plan.map((s) => s.stage)).toEqual(
      (SHOW_DATA_STAGE ? ["data"] : []).concat(["scope", "search", "screen", "read", "synthesize", "hypothesize"]),
    );
    expect(liveStageKey(state)).toBe("r1-hypothesize");
    const h = state.stages["r1-hypothesize"].content;
    if (h.stage !== "hypothesize") throw new Error("wrong stage");
    expect(Object.values(h.drafts).filter((d) => d.selected)).toHaveLength(4);
    expect(events.some((e) => e.type === "plan.locked")).toBe(false);

    // Stage 1 is approved before stage 2; stage 4 keeps the record with a DOI; stage 7 ranks the gaps.
    const scope = state.stages.scope.content;
    if (scope.stage !== "scope") throw new Error("wrong stage");
    expect(scope.approved?.at).toMatch(/Z$/);
    const approvedAt = events.findIndex((e) => e.type === "scope.approved");
    expect(approvedAt).toBeLessThan(events.findIndex((e) => e.type === "problem.subquestion"));
    const search = state.stages.search.content;
    if (search.stage !== "search") throw new Error("wrong stage");
    for (const m of search.merged) expect(m.records.find((r) => r.source === m.kept)?.has_doi).toBe(true);
    const synth = state.stages.synthesize.content;
    if (synth.stage !== "synthesize") throw new Error("wrong stage");
    expect(synth.overview).toBeTruthy();
    expect(synth.ranking.map((r) => r.gap_id)).toEqual(["G1", "G2", "G3"]);
  });

  it("keeps a held-back idea at the hypotheses stop, with its objection on record", async () => {
    const events = await play(
      "copilot",
      (gate) =>
        gate.kind === "hypotheses"
          ? { option_id: "drop", dropped: [], kept: ["C6"], note: "Worth a cheap test." }
          : { option_id: "approve" },
      "hypotheses",
    );
    const opened = events.filter((e): e is RunEventOf<"gate.opened"> => e.type === "gate.opened");
    expect(opened.at(-1)?.payload.gate.keepable).toEqual(["C6"]);
    const state = replayRunEvents("run", events);
    const h = state.stages["r1-hypothesize"].content;
    if (h.stage !== "hypothesize") throw new Error("wrong stage");
    const kept = h.drafts.H7;
    expect(kept.selected).toBe(true);
    expect(kept.hypothesis.from).toEqual(["C6"]);
    expect(kept.hypothesis.contested?.[0]).toMatchObject({ by: "methodologist", severity: "fatal" });
    expect(kept.hypothesis.kept_by_reviewer).toBe("Worth a cheap test.");
    expect(state.decisions.at(-1)?.text).toBe("Approved the set keeping C6 despite the objection.");
  });

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

  it("stops at every copilot gate and honours dropped papers and hypotheses", async () => {
    let firstHypothesesStop = true;
    const events = await play("copilot", (gate) => {
      if (gate.kind === "screen") return { option_id: "drop", dropped: ["walker2006"] };
      if (gate.kind === "hypotheses" && firstHypothesesStop) {
        firstHypothesesStop = false;
        return { option_id: "drop", dropped: ["H4"] };
      }
      return { option_id: gate.options.find((o) => o.recommended)?.id ?? gate.options[0].id };
    });
    const state = replayRunEvents("run", events);
    expect(state.completed).toBe(true);
    const kinds = events
      .filter((e): e is RunEventOf<"gate.opened"> => e.type === "gate.opened")
      .map((e) => e.payload.gate.kind);
    expect(kinds).toEqual(["screen", "hypotheses", "decision", "hypotheses", "decision", "publish"]);
    expect(Object.keys(finalResults(state))).not.toContain("H4");
    expect(nextStop(state)).toBeNull();

    const screen = state.stages.screen.content;
    const read = state.stages.read.content;
    const synthesis = state.stages.synthesize.content;
    if (screen.stage !== "screen" || read.stage !== "read" || synthesis.stage !== "synthesize")
      throw new Error("wrong stage");
    expect(screen.dropped).toEqual(["walker2006"]);
    // A removed paper is never read, so it can't feed a cluster either.
    expect(read.cards.map((c) => c.id)).not.toContain("walker2006");
    expect(synthesis.clusters.flatMap((c) => c.card_ids)).not.toContain("walker2006");
  });

  it("scopes, reads and debates before any plan is locked", async () => {
    const events = await play("full", (gate) => ({
      option_id: gate.options.find((o) => o.recommended)?.id ?? gate.options[0].id,
    }));
    const state = replayRunEvents("run", events);
    const first = events.find((e): e is RunEventOf<"gate.opened"> => e.type === "gate.opened");
    expect(first?.payload.gate.kind).toBe("scope");

    const scope = state.stages.scope.content;
    if (scope.stage !== "scope") throw new Error("wrong stage");
    expect(scope.subQuestions.map((sq) => sq.id)).toEqual(["SQ1", "SQ2", "SQ3", "SQ4"]);
    expect(scope.goal.find((g) => g.field === "scope")?.value).toMatch(/^Sleep, stress, study time and screen time/);
    // Rule 6: every number recalled while scoping is checked against the papers.
    expect(state.estimates.map((e) => e.check?.status)).toEqual(["verified", "unsupported"]);

    const hypothesize = state.stages["r1-hypothesize"].content;
    if (hypothesize.stage !== "hypothesize") throw new Error("wrong stage");
    expect(hypothesize.turns.length).toBeGreaterThan(0);
    expect(Object.values(hypothesize.drafts).every((d) => d.novelty && d.hypothesis.falsify.text)).toBe(true);

    // The plan is locked in the experiment stage, before the first version of any analysis.
    const lockAt = events.findIndex((e) => e.type === "plan.locked");
    const firstNode = events.findIndex((e) => e.type === "node.created");
    expect(lockAt).toBeGreaterThan(-1);
    expect(lockAt).toBeLessThan(firstNode);
    expect(events[lockAt].stage_key).toBe("r1-experiment");
    // Rule 3 is checked by the data stage, which is hidden for now.
    expect(Object.keys(state.rules).map(Number).sort()).toEqual(SHOW_DATA_STAGE ? [1, 2, 3, 4, 5, 6] : [1, 2, 4, 5, 6]);
    expect(Boolean(state.stages.data)).toBe(SHOW_DATA_STAGE);
  });
});
