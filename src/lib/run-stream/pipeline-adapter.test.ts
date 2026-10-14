import { describe, expect, it } from "vitest";

import { revisionFindings } from "./api-run";
import type { RunEvent } from "./contract";
import { PipelineAdapter, type PipelineEnvelope } from "./pipeline-adapter";
import { replayRunEvents } from "./reducer";
import { readFileSync } from "node:fs";

// A real pipeline run (RUN-548B): the stored events of the backend, with the shortlist and hypotheses approved
// and all six hypotheses accepted.
const envelopes: PipelineEnvelope[] = readFileSync(new URL("./fixtures/pipeline-run.jsonl", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const info = {
  topic: "When does mixup help or hurt calibration?",
  domains: ["machine learning"],
  mode: "copilot" as const,
};

function convert(list: PipelineEnvelope[], adapter = new PipelineAdapter(info)) {
  return list.flatMap((e) => adapter.convert(e));
}

const until = (type: string, nth = 1) => {
  let seen = 0;
  return envelopes.findIndex((e) => e.type === type && ++seen === nth) + 1;
};

describe("PipelineAdapter", () => {
  it("rebuilds every screen of a finished run", () => {
    const events = convert(envelopes);
    const state = replayRunEvents("run-1", events);
    expect(state.plan.map((s) => s.key)).toEqual([
      "scope",
      "search",
      "screen",
      "read",
      "synthesize",
      "r1-hypothesize",
      "map",
    ]);
    expect(state.stageOrder).toEqual(state.plan.map((s) => s.key));
    expect(Object.values(state.stages).every((s) => s.status === "done")).toBe(true);
    expect(state.completed).toBe(true);
    expect(state.gate).toBeNull();
    expect(state.topic).toBe(info.topic);

    const content = (key: string) => state.stages[key].content;
    const scope = content("scope");
    const screen = content("screen");
    const read = content("read");
    const hypothesize = content("r1-hypothesize");
    const map = content("map");
    if (scope.stage !== "scope" || screen.stage !== "screen" || read.stage !== "read") throw new Error("stage");
    if (hypothesize.stage !== "hypothesize" || map.stage !== "map") throw new Error("stage");
    expect(scope.subQuestions).toHaveLength(5);
    expect(screen.kept).toHaveLength(18);
    expect(screen.rejected).toHaveLength(252);
    expect(read.cards).toHaveLength(18);
    expect(Object.values(hypothesize.drafts).filter((d) => d.selected)).toHaveLength(6);
    expect(hypothesize.findings).toHaveLength(18);
    expect(hypothesize.findings[0]).toMatchObject({ finding_id: "F1-1", locator: "hypothesis:H1/conditions" });
    expect(map.nodes).toHaveLength(47);
    expect(map.edges).toHaveLength(78);
    expect(map.pieces).toHaveLength(9);

    expect(state.stages.screen.summary).toBe("270 candidates • 18 kept • 252 excluded");
    expect(state.stages.read.summary).toBe("18 knowledge cards");
    expect(state.decisions.map((d) => [d.stageKey, d.text])).toEqual([
      ["screen", "Approved the shortlist."],
      ["r1-hypothesize", "Approved the hypotheses."],
      ["map", "Accepted all 6 hypotheses: H1, H2, H3, H4, H5, H6."],
    ]);
  });

  it("keeps every engine event and the order of the run", () => {
    const events = convert(envelopes);
    const content = envelopes.filter((e) => e.type.startsWith("i2h.") && e.type !== "i2h.question.defaulted");
    expect(events.filter((e) => content.some((c) => `i2h.${e.type}` === c.type)).length).toBe(content.length);
    const seqs = events.map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it("walks the steps of each screen in order", () => {
    const events = convert(envelopes);
    const started = (key: string) =>
      events
        .filter(
          (e): e is Extract<RunEvent, { type: "step.started" }> => e.type === "step.started" && e.stage_key === key,
        )
        .map((e) => e.payload.step_id);
    expect(started("scope")).toEqual(["goal", "decompose", "evaluate"]);
    expect(started("screen")).toEqual(["score", "reject", "shortlist", "screen_gate"]);
    expect(started("synthesize")).toEqual(["cluster", "overview", "tension", "gaps", "rank"]);
    expect(started("r1-hypothesize")).toEqual(["debate", "write", "check", "select", "review", "hypotheses_gate"]);
    expect(started("map")).toEqual(["questions", "foundation", "reasoning", "contribution", "canvas", "accept"]);
  });

  it("stops for the shortlist with what was screened, and routes the answer to the stage gate", () => {
    const adapter = new PipelineAdapter(info);
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, until("run.gate_opened")), adapter));
    expect(state.lifecycle).toBe("awaiting_review");
    expect(state.gate).toMatchObject({ id: "gate-s05-a1", kind: "screen", stop_index: 1, stop_total: 3 });
    expect(state.gate?.droppable).toHaveLength(18);
    expect(state.gate?.options.map((o) => o.id)).toEqual(["approve", "drop", "reject"]);
    expect(adapter.route("gate-s05-a1")).toEqual({
      to: "gate",
      stageRunId: "37f9e46f-b205-40ca-942f-6baeb98b43a7",
      kind: "question",
    });
    expect(adapter.route("another")).toBeNull();
  });

  it("stops for the hypotheses after the independent review", () => {
    const adapter = new PipelineAdapter(info);
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, until("run.gate_opened", 2)), adapter));
    expect(state.gate).toMatchObject({ kind: "hypotheses", stop_index: 2 });
    expect(state.gate?.summary[1]).toBe(
      "The reviewer reported 18 findings (2 blocking, 15 major, 1 minor), shown on each hypothesis",
    );
    expect(state.stages["r1-hypothesize"].currentStepId).toBe("hypotheses_gate");
    expect(adapter.route(state.gate?.id ?? "")).toMatchObject({ to: "gate", kind: "artifact_review" });
  });

  it("asks which hypotheses to accept once the stage is published", () => {
    const adapter = new PipelineAdapter(info);
    const end = envelopes.findIndex((e) => e.type === "stage.status_changed" && e.payload.status === "COMPLETED") + 1;
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, end), adapter));
    expect(state.completed).toBe(false);
    expect(state.gate).toMatchObject({ kind: "accept", stop_index: 3, stop_total: 3 });
    expect(state.gate?.selection?.map((s) => s.id)).toEqual(["H1", "H2", "H3", "H4", "H5", "H6"]);
    expect(adapter.route(state.gate?.id ?? "")).toEqual({
      to: "accept",
      stageRunId: "37f9e46f-b205-40ca-942f-6baeb98b43a7",
      hypothesisIds: ["H1", "H2", "H3", "H4", "H5", "H6"],
    });
  });

  it("records the papers dropped at the shortlist", () => {
    const gateAt = until("decision.recorded");
    const list = envelopes.map((e, i) =>
      i === gateAt - 1
        ? { ...e, payload: { ...e.payload, option_id: "drop", params: { dropped: ["p-975bb058a20e"] } } }
        : e,
    );
    const state = replayRunEvents("run-1", convert(list.slice(0, gateAt + 1)));
    const screen = state.stages.screen.content;
    expect(screen.stage === "screen" && screen.dropped).toEqual(["p-975bb058a20e"]);
    expect(state.decisions[0].text).toBe("Approved the shortlist without 1 paper.");
  });

  it("marks hypotheses left out at the accept", () => {
    const acceptAt = envelopes.findIndex((e) => e.type === "decision.recorded" && e.payload.action === "accept");
    const list = envelopes.map((e, i) =>
      i === acceptAt ? { ...e, payload: { action: "accept", selection: { hypothesis_ids: ["H1", "H3"] } } } : e,
    );
    const state = replayRunEvents("run-1", convert(list));
    const hypothesize = state.stages["r1-hypothesize"].content;
    expect(hypothesize.stage === "hypothesize" && hypothesize.dropped).toEqual(["H2", "H4", "H5", "H6"]);
    expect(state.decisions[2].text).toBe("Accepted 2 of 6 hypotheses: H1, H3.");
    expect(state.completed).toBe(true);
  });

  it("ends a failed run with the engine's message", () => {
    const list = [
      ...envelopes.slice(0, 20),
      { ...envelopes[19], seq: 9000, type: "run.failed", payload: { code: "LLM_ERROR", message: "The model failed." } },
    ];
    const state = replayRunEvents("run-1", convert(list));
    expect(state.lifecycle).toBe("failed");
    expect(state.failure).toBe("The model failed.");
  });

  describe("a set sent back for revision", () => {
    const gateAt = until("run.gate_opened", 2);
    const gate = envelopes[gateAt - 1];
    const reviewed = (gate.payload.artifact_ids as string[])[0];
    const finding = envelopes.find((e) => e.type === "i2h.review.finding") as PipelineEnvelope;
    const drafted = envelopes.find((e) => e.type === "i2h.hypothesis.drafted") as PipelineEnvelope;
    let seq = 10_000;
    const next = (type: string, payload: Record<string, unknown>, extra: Partial<PipelineEnvelope> = {}) => ({
      ...gate,
      seq: ++seq,
      type,
      step_key: null,
      phase: null,
      payload,
      ...extra,
    });
    const sent = [
      { ...(finding.payload as object), author: "researcher" },
      {
        finding_id: "comment-H2",
        anchor: { artifact_id: reviewed, locator: "hypothesis:H2" },
        severity: "major",
        kind: "fix",
        category: "other",
        issue: "Name the corruption families.",
        author: "researcher",
      },
    ];
    const revision = [
      ...envelopes.slice(0, gateAt),
      next("decision.recorded", { action: "comment", gate_id: gate.payload.gate_id, findings: sent }),
      next("run.gate_closed", { gate_id: gate.payload.gate_id, action: "comment", actor: "user" }),
      next("run.phase_changed", { from: "awaiting_researcher" }, { phase: "revising" }),
      next("run.step_changed", { from: "hypothesis_gen" }, { step_key: "hypothesis_gen" }),
      { ...drafted, seq: ++seq },
      next("i2h.hypothesis.selected", { hypothesis_id: "H1" }, { step_key: "hypothesis_gen" }),
      next("run.phase_changed", { from: "revising" }, { phase: "reviewing" }),
      { ...finding, seq: ++seq, payload: { ...finding.payload, finding_id: "F2-1" } },
      next("run.gate_opened", { ...gate.payload, gate_id: "gate-s08-a2" }, { phase: "awaiting_researcher" }),
    ];

    it("opens a second round of hypotheses beside the first", () => {
      const state = replayRunEvents("run-1", convert(revision));
      expect(state.plan.map((s) => [s.key, s.round, s.round_kind])).toEqual([
        ["scope", undefined, undefined],
        ["search", undefined, undefined],
        ["screen", undefined, undefined],
        ["read", undefined, undefined],
        ["synthesize", undefined, undefined],
        ["r1-hypothesize", 1, "first"],
        ["r2-hypothesize", 2, "revise"],
        ["map", undefined, undefined],
      ]);
      expect(state.stageOrder.slice(-2)).toEqual(["r1-hypothesize", "r2-hypothesize"]);
      expect(state.stages["r1-hypothesize"].summary).toBe("6 hypotheses sent back for revision with 2 comments");
      expect(state.decisions[1].text).toBe("Sent the hypotheses back for revision with 2 comments.");
      const first = state.stages["r1-hypothesize"].content;
      const second = state.stages["r2-hypothesize"].content;
      if (first.stage !== "hypothesize" || second.stage !== "hypothesize") throw new Error("stage");
      expect(first.findings).toHaveLength(18);
      expect(second.sent.map((f) => f.finding_id)).toEqual(["F1-1", "comment-H2"]);
      expect(second.findings.map((f) => f.finding_id)).toEqual(["F2-1"]);
      expect(Object.keys(second.drafts)).toEqual(["H1"]);
      expect(state.gate).toMatchObject({ id: "gate-s08-a2", title: "Approve the revised hypotheses" });
      expect(state.gate?.review?.findings.map((f) => f.finding_id)).toEqual(["F2-1"]);
      expect(state.gate?.review?.hypotheses.map((h) => h.id)).toEqual(["H1"]);
    });

    it("sends back the findings picked and your own comments", () => {
      const adapter = new PipelineAdapter(info);
      convert(envelopes.slice(0, gateAt), adapter);
      const route = adapter.route(String(gate.payload.gate_id));
      if (route?.to !== "gate") throw new Error("route");
      expect(route.artifactId).toBe(reviewed);
      expect(route.findings).toHaveLength(18);
      const body = revisionFindings(
        {
          option_id: "revise",
          findings: ["F1-1"],
          own: [
            {
              hypothesis: "H2",
              field: "conditions",
              severity: "blocking",
              kind: "fix",
              category: "reproducibility",
              issue: " Name the corruption families. ",
              suggestion: "List them.",
            },
            { hypothesis: "H3", field: "", severity: "minor", kind: "fix", category: "other", issue: " " },
          ],
        },
        route.findings ?? [],
        route.artifactId,
      );
      expect(body.map((f) => [f.finding_id, f.author])).toEqual([
        ["F1-1", "researcher"],
        ["you-H2-1", "researcher"],
      ]);
      expect(body[1]).toMatchObject({
        anchor: { artifact_id: reviewed, locator: "hypothesis:H2/conditions" },
        severity: "blocking",
        category: "reproducibility",
        issue: "Name the corruption families.",
        suggestion: "List them.",
      });
      expect(() => revisionFindings({ option_id: "revise" }, route.findings ?? [], route.artifactId)).toThrow(
        "Pick a finding or write a comment to send back.",
      );
    });
  });
});
