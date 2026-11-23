import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";
import { fetchRuns } from "@/lib/api/services/fetch-runs";
import type { RunEventOrigin } from "@/lib/realtime/run-events";

import { ApiRun } from "./api-run";
import type { RunEvent } from "./contract";
import { DESIGN_STAGE, parseDesignPlan } from "./experiment-design";
import plan from "./fixtures/run-0719-design-plan.json";
import { PipelineAdapter, type PipelineEnvelope } from "./pipeline-adapter";
import { replayRunEvents } from "./reducer";
import { readFileSync } from "node:fs";

type Handlers = { onEvents(events: RunEvent[], origin: RunEventOrigin): void };
const stream: { handlers?: Handlers } = {};
vi.mock("@/lib/realtime/run-events", () => ({
  subscribeRunEvents: (_project: string, _run: string, _options: unknown, handlers: Handlers) => {
    stream.handlers = handlers;
    return () => undefined;
  },
}));

const events: PipelineEnvelope[] = readFileSync(new URL("./fixtures/run-0719-design.jsonl", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const runId = events[0].run_id;
const stageRunId = events.find((event) => event.stage_key === DESIGN_STAGE)?.stage_run_id;
const info = {
  topic: "Sleep and grades",
  domains: [],
  mode: "light" as const,
  datasetFirst: true,
  continuesToDesign: true,
};
const gateId = `${DESIGN_STAGE}:${stageRunId}:ask_user-1`;
const until = (seq: number) => events.filter((event) => event.seq <= seq);

function replay(seq: number) {
  const adapter = new PipelineAdapter(info);
  const adapted = until(seq).flatMap((event) => adapter.convert(event));
  return { adapter, adapted, state: replayRunEvents(runId, adapted) };
}

afterEach(() => vi.restoreAllMocks());

describe("RUN-0719 Experiment design", () => {
  it("replays the stage, its live work, item states and a resolved question after reload", () => {
    const { state } = replay(614);
    expect(state).toMatchObject({ currentStageKey: DESIGN_STAGE, completed: false, gate: null });
    expect(state.stages.map.status).toBe("done");
    expect(state.stages[DESIGN_STAGE].currentStepId).toBe("design_work");
    expect(state.stages[DESIGN_STAGE].content).toMatchObject({
      liveDesign: { hypotheses: { H1: { estimand: { effect_measure: "linear_coefficient" } } }, tokens: 124563 },
    });
    expect(state.workChecks[DESIGN_STAGE].design_work.estimands.state).toBe("red");
    expect(state.message?.text).toBe("Defining the estimand for H1");
    expect(state.decisions.filter((decision) => decision.gateId === gateId)).toMatchObject([
      { actor: "you", stageKey: DESIGN_STAGE, text: "Decided: Approve" },
    ]);
    expect(replay(620).state.message?.text).toBe("Writing the protocol for H1");
  });

  it("opens the actual question and uses the generic POST with its stored stage and gate IDs", async () => {
    const received: RunEvent[] = [];
    const run = new ApiRun("project", runId, (batch) => received.push(...batch), info);
    vi.spyOn(fetchArtifacts, "getList").mockResolvedValue({
      data: [],
      message: "Artifacts",
      success: true,
      meta: { request_id: "test", pagination: null },
    });
    const request = vi.spyOn(fetchRuns, "answerStageGate").mockResolvedValue({
      data: { gate_id: "ask_user-1", status: "answered" },
      message: "Answered",
      success: true,
      meta: { request_id: "test", pagination: null },
    });
    try {
      run.start(true);
      stream.handlers?.onEvents(until(607) as unknown as RunEvent[], "history");
      const open = replayRunEvents(runId, received);
      expect(open.gate).toMatchObject({
        id: gateId,
        kind: "decision",
        stageKey: DESIGN_STAGE,
        options: expect.arrayContaining([expect.objectContaining({ id: "other", needsText: true })]),
      });
      expect(await run.answerGate(gateId, { option_id: "other", note: "Use the stated comparison." })).toBe(true);
      expect(request).toHaveBeenCalledWith("project", runId, stageRunId, "ask_user-1", {
        action: "answer",
        option_id: "other",
        text: "Use the stated comparison.",
      });
      expect(replayRunEvents(runId, received).gate).toBeNull();
      expect(replayRunEvents(runId, received).stages[DESIGN_STAGE].currentStepId).toBe("design_work");
    } finally {
      run.dispose();
    }
  });

  it("fills the plan from publication and tells the researcher why the real stage cannot be accepted", () => {
    const { adapter, adapted, state } = replay(719);
    expect(state.stages[DESIGN_STAGE].doneStepIds).toEqual(["design_work", "design_review"]);
    expect(state.gate?.options.map((option) => option.id)).toEqual(["send_back"]);
    expect(state.stages[DESIGN_STAGE].content).toMatchObject({
      liveDesign: { blocked: expect.stringContaining("experiment_design.lock/v1") },
    });
    const ref = adapter.designToLoad();
    expect(ref).toMatchObject({ stageRunId });
    if (!ref) throw new Error("The real publication was not discovered");
    const publication = { hypotheses: parseDesignPlan(plan), findings: [], artifacts: [] };
    const hydrated = replayRunEvents(runId, [...adapted, ...adapter.applyDesign(ref, publication)]);
    expect(hydrated.stages[DESIGN_STAGE].content).toMatchObject({
      liveDesign: {
        hypotheses: {
          H1: {
            estimand: { effect_measure: "linear_coefficient", outcome: { variable: "exam_score" } },
            program: { family: "linear_regression", covariates: [] },
            protocol: { population: "Students represented in this dataset." },
            decisionRule: undefined,
          },
        },
        artifacts: { "experiment_design.preregistration/v1": expect.anything() },
      },
    });
  });

  it("keeps Design and Hypothesis as completed stages when Execution starts", () => {
    const { adapter, adapted, state } = replay(718);
    expect(state.gate?.options[0].id).toBe("accept");
    expect(adapter.route(state.gate?.id ?? "")).toEqual({ to: "accept", stageRunId, stageKey: DESIGN_STAGE });
    const last = events.find((event) => event.seq === 718);
    if (!last) throw new Error("Missing completion event");
    const accepted = adapter.convert({ ...last, seq: 719, payload: { status: "ACCEPTED" } });
    const afterAccept = replayRunEvents(runId, [...adapted, ...accepted]);
    expect(afterAccept).toMatchObject({ currentStageKey: DESIGN_STAGE, gate: null, completed: false });
    expect(afterAccept.stages.execution).toBeUndefined();
    const started = adapter.convert({
      ...last,
      seq: 720,
      stage_key: "execution",
      stage_run_id: "execution-stage",
      type: "stage.status_changed",
      payload: { status: "RUNNING" },
    });
    const next = replayRunEvents(runId, [...adapted, ...accepted, ...started]);
    expect(next).toMatchObject({ currentStageKey: "execution", gate: null, completed: false });
    expect(next.stages.map.status).toBe("done");
    expect(next.stages[DESIGN_STAGE].status).toBe("done");
  });

  it("closes the Design review stop when the run ends without a plan lock", () => {
    const { adapter, adapted, state } = replay(719);
    expect(state.gate).toMatchObject({ kind: "accept", stageKey: DESIGN_STAGE });
    const ended = replayRunEvents(runId, [...adapted, ...adapter.end("completed")]);

    expect(adapter.route(state.gate?.id ?? "")).toBeNull();
    expect(ended).toMatchObject({ completed: true, currentStageKey: DESIGN_STAGE, gate: null });
    expect(ended.stages[DESIGN_STAGE].content).toMatchObject({
      liveDesign: { blocked: expect.stringContaining("experiment_design.lock/v1") },
    });
  });

  it("routes Execution decisions to the real stage and shows only its delivered evidence", () => {
    const { adapter, adapted } = replay(718);
    const last = events.find((event) => event.seq === 718);
    if (!last) throw new Error("Missing completion event");
    const accepted = adapter.convert({ ...last, seq: 719, payload: { status: "ACCEPTED" } });
    const execution = (seq: number, type: string, payload: Record<string, unknown>, summary?: string) =>
      adapter.convert({
        ...last,
        seq,
        type,
        payload,
        summary,
        stage_key: "execution",
        stage_run_id: "execution-stage",
      });
    const prepared = [
      ...execution(720, "stage.status_changed", { status: "RUNNING" }),
      ...execution(721, "execution.item", { key: "rehearsal", state: "green" }),
      ...execution(722, "execution.progress", { phase: "sealed", place: 1, total: 2 }, "Computing program 1 of 2"),
      ...execution(723, "run.gate_opened", {
        kind: "question",
        gate_id: "unseal-1",
        prompt: "Review the prerequisites for unsealing",
        options: [{ option_id: "proceed", label: "Unseal" }],
        default_option_id: "proceed",
      }),
    ];
    const waiting = replayRunEvents(runId, [...adapted, ...accepted, ...prepared]);
    const unsealGate = "execution:execution-stage:unseal-1";
    expect(waiting.gate).toMatchObject({ id: unsealGate, stageKey: "execution" });
    expect(adapter.route(unsealGate)).toMatchObject({
      to: "gate",
      stageRunId: "execution-stage",
      engineGateId: "unseal-1",
    });
    expect(waiting.stages.execution.content).toMatchObject({
      execution: {
        checks: { rehearsal: { state: "green" } },
        progress: { execution_run: "Computing program 1 of 2" },
        artifacts: {},
      },
    });
    const delivered = [
      ...execution(724, "decision.recorded", { option_id: "proceed" }),
      ...execution(725, "run.gate_closed", { gate_id: "unseal-1", action: "answer" }),
      ...execution(726, "artifact.delivered", { schema: "evidence.records/v1", artifact_id: "published-records" }),
      ...execution(727, "stage.status_changed", { status: "COMPLETED" }),
    ];
    const review = replayRunEvents(runId, [...adapted, ...accepted, ...prepared, ...delivered]);
    expect(review.gate).toMatchObject({ id: "accept-execution-stage", stageKey: "execution", kind: "accept" });
    expect(review.stages.execution.content).toMatchObject({
      execution: { artifacts: { "evidence.records/v1": "published-records" } },
    });
    expect(adapter.route("accept-execution-stage")).toEqual({
      to: "accept",
      stageRunId: "execution-stage",
      stageKey: "execution",
    });
  });
});
