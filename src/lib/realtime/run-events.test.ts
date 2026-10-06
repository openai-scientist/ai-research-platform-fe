import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchRuns } from "@/lib/api/services/fetch-runs";
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
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://backend.test/api/v1");
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
    await vi.waitFor(() => expect(listener.onEvents).toHaveBeenCalledOnce());
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
