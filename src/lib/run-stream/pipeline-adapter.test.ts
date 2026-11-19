import { describe, expect, it } from "vitest";

import { revisionFindings } from "./api-run";
import type { RunEvent } from "./contract";
import { PipelineAdapter, type PipelineEnvelope } from "./pipeline-adapter";
import { replayRunEvents } from "./reducer";
import { nextStop } from "./selectors";
import { readFileSync } from "node:fs";

// A real run on the logos Platform (RUN-78D5): the stored events of the run, the shortlist and the hypotheses
// approved, the independent review sending the set back twice before it passed, and the stage published and waiting
// to be accepted.
const envelopes: PipelineEnvelope[] = readFileSync(new URL("./fixtures/logos-run.jsonl", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const syntheticDatasetGateEvents: PipelineEnvelope[] = readFileSync(
  new URL("./fixtures/run-265c-gates.jsonl", import.meta.url),
  "utf8",
)
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const event = JSON.parse(line) as PipelineEnvelope & { created_at: string };
    return { ...event, ts: event.created_at };
  });
const agentWorkEvents: PipelineEnvelope[] = readFileSync(
  new URL("./fixtures/hypothesis-agent-work.jsonl", import.meta.url),
  "utf8",
)
  .trim()
  .split("\n")
  .map((line) => ({
    ...envelopes[0],
    stage_key: "hypothesis",
    step_key: "work",
    phase: "drafting",
    ...JSON.parse(line),
  }));

const STAGE_RUN = "e0b47365-5008-4996-b97b-88cfce00fdd2";

const info = {
  topic: "Does fusing BM25 with a dense retriever find more of the evidence for long-document questions?",
  domains: ["information retrieval"],
  mode: "light" as const,
};

function convert(list: PipelineEnvelope[], adapter = new PipelineAdapter(info)) {
  return list.flatMap((e) => adapter.convert(e));
}

/** The envelopes up to and including the `nth` of `type`. */
const until = (type: string, nth = 1) => {
  let seen = 0;
  return envelopes.findIndex((e) => e.type === type && ++seen === nth) + 1;
};

const hypothesize = (state: ReturnType<typeof replayRunEvents>, key: string) => {
  const content = state.stages[key].content;
  if (content.stage !== "hypothesize") throw new Error(key);
  return content;
};

let seq = 100_000;
const appended = (base: PipelineEnvelope, type: string, payload: Record<string, unknown>, extra = {}) => ({
  ...base,
  seq: ++seq,
  type,
  step_key: null,
  phase: null,
  payload,
  ...extra,
});

