import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchArtifacts, type RunArtifactItem } from "@/lib/api/services/fetch-artifacts";
import { fetchRuns } from "@/lib/api/services/fetch-runs";
import type { RunEventOrigin } from "@/lib/realtime/run-events";

import { ApiRun } from "./api-run";
import type { RunEvent } from "./contract";
import published from "./fixtures/hypothesis-published.json";
import { replayRunEvents } from "./reducer";

type Handlers = { onEvents: (events: RunEvent[], origin: RunEventOrigin) => void };
const subscription: { handlers?: Handlers } = {};

vi.mock("@/lib/realtime/run-events", () => ({
  subscribeRunEvents: (_project: string, _run: string, _options: unknown, handlers: Handlers) => {
    subscription.handlers = handlers;
    return () => undefined;
  },
}));

const event = (seq: number, type: string, payload: Record<string, unknown> = {}) =>
  ({ run_id: "run-1", seq, ts: "2026-10-15T00:00:00Z", type, ...payload }) as unknown as RunEvent;

afterEach(() => {
  vi.useRealTimers();
});

describe("ApiRun", () => {
  it("delivers history as history and only what follows as live", () => {
    vi.useFakeTimers();
    const received: { types: string[]; live: boolean }[] = [];
    const run = new ApiRun("project-1", "run-1", (events, live) =>
      received.push({ types: events.map((e) => e.type), live }),
    );
    run.start(true);

    // A reload replays a run that already stopped, in more than one batch.
    subscription.handlers?.onEvents([event(1, "run.started")], "history");
    subscription.handlers?.onEvents([event(2, "run.failed", { reason: "x" })], "history");
    expect(received).toEqual([
      { types: ["run.started"], live: false },
      { types: ["run.failed"], live: false },
    ]);

    subscription.handlers?.onEvents([event(3, "agent.message")], "live");
    vi.runAllTimers();
    expect(received.slice(2).every((batch) => batch.live)).toBe(true);
    expect(received.slice(2).flatMap((batch) => batch.types)).toEqual(["agent.message"]);
    run.dispose();
  });

  it("closes a question gate after a successful answer even when no stream close arrives", async () => {
    const received: RunEvent[] = [];
    const run = new ApiRun("project-1", "run-1", (events) => received.push(...events), {
      topic: "Dataset question",
      domains: [],
      mode: "light",
    });
    run.start(true);
    const gate = {
      run_id: "run-1",
      seq: 1,
      ts: "2026-10-15T00:00:00Z",
      type: "run.gate_opened",
      stage_key: "dataset",
      stage_run_id: "stage-run-1",
      step_key: "work",
      phase: "awaiting_researcher",
      payload: {
        gate_id: "ask_user-2",
        kind: "question",
        step_key: "work",
        header: "Key column",
        prompt: "Decision: Confirm the key column.",
        options: [{ option_id: "approve", label: "Approve" }],
        default_option_id: "approve",
        selection: null,
      },
    } as unknown as RunEvent;
    subscription.handlers?.onEvents([gate], "history");
    const request = vi.spyOn(fetchRuns, "answerStageGate").mockResolvedValue({
      success: true,
      message: "Answered",
      data: { gate_id: "ask_user-2", status: "answered" },
      meta: { request_id: "request-1", pagination: null },
    });

    const recorded = await run.answerGate("ask_user-2", { option_id: "approve" });
    const state = replayRunEvents("run-1", received);

    expect(recorded).toBe(true);
    expect(request).toHaveBeenCalledWith("project-1", "run-1", "stage-run-1", "ask_user-2", {
      action: "answer",
      option_id: "approve",
    });
    expect(received.find((event) => event.type === "gate.resolved")).toMatchObject({
      payload: { gate_id: "ask_user-2", answer: { option_id: "approve" } },
    });
    expect(state.gate).toBeNull();
    expect(state.decisions).toContainEqual(expect.objectContaining({ gateId: "ask_user-2", option: "approve" }));
    run.dispose();
  });

  it("accepts a dataset stage with an empty selection payload", async () => {
    const run = new ApiRun("project-1", "run-1", () => undefined, {
      topic: "Synthetic study",
      domains: [],
      mode: "light",
    });
    run.start(true);
    subscription.handlers?.onEvents(
      [
        {
          run_id: "run-1",
          seq: 1,
          ts: "2026-10-15T00:00:00Z",
          type: "stage.status_changed",
          stage_key: "dataset",
          stage_run_id: "stage-run-1",
          payload: { status: "COMPLETED" },
        } as unknown as RunEvent,
      ],
      "history",
    );
    const request = vi.spyOn(fetchRuns, "acceptStage").mockResolvedValue({
      success: true,
      message: "Accepted",
      data: {},
      meta: { request_id: "request-1", pagination: null },
    });

    await run.answerGate("accept-stage-run-1", { option_id: "accept" });

    expect(request).toHaveBeenCalledWith("project-1", "run-1", "stage-run-1", { selection: {} });
    run.dispose();
  });

  it.each([true, false])(
    "hydrates a bare hypothesis publication and posts the selected IDs (set: %s)",
    async (hasSet) => {
      const received: RunEvent[] = [];
      const run = new ApiRun("project-1", "run-1", (events) => received.push(...events), {
        topic: "Sleep and grades",
        domains: [],
        mode: "light",
      });
      const artifacts = [
        { id: "dataset-output", stage_run_id: "dataset-stage", schema_id: "dataset.data_card/v1" },
        { id: "another-set", stage_run_id: "old-stage", schema_id: "hypothesis.set/v1", version: 2 },
        {
          id: published.primaryId,
          stage_run_id: published.stageRunId,
          schema_id: "hypothesis.hypotheses/v2",
          primary: true,
        },
        { id: "evidence", stage_run_id: published.stageRunId, schema_id: "hypothesis.evidence/v1" },
        ...(hasSet
          ? [{ id: "hypothesis-set", stage_run_id: published.stageRunId, schema_id: "hypothesis.set/v1" }]
          : []),
      ] as RunArtifactItem[];
      vi.spyOn(fetchArtifacts, "getList").mockResolvedValue({
        success: true,
        message: "Listed",
        data: artifacts,
        meta: { request_id: "request-1", pagination: null },
      });
      const download = vi.spyOn(fetchArtifacts, "download").mockImplementation(async (_project, _run, id) => ({
        filename: `${id}.json`,
        contentType: "application/json",
        blob: new Blob([
          JSON.stringify(
            id === "hypothesis-set" ? published.set : id === "evidence" ? published.evidence : published.primary,
          ),
        ]),
      }));
      const request = vi.spyOn(fetchRuns, "acceptStage").mockResolvedValue({
        success: true,
        message: "Accepted",
        data: {},
        meta: { request_id: "request-1", pagination: null },
      });

      run.start(true);
      const stage = { stage_key: "hypothesis", stage_run_id: published.stageRunId };
      subscription.handlers?.onEvents(
        [
          event(183, "run.published", {
            stage_key: "dataset",
            stage_run_id: "dataset-stage",
            payload: { artifact_id: "dataset-output" },
          }),
          event(554, "run.published", { ...stage, payload: { artifact_id: published.primaryId } }),
          event(555, "stage.status_changed", { ...stage, payload: { status: "COMPLETED" } }),
        ],
        "history",
      );
      expect(replayRunEvents("run-1", received).gate?.selectionPending).toBe(true);
      await vi.waitFor(() => {
        const state = replayRunEvents("run-1", received);
        expect(state.gate).toMatchObject({
          title: "Accept the hypotheses",
          selection: [
            {
              id: "H1",
              label: published.primary.hypotheses[0].statement,
              falsify: published.primary.hypotheses[0].falsify.text,
              fromArtifact: true,
            },
          ],
        });
        expect(state.stages.map.content).toMatchObject({
          fromArtifacts: true,
          nodes: [{ code: "H1" }, { code: "EV1" }],
          edges: [{ from: "H:H1", to: "EV:EV1", relation: "cites" }],
          pieces: expect.arrayContaining([expect.objectContaining({ id: "design", status: "filled" })]),
        });
      });
      expect(download.mock.calls.map((call) => call[2]).sort()).toEqual(
        ["evidence", hasSet ? "hypothesis-set" : published.primaryId].sort(),
      );
      expect(await run.answerGate(`accept-${published.stageRunId}`, { option_id: "accept" })).toBe(true);
      expect(request).toHaveBeenCalledWith("project-1", "run-1", published.stageRunId, {
        selection: { hypothesis_ids: ["H1"] },
      });
      run.dispose();
    },
  );
});
