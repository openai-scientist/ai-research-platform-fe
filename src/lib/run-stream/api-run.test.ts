import { afterEach, describe, expect, it, vi } from "vitest";

import type { RunEventOrigin } from "@/lib/realtime/run-events";

import { ApiRun } from "./api-run";
import type { RunEvent } from "./contract";

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
});