describe("PipelineAdapter", () => {
  it("follows actual tools within one Hypothesis work step and records checklist checks separately", () => {
    const replay = (count: number) => replayRunEvents("run-1", convert(agentWorkEvents.slice(0, count)));
    const planning = replay(7);
    expect(planning.currentStageKey).toBe("scope");
    expect(planning.stages.scope.currentStepId).toBe("charter");
    expect(planning.message?.text).toBe("Locked the review plan (turn 19)");

    const searching = replay(15);
    expect(searching.currentStageKey).toBe("search");
    expect(searching.stages.search.currentStepId).toBe("collect");
    expect(searching.stages.scope).toMatchObject({ status: "done", content: { goal: [], subQuestions: [] } });
    expect(searching.message?.text).toBe(
      "Searching the literature: Nightly sleep duration academic attainment (turn 21)",
    );
    expect(searching.workNotes.search).toContain("temporarily rate limited");
    expect(searching.workChecks.search.collect.search_log.state).toBe("amber");
    expect(searching.workChecks["r1-hypothesize"].write.hypotheses.reason).toBe("0 hypotheses, propose at least 1");
    expect(searching.feed.map((entry) => entry.text)).toEqual(
      expect.arrayContaining([
        "Use the proposed search and screening rules?",
        "Answered by the researcher: Approve (recommended)",
        "Prepare search",
        "The agent worked through a turn (turn 21)",
      ]),
    );

    const screening = replay(agentWorkEvents.length);
    expect(screening.currentStageKey).toBe("screen");
    expect(screening.stages.screen.currentStepId).toBe("score");
    expect(screening.message?.text).toBe("Screening papers: 0 records (turn 22)");
    expect(screening.workChecks.screen.score.screening.state).toBe("needs_you");
  });

  it("uses an unfamiliar tool as narration without moving the live step", () => {
    const late = {
      ...agentWorkEvents[13],
      seq: 20,
      type: "hypothesis.agent.tool",
      payload: { tool: "check_workspace" },
    };
    const state = replayRunEvents("run-1", convert([...agentWorkEvents, late]));
    expect(state.currentStageKey).toBe("screen");
    expect(state.message?.text).toBe("Check workspace");
    expect(state.feed.at(-1)?.text).toBe("Check workspace");
  });

  it("keeps Dataset review and acceptance in Dataset before Scope opens", () => {
    const adapter = new PipelineAdapter({ ...info, datasetFirst: true });
    const first = envelopes[0];
    const dataset = { ...first, stage_key: "dataset", stage_run_id: "dataset-stage" };
    const pending = convert(
      [
        appended(dataset, "run.step_changed", {}, { step_key: "review" }),
        appended(dataset, "stage.status_changed", { status: "COMPLETED" }),
      ],
      adapter,
    );
    const review = replayRunEvents("run-1", pending);
    expect(review.stageOrder).toEqual([]);
    expect(review.gate).toMatchObject({ kind: "accept", stageKey: "dataset", title: "Accept the data card" });
    expect(adapter.route(review.gate?.id ?? "")).toEqual({ to: "accept", stageRunId: "dataset-stage" });
    const after = convert(
      [
        appended(dataset, "stage.status_changed", { status: "ACCEPTED" }),
        appended(first, "run.step_changed", {}, { step_key: "understand" }),
      ],
      adapter,
    );
    const next = replayRunEvents("run-1", [...pending, ...after]);
    expect(next.gate).toBeNull();
    expect(next.currentStageKey).toBe("scope");
    expect(next.stages.scope.plan.reads).toContain("Accepted data card");
    expect(next.completed).toBe(false);
  });

  it("maps dataset.superseded at startup and during an active run", () => {
    for (const history of [[], envelopes.slice(0, 10)]) {
      const adapter = new PipelineAdapter(info);
      const events = convert(history, adapter);
      const warning = appended(envelopes[0], "dataset.superseded", {
        dataset_superseded: true,
        superseded_by_version: 3,
      });
      const mapped = adapter.convert(warning);
      expect(mapped.filter((e) => e.type === "dataset.superseded")).toMatchObject([
        { payload: { dataset_superseded: true, superseded_by_version: 3 } },
      ]);
      expect(adapter.convert(warning)).toEqual([]);
      const state = replayRunEvents("run-1", [...events, ...mapped]);
      expect(state.dataset_superseded).toBe(true);
      expect(state.superseded_by_version).toBe(3);
      expect(state.lifecycle).toBe("running");
    }
    expect(replayRunEvents("run-1", convert([envelopes[0]])).dataset_superseded).toBeUndefined();
  });

  it("keeps the warning without a valid version and ignores unconfirmed supersession", () => {
    for (const version of [undefined, null, "3", 0, -1, 1.5]) {
      const events = convert([
        appended(envelopes[0], "dataset.superseded", { dataset_superseded: true, superseded_by_version: version }),
      ]);
      const state = replayRunEvents("run-1", events);
      expect(state.dataset_superseded).toBe(true);
      expect(state.superseded_by_version).toBeUndefined();
    }
    for (const flag of [undefined, false, "true"]) {
      const events = convert([appended(envelopes[0], "dataset.superseded", { dataset_superseded: flag })]);
      expect(replayRunEvents("run-1", events).dataset_superseded).toBeUndefined();
    }
  });

  it("rebuilds every screen of the run, one per round of hypotheses", () => {
    const state = replayRunEvents("run-1", convert(envelopes));
    expect(state.plan.map((s) => [s.key, s.round, s.round_kind])).toEqual([
      ["scope", undefined, undefined],
      ["search", undefined, undefined],
      ["screen", undefined, undefined],
      ["read", undefined, undefined],
      ["synthesize", undefined, undefined],
      ["r1-hypothesize", 1, "first"],
      ["r2-hypothesize", 2, "review"],
      ["r3-hypothesize", 3, "review"],
      ["map", undefined, undefined],
    ]);
    expect(state.stageOrder).toEqual(state.plan.map((s) => s.key));
    expect(state.topic).toBe(info.topic);

    const content = (key: string) => state.stages[key].content;
    const scope = content("scope");
    const screen = content("screen");
    const read = content("read");
    const synthesize = content("synthesize");
    const map = content("map");
    if (scope.stage !== "scope" || screen.stage !== "screen" || read.stage !== "read") throw new Error("stage");
    if (synthesize.stage !== "synthesize" || map.stage !== "map") throw new Error("stage");
    expect(scope.goal).toHaveLength(5);
    expect(scope.subQuestions).toHaveLength(5);
    expect(screen.kept).toHaveLength(5);
    expect(screen.rejected).toHaveLength(403);
    expect(screen.points).toHaveLength(366);
    expect(read.cards).toHaveLength(5);
    expect(synthesize.clusters).toHaveLength(2);
    expect(synthesize.gaps).toHaveLength(4);
    expect(map.nodes).toHaveLength(35);
    expect(map.edges).toHaveLength(57);
    expect(map.pieces).toHaveLength(9);

    const last = hypothesize(state, "r3-hypothesize");
    expect(Object.values(last.drafts).filter((d) => d.selected)).toHaveLength(6);
    expect(last.turns).toHaveLength(125);
    expect(hypothesize(state, "r1-hypothesize").findings[0]).toMatchObject({
      finding_id: "F1-1",
      locator: "item:H1/conditions",
      severity: "blocking",
      author: "reviewer",
    });

    expect(state.stages.scope.summary).toBe("Goal set • 5 sub-questions, ranked • topic scored 5.7 of 10");
    expect(state.stages.search.summary).toBe("520 hits • 408 unique papers • 112 duplicates merged");
    expect(state.stages.screen.summary).toBe("408 candidates • 5 kept • 403 excluded");
    expect(state.stages.read.summary).toBe("5 knowledge cards");
    expect(state.stages.synthesize.summary).toBe("2 groups • 1 tension • 4 gaps");
    expect(state.decisions.map((d) => [d.stageKey, d.text])).toEqual([
      ["scope", "Endorsed the PI's plan."],
      ["screen", "Approved the shortlist."],
      ["map", "Approved the hypotheses."],
    ]);
  });

  it("shows every content event once, in the order of the run", () => {
    const events = convert(envelopes);
    const kinds = new Set(events.map((e) => e.type as string));
    const content = envelopes.filter((e) => {
      const kind = e.type.replace(/^hypothesis\./, "");
      return e.type !== kind && kinds.has(kind) && !["review.finding", "rule.checked"].includes(kind);
    });
    for (const kind of new Set(content.map((e) => e.type.replace(/^hypothesis\./, "")))) {
      const sent = content.filter((e) => e.type === `hypothesis.${kind}`).length;
      expect([kind, events.filter((e) => e.type === kind).length]).toEqual([kind, sent]);
    }
    const seqs = events.map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it("walks the steps of each screen in order, and marks the ones it passed", () => {
    const events = convert(envelopes);
    const started = (key: string) =>
      events
        .filter(
          (e): e is Extract<RunEvent, { type: "step.started" }> => e.type === "step.started" && e.stage_key === key,
        )
        .map((e) => e.payload.step_id);
    expect(started("scope")).toEqual(["charter", "goal", "decompose", "evaluate"]);
    expect(started("search")).toEqual(["strategy", "collect"]);
    expect(started("screen")).toEqual(["score", "reject", "shortlist", "screen_gate"]);
    expect(started("synthesize")).toEqual(["cluster", "overview", "tension", "gaps", "rank"]);
    // The first two sets are sent back by the review before the novelty check.
    expect(started("r1-hypothesize")).toEqual(["debate", "write", "select", "review"]);
    expect(started("r3-hypothesize")).toEqual(["debate", "write", "select", "review", "check"]);
    expect(started("map")).toEqual([
      "questions",
      "foundation",
      "reasoning",
      "contribution",
      "canvas",
      "hypotheses_gate",
      "accept",
    ]);
  });

  it("narrates the work as the progress comes in", () => {
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, until("hypothesis.card.extracted", 2))));
    expect(state.message?.text).toMatch(/^Card 2 of 5: /);
    const texts = convert(envelopes)
      .filter((e): e is Extract<RunEvent, { type: "agent.message" }> => e.type === "agent.message")
      .map((e) => (e.payload as { text?: string }).text ?? "");
    expect(texts).toContain("Sending 17 queries to OpenAlex, Semantic Scholar and arXiv.");
    expect(texts.some((t) => /^Batch \d+ of \d+ scored: \d+ of \d+ clear both bars\.$/.test(t))).toBe(true);
    expect(texts).toContain(
      "The reviewer found 6 blocking issues. The perspectives write the set again to answer them.",
    );
  });

  it("narrates the independent review while it runs", () => {
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, until("hypothesis.decision"))));
    expect(state.stages[state.currentStageKey ?? ""].currentStepId).toBe("review");
    expect(state.message?.text).toMatch(/^Checking whether the (\d+ papers|paper) H1 cites back it\.$/);
    const texts = convert(envelopes)
      .filter((e): e is Extract<RunEvent, { type: "agent.message" }> => e.type === "agent.message")
      .map((e) => (e.payload as { text?: string }).text ?? "");
    expect(texts.some((t) => /^Reading the \d+ hypotheses against the papers they cite/.test(t))).toBe(true);
  });

  it("goes on after a stage the Platform tries again, and says why", () => {
    const head = envelopes.slice(0, until("hypothesis.card.extracted", 2));
    const base = head[head.length - 1];
    const failed = appended(base, "stage.status_changed", { status: "FAILED" });
    const healing = appended(base, "stage.healing", {
      attempt: 1,
      max_attempts: 3,
      reason: "The engine lost this run. Trying again by itself (try 1 of 3), keeping the steps that finished.",
    });
    const down = replayRunEvents("run-1", convert([...head, failed]));
    expect(down.lifecycle).toBe("failed");
    expect(down.stopped).toBeUndefined();
    const all = replayRunEvents("run-1", convert([...head, failed, healing]));
    expect(all.lifecycle).toBe("running");
    expect(all.failure).toBeUndefined();
    expect(all.message?.text).toMatch(/^The engine lost this run\. Trying again by itself/);
  });

  it("goes on when a stopped stage is rerun by hand, and gives up healing with a line", () => {
    const head = envelopes.slice(0, until("hypothesis.card.extracted", 2));
    const base = head[head.length - 1];
    const list = [
      ...head,
      appended(base, "stage.status_changed", { status: "STOPPED" }),
      appended(base, "stage.heal_exhausted", { attempts: 3, code: "ENGINE_ERROR" }),
    ];
    const stopped = replayRunEvents("run-1", convert(list));
    expect(stopped.lifecycle).toBe("failed");
    expect(stopped.stopped).toBe(true);
    expect(stopped.message?.text).toBe("Tried again 3 times without success. The stage needs you now.");
    const rerun = replayRunEvents(
      "run-1",
      convert([...list, appended(base, "stage.status_changed", { status: "RUNNING" })]),
    );
    expect(rerun.lifecycle).toBe("running");
    expect(rerun.stopped).toBeUndefined();
  });

  it("counts the papers scored against those left after the ones set aside", () => {
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, until("hypothesis.card.extracted", 1))));
    const screen = Object.values(state.stages).find((s) => s.content.stage === "screen")?.content;
    const planned = screen?.stage === "screen" ? screen.planned : undefined;
    expect(planned?.toScreen).toBeGreaterThan(0);
    expect(planned?.setAside).toBeGreaterThanOrEqual(0);
  });

  it("moves to the map when its stage starts, so the first step and its narration land together", () => {
    const at = envelopes.findIndex((e) => e.type === "hypothesis.progress" && e.payload?.kind === "novelty") + 1;
    const head = envelopes.slice(0, at);
    const base = head[head.length - 1];
    const state = replayRunEvents(
      "run-1",
      convert([...head, appended(base, "hypothesis.progress", { kind: "started", stage: 9 }, { step_key: "verify" })]),
    );
    expect(state.currentStageKey).toBe("map");
    expect(state.stages.map.currentStepId).toBe("questions");
    expect(state.message?.text).toMatch(/^Drawing the argument map/);
  });

  it("names the hypotheses stop, the first of the map's two, as the next stop while the hypotheses are written", () => {
    const at = envelopes.findIndex((e) => e.type === "hypothesis.progress" && e.payload?.kind === "novelty") + 1;
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, at)));
    expect(state.stages[state.currentStageKey ?? ""].content.stage).toBe("hypothesize");
    expect(nextStop(state)).toMatchObject({ gate: "hypotheses", stage: { stage: "map" } });
  });

  it("marks a quiet engine until it does something again", () => {
    const head = envelopes.slice(0, until("hypothesis.card.extracted", 2));
    const base = head[head.length - 1];
    const stalled = appended(base, "stage.stalled", { minutes_since_last_event: 12 });
    expect(replayRunEvents("run-1", convert([...head, stalled])).stalled).toBe(12);
    const next = envelopes.slice(head.length).find((e) => e.type === "hypothesis.card.extracted") as PipelineEnvelope;
    expect(replayRunEvents("run-1", convert([...head, stalled, { ...next, seq: ++seq }])).stalled).toBeUndefined();
  });

  describe("the PI's plan before Scope", () => {
    const asked = envelopes[until("pi.consultation_requested") - 1];
    const consultation = String(asked.payload.consultation_id);

    it("stops for you to endorse it once the PI drafted it, and routes the answer to the consultation", () => {
      const adapter = new PipelineAdapter(info);
      const state = replayRunEvents("run-1", convert(envelopes.slice(0, until("pi.recommendation")), adapter));
      expect(state.currentStageKey).toBe("scope");
      expect(state.stages.scope.currentStepId).toBe("charter");
      expect(state.lifecycle).toBe("awaiting_review");
      expect(state.gate).toMatchObject({ id: consultation, kind: "charter", stop_index: 1, stop_total: 4 });
      expect(state.gate?.options.map((o) => o.id)).toEqual(["endorse", "edit"]);
      expect(state.message?.text).toMatch(/^I recommend a confirmatory comparative benchmark/);
      expect(adapter.route(consultation)).toEqual({ to: "charter", consultationId: consultation });
      expect(state.gate?.advice).toMatchObject({ consultationId: consultation, action: "charter", confidence: 0.86 });
    });

    it("ends a run abandoned while the plan waits, though no event said so", () => {
      const adapter = new PipelineAdapter(info);
      const events = convert(envelopes.slice(0, until("pi.consultation_requested")), adapter);
      const ended = adapter.end("failed", "Abandoned by a project manager");
      const state = replayRunEvents("run-1", [...events, ...ended]);
      expect(state.lifecycle).toBe("failed");
      expect(state.failure).toBe("Abandoned by a project manager");
      expect(state.gate).toBeNull();
      expect(adapter.end("failed", "Again")).toEqual([]);
      expect(new PipelineAdapter(info).end("completed")).toEqual([]);
    });

    it("goes on without stopping when the PI settles it (Auto)", () => {
      const list = [
        { ...asked, payload: { ...asked.payload, authority: "pi" } },
        ...envelopes.slice(until("pi.consultation_requested"), until("pi.charter_settled")),
      ];
      const state = replayRunEvents("run-1", convert(list));
      expect(state.gate).toBeNull();
      expect(state.decisions).toEqual([]);
      expect(state.stages.scope.doneStepIds).toContain("charter");
      expect(state.feed.some((f) => f.text === "The PI endorsed its own plan.")).toBe(true);
    });

    it("lets you ask again when the PI fails, or write the plan yourself", () => {
      const failed = appended(asked, "attention.required", {
        consultation_id: consultation,
        kind: "charter",
        reason: "pi_failed",
        code: "PI_TIMEOUT",
      });
      const adapter = new PipelineAdapter(info);
      let state = replayRunEvents("run-1", convert([asked, failed], adapter));
      expect(state.gate).toMatchObject({ kind: "charter", title: "The PI could not draft the plan" });
      expect(state.gate?.options.map((o) => o.id)).toEqual(["retry", "write"]);
      const again = appended(asked, "pi.consultation_requested", {
        consultation_id: "c-2",
        kind: "charter",
        authority: "researcher",
      });
      state = replayRunEvents("run-1", convert([asked, failed, again]));
      expect(state.gate).toBeNull();
      expect(state.decisions[0].text).toBe("Asked the PI to draft the plan again.");
    });
  });

  it("says what a stage is doing as soon as it starts, before its model answers", () => {
    const first = envelopes.find((e) => e.step_key === "understand") as PipelineEnvelope;
    const list = [
      ...envelopes.slice(0, envelopes.indexOf(first)),
      appended(first, "hypothesis.progress", { kind: "started", stage: 2, try: 0 }, { step_key: "understand" }),
    ];
    const state = replayRunEvents("run-1", convert(list));
    expect(state.stages.scope.currentStepId).toBe("decompose");
    expect(state.message?.text).toBe("Splitting the goal into sub-questions and noting the risks of each.");
  });

  it("stops for the shortlist with what was screened, and routes the answer to the stage gate", () => {
    const adapter = new PipelineAdapter(info);
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, until("run.gate_opened")), adapter));
    expect(state.lifecycle).toBe("awaiting_review");
    expect(state.gate).toMatchObject({ id: "shortlist-1", kind: "screen", stop_index: 2, stop_total: 4 });
    expect(state.gate?.droppable).toHaveLength(5);
    expect(state.gate?.options.map((o) => o.id)).toEqual(["approve", "drop", "reject"]);
    expect(adapter.route("shortlist-1")).toEqual({ to: "gate", stageRunId: STAGE_RUN, kind: "question" });
    expect(adapter.route("another")).toBeNull();
  });

  it("renders an engine question gate with its own choices instead of the literature shortlist", () => {
    const gate = appended(
      envelopes[0],
      "run.gate_opened",
      {
        gate_id: "ask_user-2",
        kind: "question",
        step_key: "work",
        header: "Key column",
        prompt:
          "Do you agree that student_id uniquely identifies each student? ...\n\nWhy you are asked: this decision is yours, so the run does not take it for you.",
        options: [
          { option_id: "approve", label: "Approve (recommended)", description: "Confirm this meaning and keep it." },
          {
            option_id: "reject",
            label: "Reject",
            description: "Save or run nothing; say what should change so the agent can revise its suggestion.",
          },
          {
            option_id: "other",
            label: "None of these: type the answer",
            description: "Write your own answer in your own words.",
          },
        ],
        default_option_id: "approve",
        artifact_ids: [],
        selection: null,
        opened_at: "2026-11-18T17:20:37.763927Z",
      },
      { stage_key: "dataset", stage_run_id: "dataset-stage", step_key: "work", phase: "awaiting_researcher" },
    );
    const answer = appended(gate, "decision.recorded", {
      action: "answer",
      gate_id: "ask_user-2",
      option_id: "other",
      text: "Use student_id as the key.",
    });
    const closed = appended(gate, "run.gate_closed", { gate_id: "ask_user-2", action: "answer" });
    const adapter = new PipelineAdapter(info);
    const openedEvents = convert([gate], adapter);
    const state = replayRunEvents("run-1", openedEvents);
    const events = [...openedEvents, ...convert([answer, closed], adapter)];

    expect(state.gate).toMatchObject({
      id: "ask_user-2",
      kind: "decision",
      title: "Key column",
      why: "Do you agree that student_id uniquely identifies each student? ...\n\nWhy you are asked: this decision is yours, so the run does not take it for you.",
      options: [
        { id: "approve", label: "Approve (recommended)", recommended: true },
        { id: "reject", label: "Reject", recommended: false },
        { id: "other", label: "None of these: type the answer", recommended: false },
      ],
    });
    expect(JSON.stringify(state.gate)).not.toContain("Approve the shortlist");
    expect(events.filter((event) => event.type === "step.started").map((event) => event.payload.step_id)).not.toContain(
      "screen_gate",
    );
    expect(events.find((event) => event.type === "gate.resolved")).toMatchObject({
      payload: { answer: { option_id: "other", note: "Use student_id as the key." } },
    });
  });

  it("resolves a dataset question before showing the next question gate", () => {
    const gateA = appended(
      envelopes[0],
      "run.gate_opened",
      {
        gate_id: "ask_user-2",
        kind: "question",
        step_key: "work",
        header: "Key column",
        prompt: "Decision: Confirm the key column.",
        options: [{ option_id: "approve", label: "Approve" }],
        default_option_id: "approve",
        selection: null,
      },
      { stage_key: "dataset", stage_run_id: "dataset-stage", step_key: "work", phase: "awaiting_researcher" },
    );
    const answer = appended(
      gateA,
      "decision.recorded",
      { action: "answer_gate", gate_id: "ask_user-2", option_id: "approve" },
      { stage_key: "dataset", stage_run_id: "dataset-stage", step_key: "work", phase: "awaiting_researcher" },
    );
    const closed = appended(
      answer,
      "run.gate_closed",
      { gate_id: "ask_user-2", action: "answer", actor: "user" },
      { stage_key: "dataset", stage_run_id: "dataset-stage", step_key: "work", phase: "awaiting_researcher" },
    );
    const askUser = appended(
      closed,
      "dataset.ask_user",
      { question: "Decision: Choose the outcome column.", options: [{ id: "approve" }] },
      { stage_key: "dataset", stage_run_id: "dataset-stage", step_key: "work", phase: "drafting" },
    );
    const phaseChanged = appended(
      askUser,
      "run.phase_changed",
      { from: "drafting" },
      { stage_key: "dataset", stage_run_id: "dataset-stage", step_key: "work", phase: "awaiting_researcher" },
    );
    const gateB = appended(
      phaseChanged,
      "run.gate_opened",
      {
        gate_id: "ask_user-3",
        kind: "question",
        step_key: "work",
        header: "Outcome",
        prompt: "Decision: Choose the outcome column.",
        options: [{ option_id: "approve", label: "Approve" }],
        default_option_id: "approve",
        selection: null,
      },
      { stage_key: "dataset", stage_run_id: "dataset-stage", step_key: "work", phase: "awaiting_researcher" },
    );

    const events = convert([gateA, answer, closed, askUser, phaseChanged, gateB]);
    const state = replayRunEvents("run-1", events);

    expect(events.find((event) => event.type === "gate.resolved")).toMatchObject({
      payload: { gate_id: "ask_user-2", answer: { option_id: "approve" } },
    });
    expect(state.decisions).toContainEqual(expect.objectContaining({ gateId: "ask_user-2", option: "approve" }));
    expect(state.gate).toMatchObject({ id: "ask_user-3", title: "Outcome" });
  });

  it("replays a dataset question close before opening the next question gate", () => {
    expect(syntheticDatasetGateEvents.map((envelope) => envelope.seq)).toEqual(
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
    const adapter = new PipelineAdapter(info);
    const events = convert(syntheticDatasetGateEvents, adapter);
    const resolved = events.find(
      (event) => event.type === "gate.resolved" && event.payload.gate_id === "question-record-key",
    );
    const state = replayRunEvents("run-1", events);
    const resolvedIndex = events.findIndex(
      (event) => event.type === "gate.resolved" && event.payload.gate_id === "question-record-key",
    );
    const openedIndex = events.findIndex(
      (event) => event.type === "gate.opened" && event.payload.gate.id === "question-result-column",
    );

    expect(resolved).toMatchObject({ payload: { answer: { option_id: "approve" } } });
    expect(resolvedIndex).toBeGreaterThanOrEqual(0);
    expect(openedIndex).toBeGreaterThan(resolvedIndex);
    expect(state.decisions).toContainEqual(
      expect.objectContaining({ gateId: "question-record-key", option: "approve" }),
    );
    expect(state.gate).toMatchObject({ id: "question-result-column", title: "Result column" });
  });

  it("offers a dataset-stage accept gate without opening the map", () => {
    const adapter = new PipelineAdapter(info);
    const base = syntheticDatasetGateEvents.at(-1);
    if (!base) throw new Error("The synthetic dataset gate fixture is empty.");
    const answered = appended(
      base,
      "decision.recorded",
      { action: "answer_gate", gate_id: "question-result-column", option_id: "approve" },
      { stage_key: "dataset", stage_run_id: "stage-synthetic-dataset" },
    );
    const closed = appended(
      answered,
      "run.gate_closed",
      { gate_id: "question-result-column", action: "answer", actor: "user" },
      { stage_key: "dataset", stage_run_id: "stage-synthetic-dataset" },
    );
    const completed = appended(
      closed,
      "stage.status_changed",
      { status: "COMPLETED" },
      { stage_key: "dataset", stage_run_id: "stage-synthetic-dataset", phase: "published" },
    );
    const recommendation = appended(
      completed,
      "pi.decision",
      { consultation_id: "consultation-synthetic-1", kind: "stage_outcome", action: "accept", confidence: 0.9 },
      {
        stage_key: "dataset",
        stage_run_id: "stage-synthetic-dataset",
        summary: "I recommend accepting the data card.",
      },
    );

    const events = convert([...syntheticDatasetGateEvents, answered, closed, completed, recommendation], adapter);
    const state = replayRunEvents("run-1", events);
    const gate = state.gate;

    expect(gate).toMatchObject({
      kind: "accept",
      title: "Accept the data card",
      options: [{ id: "accept", label: "Accept the data card", confirm_label: "Accept", recommended: true }],
      advice: { action: "accept", text: "I recommend accepting the data card." },
    });
    expect(gate?.selection).toBeUndefined();
    expect(gate?.options[0].disabled).toBe(false);
    expect(events.filter((event) => event.type === "stage.started")).toHaveLength(0);
    expect(events.filter((event) => event.type === "step.started").map((event) => event.payload.step_id)).not.toContain(
      "accept",
    );
    if (!gate) throw new Error("Expected the dataset acceptance gate to be open.");
    expect(adapter.route(gate.id)).toEqual({ to: "accept", stageRunId: "stage-synthetic-dataset" });

    const acceptedDecision = appended(
      recommendation,
      "decision.recorded",
      { action: "accept", selection: {} },
      { stage_key: "dataset", stage_run_id: "stage-synthetic-dataset" },
    );
    const accepted = appended(
      acceptedDecision,
      "stage.status_changed",
      { status: "ACCEPTED" },
      { stage_key: "dataset", stage_run_id: "stage-synthetic-dataset" },
    );
    const acceptedEvents = [...adapter.convert(acceptedDecision), ...adapter.convert(accepted)];
    expect(acceptedEvents.find((event) => event.type === "gate.resolved")).toMatchObject({
      payload: { summary: "Accepted the data card." },
    });
    expect(acceptedEvents.some((event) => event.type === "run.completed")).toBe(false);
  });

  it("stops for the hypotheses on the map, after the review passed", () => {
    const adapter = new PipelineAdapter(info);
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, until("run.gate_opened", 2)), adapter));
    expect(state.currentStageKey).toBe("map");
    expect(state.stages.map.currentStepId).toBe("hypotheses_gate");
    expect(state.gate).toMatchObject({ id: "hypotheses-2", kind: "hypotheses", stop_index: 3 });
    expect(state.gate?.title).toBe("Approve the revised hypotheses");
    expect(state.gate?.why).toMatch(/^The independent reviewer sent the set back 2 times before you saw it/);
    expect(state.gate?.review?.findings.map((f) => f.finding_id).slice(0, 2)).toEqual(["F3-1", "F3-2"]);
    expect(state.gate?.review?.hypotheses.map((h) => h.id)).toEqual(["H1", "H2", "H3", "H4", "H5", "H6"]);
    const route = adapter.route("hypotheses-2");
    if (route?.to !== "gate") throw new Error("route");
    expect(route.kind).toBe("artifact_review");
    expect(route.findings?.[0]).toMatchObject({ finding_id: "F3-1", anchor: { artifact_id: route.artifactId } });
  });

  it("lets you drop hypotheses and keep a set-aside idea at the hypotheses stop", () => {
    const at = until("run.gate_opened", 2);
    const gate = envelopes[at - 1];
    const before = replayRunEvents("run-1", convert(envelopes.slice(0, at)));
    expect(before.gate?.options.map((o) => o.id)).toEqual(["approve", "drop", "revise"]);
    expect(before.gate?.droppable).toEqual(["H1", "H2", "H3", "H4", "H5", "H6"]);
    const keepable = before.gate?.keepable ?? [];
    expect(keepable.length).toBeGreaterThan(0);
    const list = [
      ...envelopes.slice(0, at),
      appended(gate, "decision.recorded", {
        action: "approve",
        gate_id: "hypotheses-2",
        params: { dropped: ["H2"], kept: [keepable[0]] },
      }),
      appended(gate, "run.gate_closed", { gate_id: "hypotheses-2", action: "approve", actor: "user" }),
    ];
    const state = replayRunEvents("run-1", convert(list));
    expect(state.decisions[2].text).toBe("Approved the hypotheses without 1 hypothesis and kept 1 set-aside idea.");
  });

  it("asks which hypotheses to accept once the stage is published", () => {
    const adapter = new PipelineAdapter(info);
    const end = envelopes.findIndex((e) => e.type === "stage.status_changed" && e.payload.status === "COMPLETED") + 1;
    const state = replayRunEvents("run-1", convert(envelopes.slice(0, end), adapter));
    expect(state.completed).toBe(false);
    expect(state.gate).toMatchObject({ kind: "accept", stop_index: 4, stop_total: 4 });
    // The PI's advice comes after the stop opened, and is added to it.
    const advised = replayRunEvents("run-1", convert(envelopes));
    expect(advised.gate?.id).toBe(state.gate?.id);
    expect(advised.gate?.advice).toMatchObject({ action: "accept" });
    expect(advised.gate?.advice?.text.length).toBeGreaterThan(20);
    expect(state.gate?.selection?.map((s) => s.id)).toEqual(["H1", "H2", "H3", "H4", "H5", "H6"]);
    expect(adapter.route(state.gate?.id ?? "")).toEqual({
      to: "accept",
      stageRunId: STAGE_RUN,
      hypothesisIds: ["H1", "H2", "H3", "H4", "H5", "H6"],
    });
  });

  it("records the papers dropped at the shortlist", () => {
    const at = envelopes.findIndex((e) => e.type === "run.gate_closed");
    const gate = envelopes[at];
    const list = [
      ...envelopes.slice(0, at),
      appended(gate, "decision.recorded", { action: "answer", option_id: "drop", params: { dropped: ["p-x"] } }),
      { ...gate, seq: ++seq },
    ];
    const state = replayRunEvents("run-1", convert(list));
    const screen = state.stages.screen.content;
    expect(screen.stage === "screen" && screen.dropped).toEqual(["p-x"]);
    expect(state.decisions[1].text).toBe("Approved the shortlist without 1 paper.");
  });

  it("offers the set the stage published at the accept stop, without what was dropped before", () => {
    const end = envelopes.findIndex((e) => e.type === "stage.status_changed" && e.payload.status === "COMPLETED");
    const done = envelopes[end];
    const list = [
      ...envelopes.slice(0, end).filter((e) => e.type !== "run.published"),
      appended(done, "run.published", {
        selection: { key: "hypothesis_ids", valid_ids: ["H2", "H3", "H4", "H5", "H6", "H7"] },
      }),
      { ...done, seq: ++seq },
    ];
    const adapter = new PipelineAdapter(info);
    const state = replayRunEvents("run-1", convert(list, adapter));
    expect(state.gate?.selection?.map((s) => s.id)).toEqual(["H2", "H3", "H4", "H5", "H6", "H7"]);
    expect(adapter.route(state.gate?.id ?? "")).toMatchObject({ hypothesisIds: ["H2", "H3", "H4", "H5", "H6", "H7"] });
  });

  it("marks hypotheses left out at the accept and completes the run", () => {
    const last = envelopes[envelopes.length - 1];
    const list = [
      ...envelopes,
      appended(last, "decision.recorded", { action: "accept", selection: { hypothesis_ids: ["H1", "H3"] } }),
      appended(last, "stage.status_changed", { status: "ACCEPTED" }),
    ];
    const state = replayRunEvents("run-1", convert(list));
    expect(hypothesize(state, "r3-hypothesize").dropped).toEqual(["H2", "H4", "H5", "H6"]);
    expect(state.decisions[3].text).toBe("Accepted 2 of 6 hypotheses: H1, H3.");
    expect(state.completed).toBe(true);
  });

  it("ends a failed run with the engine's message", () => {
    const list = [
      ...envelopes.slice(0, 40),
      appended(envelopes[39], "run.failed", { code: "LLM_ERROR", message: "The model failed." }),
    ];
    const state = replayRunEvents("run-1", convert(list));
    expect(state.lifecycle).toBe("failed");
    expect(state.failure).toBe("The model failed.");
    expect(state.failureCode).toBe("LLM_ERROR");
  });

  it("preserves the Local Node pause reason and auto-resume", () => {
    const adapter = new PipelineAdapter(info);
    const base = envelopes[39];
    const paused = convert(
      [
        ...envelopes.slice(0, 40),
        appended(base, "run.phase_changed", { from: "running", reason: "runner_offline" }, { phase: "paused" }),
      ],
      adapter,
    );
    expect(replayRunEvents("run-1", paused)).toMatchObject({ lifecycle: "paused", pauseReason: "runner_offline" });
    const resumed = adapter.convert(appended(base, "run.phase_changed", { from: "paused" }, { phase: "running" }));
    const state = replayRunEvents("run-1", [...paused, ...resumed]);
    expect(state.lifecycle).toBe("running");
    expect(state.pauseReason).toBeUndefined();
  });

  it.each(["text", "message", "summary"])("keeps release review from %s as ordinary narration", (field) => {
    const waiting = "Waiting for release review on the Local Node.";
    const state = replayRunEvents(
      "run-1",
      convert([
        ...envelopes.slice(0, 40),
        appended(
          envelopes[39],
          "hypothesis.progress",
          {
            kind: "release_review",
            ...(field !== "summary" ? { [field]: waiting } : {}),
          },
          field === "summary" ? { summary: waiting } : {},
        ),
      ]),
    );
    expect(state.message?.text).toBe("Waiting for release review on the Local Node.");
    expect(state.lifecycle).toBe("running");
    expect(state.gate).toBeNull();
  });

  it("preserves the capability code and the step's message", () => {
    const state = replayRunEvents(
      "run-1",
      convert([
        ...envelopes.slice(0, 40),
        appended(envelopes[39], "run.failed", {
          code: "LOCAL_NODE_CAPABILITY",
          message: "The Node cannot compute table_quality.",
        }),
      ]),
    );
    expect(state.failureCode).toBe("LOCAL_NODE_CAPABILITY");
    expect(state.failure).toBe("The Node cannot compute table_quality.");
  });

  it("ignores an envelope the stream sends again", () => {
    const adapter = new PipelineAdapter(info);
    convert(envelopes.slice(0, 200), adapter);
    expect(adapter.convert(envelopes[150])).toEqual([]);
  });

  describe("a set the independent review sends back", () => {
    it("keeps each rejected set on its own screen and starts the rewrite as the next round", () => {
      const state = replayRunEvents("run-1", convert(envelopes));
      const first = hypothesize(state, "r1-hypothesize");
      const second = hypothesize(state, "r2-hypothesize");
      expect(state.stages["r1-hypothesize"].summary).toBe(
        "6 hypotheses sent back by the reviewer with 6 blocking findings",
      );
      expect(state.stages["r2-hypothesize"].summary).toBe(
        "6 hypotheses sent back by the reviewer with 8 blocking findings",
      );
      expect(first.turns).toHaveLength(63);
      expect(first.findings.every((f) => f.finding_id.startsWith("F1-"))).toBe(true);
      expect(second.sentBy).toBe("reviewer");
      expect(second.sent).toHaveLength(6);
      expect(second.sent.every((f) => f.severity === "blocking" && f.finding_id.startsWith("F1-"))).toBe(true);
      expect(second.findings.every((f) => f.finding_id.startsWith("F2-"))).toBe(true);
    });
  });

  describe("work the engine does again", () => {
    it("draws the screen again without the withdrawn items and keeps the rest", () => {
      const end = until("hypothesis.problem.subquestion", 5);
      const base = envelopes[end - 1];
      const list = [
        ...envelopes.slice(0, end),
        appended(base, "hypothesis.content.reset", { key: "reset", scope: "stage-02" }, { step_key: "understand" }),
        appended(
          base,
          "hypothesis.problem.subquestion",
          {
            key: "sq:Q1",
            scope: "stage-02",
            sub_question: { id: "Q1", text: "Again", priority: 1, tests: "", covers: [] },
          },
          { step_key: "understand" },
        ),
      ];
      const state = replayRunEvents("run-1", convert(list));
      const scope = state.stages.scope.content;
      if (scope.stage !== "scope") throw new Error("stage");
      expect(scope.goal).toHaveLength(5);
      expect(scope.subQuestions.map((q) => q.text)).toEqual(["Again"]);
    });
  });

  describe("a set you send back for revision", () => {
    const gateAt = until("run.gate_opened", 2);
    const gate = envelopes[gateAt - 1];
    const reviewed = (gate.payload.artifact_ids as string[])[0];
    const drafted = envelopes.findLast((e) => e.type === "hypothesis.hypothesis.drafted") as PipelineEnvelope;
    const finding = envelopes.findLast((e) => e.type === "hypothesis.review.finding") as PipelineEnvelope;
    const sent = [
      {
        finding_id: "F3-1",
        anchor: { artifact_id: reviewed, locator: "item:H1/conditions" },
        severity: "major",
        author: "researcher",
      },
      {
        finding_id: "you-H2-1",
        anchor: { artifact_id: reviewed, locator: "item:H2" },
        severity: "major",
        kind: "fix",
        category: "other",
        issue: "Name the corpora.",
        author: "researcher",
      },
    ];
    const revision = [
      ...envelopes.slice(0, gateAt),
      appended(gate, "decision.recorded", { action: "comment", gate_id: "hypotheses-2", findings: sent }),
      appended(gate, "run.gate_closed", { gate_id: "hypotheses-2", action: "comment", actor: "user" }),
      appended(gate, "run.step_changed", { from: "verify" }, { step_key: "critique", phase: "revising" }),
      appended(gate, "hypothesis.content.reset", { key: "reset", scope: "stage-08" }, { step_key: "critique" }),
      { ...drafted, seq: ++seq, step_key: "critique" },
      appended(gate, "review.completed", { round: 4, passed: true, artifact_id: null }, { step_key: "critique" }),
      { ...finding, seq: ++seq, payload: { ...finding.payload, round: 4 } },
      appended(gate, "run.gate_opened", { ...gate.payload, gate_id: "hypotheses-3" }, { phase: "awaiting_researcher" }),
    ];

    it("opens the next round beside the others", () => {
      const state = replayRunEvents("run-1", convert(revision));
      expect(state.plan.filter((s) => s.stage === "hypothesize").map((s) => [s.key, s.round_kind])).toEqual([
        ["r1-hypothesize", "first"],
        ["r2-hypothesize", "review"],
        ["r3-hypothesize", "review"],
        ["r4-hypothesize", "revise"],
      ]);
      expect(state.decisions[2].text).toBe("Sent the hypotheses back for revision with 2 comments.");
      expect(state.stages["r3-hypothesize"].summary).toBe("6 hypotheses sent back for revision with 2 comments");
      const fourth = hypothesize(state, "r4-hypothesize");
      expect(fourth.sentBy).toBe("you");
      expect(fourth.sent.map((f) => f.finding_id)).toEqual(["F3-1", "you-H2-1"]);
      expect(fourth.findings.map((f) => f.finding_id)).toEqual(["F4-1"]);
      expect(state.gate).toMatchObject({ id: "hypotheses-3", title: "Approve the revised hypotheses" });
      expect(state.gate?.review?.findings.map((f) => f.finding_id)).toEqual(["F4-1"]);
    });

    it("sends back the findings picked and your own comments, anchored to the set", () => {
      const adapter = new PipelineAdapter(info);
      convert(envelopes.slice(0, gateAt), adapter);
      const route = adapter.route("hypotheses-2");
      if (route?.to !== "gate") throw new Error("route");
      expect(route.artifactId).toBe(reviewed);
      const body = revisionFindings(
        {
          option_id: "revise",
          findings: ["F3-1"],
          own: [
            {
              hypothesis: "H2",
              field: "conditions",
              severity: "blocking",
              kind: "fix",
              category: "reproducibility",
              issue: " Name the corpora. ",
              suggestion: "List them.",
            },
            { hypothesis: "H3", field: "", severity: "minor", kind: "fix", category: "other", issue: " " },
          ],
        },
        route.findings ?? [],
        route.artifactId,
      );
      expect(body.map((f) => [f.finding_id, f.author])).toEqual([
        ["F3-1", "researcher"],
        ["you-H2-1", "researcher"],
      ]);
      expect(body[0]).toMatchObject({ anchor: { artifact_id: reviewed, locator: expect.stringMatching(/^item:H\d/) } });
      expect(body[1]).toMatchObject({
        anchor: { artifact_id: reviewed, locator: "item:H2/conditions" },
        severity: "blocking",
        category: "reproducibility",
        issue: "Name the corpora.",
        suggestion: "List them.",
      });
      expect(() => revisionFindings({ option_id: "revise" }, route.findings ?? [], route.artifactId)).toThrow(
        "Pick a finding or write a comment to send back.",
      );
    });
  });
});
