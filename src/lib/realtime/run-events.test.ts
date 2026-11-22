import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { incompleteRapidReview } from "@/lib/run-stream/hypothesis-work";
import { PipelineAdapter, type PipelineEnvelope } from "@/lib/run-stream/pipeline-adapter";
import { applyRunEvent, replayRunEvents } from "@/lib/run-stream/reducer";
import { initialRunState } from "@/lib/run-stream/run-state";
import { ApiError } from "@/types/api";

import { parseRunEvent, subscribeRunEvents } from "./run-events";

class FakeSource {
  static CLOSED = 2;
  static instances: FakeSource[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn(() => {
    this.readyState = 2;
  });
  listeners = new Map<string, (event: { data: string }) => void>();
  constructor(
    public url: string,
    public options: EventSourceInit,
  ) {
    FakeSource.instances.push(this);
  }
  addEventListener(kind: string, listener: (event: { data: string }) => void) {
    this.listeners.set(kind, listener);
  }
  emit(kind: string, payload: unknown) {
    this.listeners.get(kind)?.({ data: JSON.stringify(payload) });
  }
}

const event = (seq: number, type = "agent.message") => ({
  seq,
  run_id: "run-1",
  ts: "2026-10-06T07:45:59.000Z",
  type,
  stage_key: "scope",
  actor: "strategist",
  payload: { message_id: "m1", delta: "Hi " },
});
const page = (events: unknown[]) =>
  ({
    success: true,
    message: "OK",
    data: events,
    meta: { request_id: "r", pagination: { total: events.length, limit: 500, offset: 0 } },
  }) as Awaited<ReturnType<typeof fetchRuns.getEvents>>;
const handlers = () => ({ onEvents: vi.fn(), onEnded: vi.fn(), onSessionEnded: vi.fn(), onError: vi.fn() });
const seqs = (calls: unknown[][]) => calls.flatMap(([events]) => (events as { seq: number }[]).map((e) => e.seq));

describe("run event subscription", () => {
  beforeEach(() => {
    FakeSource.instances = [];
    vi.stubGlobal("EventSource", FakeSource);
    vi.stubGlobal("window", { location: { origin: "https://frontend.test" } });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reads stored events first, then streams from the last one with credentials", async () => {
    const getEvents = vi.spyOn(fetchRuns, "getEvents").mockResolvedValueOnce(page([event(1), event(2)]));
    const listener = handlers();
    subscribeRunEvents("project/1", "run-1", { after: 0, live: true }, listener);
    await vi.waitFor(() => expect(FakeSource.instances).toHaveLength(1));
    expect(getEvents).toHaveBeenCalledWith("project/1", "run-1", { after: 0, limit: 500 }, expect.any(AbortSignal));
    const source = FakeSource.instances[0];
    const url = new URL(source.url);
    expect(url.pathname).toBe("/api/v1/projects/project%2F1/runs/run-1/events/stream");
    expect(url.searchParams.get("after")).toBe("2");
    expect(source.options.withCredentials).toBe(true);
    source.emit("run-event", event(2));
    source.emit("run-event", event(3));
    expect(seqs(listener.onEvents.mock.calls)).toEqual([1, 2, 3]);
    source.emit("run-ended", { status: "completed" });
    expect(listener.onEnded).toHaveBeenCalledOnce();
    expect(source.close).toHaveBeenCalled();
  });

  it("only reads a run that is no longer live", async () => {
    vi.spyOn(fetchRuns, "getEvents").mockResolvedValueOnce(page([event(1)]));
    const listener = handlers();
    subscribeRunEvents("p", "run-1", { after: 0, live: false }, listener);
    await vi.waitFor(() => expect(listener.onEnded).toHaveBeenCalledOnce());
    expect(listener.onEvents).toHaveBeenCalledOnce();
    expect(FakeSource.instances).toHaveLength(0);
  });

  it("after a dropped stream, reads what it missed and reconnects from there", async () => {
    vi.useFakeTimers();
    const getEvents = vi
      .spyOn(fetchRuns, "getEvents")
      .mockResolvedValueOnce(page([event(1)]))
      .mockResolvedValueOnce(page([event(2), event(3)]));
    const listener = handlers();
    subscribeRunEvents("p", "run-1", { after: 0, live: true }, listener);
    await vi.waitFor(() => expect(FakeSource.instances).toHaveLength(1));
    FakeSource.instances[0].onerror?.();
    expect(FakeSource.instances[0].close).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(getEvents).toHaveBeenLastCalledWith("p", "run-1", { after: 1, limit: 500 }, expect.any(AbortSignal));
    await vi.waitFor(() => expect(FakeSource.instances).toHaveLength(2));
    expect(new URL(FakeSource.instances[1].url).searchParams.get("after")).toBe("3");
    expect(seqs(listener.onEvents.mock.calls)).toEqual([1, 2, 3]);
  });

  it("restores rapid review rounds, zero hits, provider issues, decisions and cards after reconnect", async () => {
    vi.useFakeTimers();
    const events: PipelineEnvelope[] = [];
    const emit = (type: string, scope: string, key: string, payload: Record<string, unknown>) => {
      events.push({
        ...event(events.length + 1, `hypothesis.${type}`),
        stage_key: "hypothesis",
        stage_run_id: "hypothesis-stage",
        step_key: "work",
        payload: { scope, key, ...payload },
      });
    };
    const search = (round: number) => {
      const id = `r${round}`;
      emit("search.strategy", "stage-03", id, {
        strategy: { id, title: `Search round ${round}`, why: "" },
        review_round: round,
      });
      emit("search.sources", "stage-03", "sources", {
        sources: ["openalex", "arxiv"].map((id) => ({ id, name: id })),
      });
      emit("search.query", "stage-03", `${id}-q1`, {
        query: { id: `${id}-q1`, strategy_id: id, text: "work and sleep" },
      });
      for (const source of ["openalex", "arxiv"])
        emit("literature.request", "stage-04", `${id}:${source}`, {
          query_id: `${id}-q1`,
          source_id: source,
          review_round: round,
        });
    };
    search(1);
    const disconnectedAt = events.length;
    emit("literature.batch", "stage-04", "hits:r1:openalex", { query_id: "r1-q1", source_id: "openalex", hits: 0 });
    emit("literature.batch", "stage-04", "hits:r1:arxiv", {
      query_id: "r1-q1",
      source_id: "arxiv",
      hits: 0,
      issue: "Rate limited (429)",
    });
    emit("literature.collected", "stage-04", "collected", {
      review_round: 1,
      round_answered: true,
      round_hits: 0,
      new_records: 0,
      raw: 0,
      unique: 0,
      duplicates: 0,
      files: [],
    });
    const caughtUpAt = events.length;
    search(2);
    emit("literature.batch", "stage-04", "hits:r2:openalex", { query_id: "r2-q1", source_id: "openalex", hits: 3 });
    emit("literature.batch", "stage-04", "hits:r2:arxiv", {
      query_id: "r2-q1",
      source_id: "arxiv",
      hits: 0,
      issue: "Provider request failed",
    });
    emit("literature.collected", "stage-04", "collected", {
      review_round: 2,
      round_answered: true,
      round_hits: 3,
      new_records: 2,
      raw: 3,
      unique: 2,
      duplicates: 1,
      files: [],
    });
    emit("screen.criteria", "stage-05", "criteria", {
      rules: ["Empirical studies"],
      protocol_version: 1,
      candidates: 2,
    });
    emit("screen.eligibility", "stage-05", "eligibility:a", {
      id: "a",
      title: "Study A",
      citation: "Author A",
      included: true,
      score: 0.8,
      review_round: 2,
      protocol_version: 1,
    });
    emit("screen.eligibility", "stage-05", "eligibility:b", {
      id: "b",
      title: "Study B",
      included: false,
      score: 0.2,
      reason: "wrong_design",
      review_round: 2,
      protocol_version: 1,
    });
    emit("screen_progress", "stage-05", "progress", {
      done: 2,
      total: 2,
      not_screened: 0,
      state: "completed",
      protocol_version: 1,
    });
    emit("card.extracted", "stage-06", "card:a", {
      card: { id: "card-a", paper_id: "a", findings: "Actual finding." },
    });
    emit("synthesis.ranked", "stage-07", "ranking", {
      ranking: [{ gap_id: "G1", priority: 1, text: "Timing of work and sleep" }],
      gaps: [{ id: "G1", text: "Available studies were cross-sectional.", from: ["card-a"] }],
    });

    vi.spyOn(fetchRuns, "getEvents")
      .mockResolvedValueOnce(page(events.slice(0, disconnectedAt)))
      .mockResolvedValueOnce(page(events.slice(disconnectedAt, caughtUpAt)));
    const info = { topic: "Research question", domains: [], mode: "light" as const };
    const adapter = new PipelineAdapter(info);
    let state = initialRunState("run-1");
    const subscribed = handlers();
    subscribed.onEvents.mockImplementation((rows: PipelineEnvelope[]) => {
      for (const row of rows) for (const projected of adapter.convert(row)) state = applyRunEvent(state, projected);
    });
    const stop = subscribeRunEvents("p", "run-1", { after: 0, live: true }, subscribed);
    await vi.waitFor(() => expect(FakeSource.instances).toHaveLength(1));
    expect(state.stages.search.content).toMatchObject({ reviewRound: 1, cells: { "r1-q1:openalex": null } });
    expect(state.stages.search.content).not.toHaveProperty("collected");
    expect(incompleteRapidReview(state.stages.search.content)).toBe(true);
    FakeSource.instances[0].onerror?.();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(FakeSource.instances).toHaveLength(2));
    expect(state.stages.search.content).toMatchObject({
      cells: { "r1-q1:openalex": 0 },
      cellIssues: { "r1-q1:arxiv": "Rate limited (429)" },
      collected: { raw: 0, unique: 0, round_answered: true },
    });
    expect(incompleteRapidReview(state.stages.search.content)).toBe(false);
    for (const row of events.slice(caughtUpAt - 1)) FakeSource.instances[1].emit("run-event", row);
    const replay = new PipelineAdapter(info);
    expect(state).toEqual(
      replayRunEvents(
        "run-1",
        events.flatMap((row) => replay.convert(row)),
      ),
    );
    expect(state.stages.search.content).toMatchObject({
      queries: [{ id: "r1-q1" }, { id: "r2-q1" }],
      collected: { raw: 3, unique: 2, duplicates: 1 },
    });
    expect(state.stages.screen.content).toMatchObject({
      kept: [{ id: "a", eligibilityScore: 0.8 }],
      rejected: [{ id: "b", eligibilityScore: 0.2 }],
      points: [],
      reviewProgress: { done: 2, total: 2, state: "completed" },
    });
    expect(state.stages.read.content).toMatchObject({ cards: [{ id: "card-a", paper_id: "a" }] });
    expect(state.stages.synthesize.content).toMatchObject({ gaps: [{ id: "G1", from: ["card-a"] }] });
    stop();
  });

  it("ends on session-ended and on a run the person can no longer see", async () => {
    vi.spyOn(fetchRuns, "getEvents").mockResolvedValueOnce(page([]));
    const listener = handlers();
    subscribeRunEvents("p", "run-1", { after: 0, live: true }, listener);
    await vi.waitFor(() => expect(FakeSource.instances).toHaveLength(1));
    FakeSource.instances[0].emit("session-ended", { code: "SESSION_EXPIRED" });
    expect(listener.onSessionEnded).toHaveBeenCalledWith("SESSION_EXPIRED");

    vi.spyOn(fetchRuns, "getEvents").mockRejectedValueOnce(new ApiError(404, "NOT_FOUND", "Run not found"));
    const gone = handlers();
    subscribeRunEvents("p", "run-2", { after: 0, live: true }, gone);
    await vi.waitFor(() => expect(gone.onError).toHaveBeenCalledOnce());
    expect(FakeSource.instances).toHaveLength(1);
  });

  it("drops null stage and actor and rejects what is not an event", () => {
    expect(parseRunEvent({ ...event(4), stage_key: null, actor: null })).toEqual({
      seq: 4,
      run_id: "run-1",
      ts: "2026-10-06T07:45:59.000Z",
      type: "agent.message",
      payload: { message_id: "m1", delta: "Hi " },
    });
    expect(parseRunEvent({ seq: 0, type: "x" })).toBeNull();
  });
});
