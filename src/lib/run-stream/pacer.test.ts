import { describe, expect, it } from "vitest";

import type { RunEvent } from "./contract";
import { RunPacer } from "./pacer";

/** A clock the test moves by hand. */
function fakeClock() {
  let now = 0;
  let hidden = false;
  const timers: { at: number; run: () => void; id: number }[] = [];
  let ids = 0;
  return {
    clock: {
      now: () => now,
      setTimeout: (run: () => void, ms: number) => {
        const id = ++ids;
        timers.push({ at: now + ms, run, id });
        return id;
      },
      clearTimeout: (id: unknown) => {
        const at = timers.findIndex((t) => t.id === id);
        if (at !== -1) timers.splice(at, 1);
      },
      hidden: () => hidden,
    },
    advance(ms: number) {
      const until = now + ms;
      for (;;) {
        timers.sort((a, b) => a.at - b.at);
        const next = timers[0];
        if (!next || next.at > until) break;
        timers.shift();
        now = next.at;
        next.run();
      }
      now = until;
    },
    hide() {
      hidden = true;
    },
  };
}

let seq = 0;
const event = (type: string, payload: Record<string, unknown> = {}, stage_key = "screen") =>
  ({ seq: ++seq, run_id: "r", ts: "", type, stage_key, payload }) as unknown as RunEvent;

function setup() {
  const time = fakeClock();
  const shown: RunEvent[][] = [];
  const pacer = new RunPacer((events) => shown.push(events), time.clock);
  const seqs = () => shown.flat().map((e) => e.seq);
  return { time, shown, pacer, seqs };
}

describe("RunPacer", () => {
  it("shows history at once and live events one beat at a time, in order", () => {
    const { time, pacer, seqs, shown } = setup();
    const history = [event("run.started"), event("run.plan")];
    pacer.now(history);
    expect(shown).toEqual([history]);

    const live = [event("stage.started"), event("step.started"), event("card.extracted"), event("card.extracted")];
    pacer.push(live);
    expect(seqs()).toEqual([...history, live[0]].map((e) => e.seq)); // the first shows at once
    time.advance(899);
    expect(seqs()).toHaveLength(3);
    time.advance(1); // a stage gets 900 ms
    expect(seqs()).toHaveLength(4);
    time.advance(300 + 450);
    expect(seqs()).toEqual([...history, ...live].map((e) => e.seq));
  });

  it("shows bulk events a handful at a time", () => {
    const { pacer, shown } = setup();
    const rejected = Array.from({ length: 20 }, () => event("screen.rejected"));
    pacer.push(rejected);
    expect(shown[0]).toHaveLength(8);
  });

  it("speeds up when it falls behind or a review stop is waiting", () => {
    const { time, pacer, seqs } = setup();
    pacer.push([event("stage.started"), event("stage.completed"), event("gate.opened")]);
    time.advance(900 / 3); // three times faster with a gate in the queue
    expect(seqs()).toHaveLength(2);
    time.advance(Math.round(1100 / 3));
    expect(seqs()).toHaveLength(3);
  });

  it("does not hurry the end of a stage because the next stage has a backlog", () => {
    const { time, pacer, seqs } = setup();
    const next = Array.from({ length: 36 }, () => event("synthesis.cluster", {}, "synthesize"));
    pacer.push([
      event("stage.started", {}, "read"),
      event("card.extracted", {}, "read"),
      event("stage.started", {}, "synthesize"),
      ...next,
    ]);
    time.advance(899);
    expect(seqs()).toHaveLength(1); // the read stage still gets its full 900 ms
    time.advance(1);
    expect(seqs()).toHaveLength(2);
  });

  it("shows everything at once while the page is hidden", () => {
    const { time, pacer, seqs } = setup();
    time.hide();
    pacer.push([event("stage.started"), event("card.extracted"), event("card.extracted")]);
    expect(seqs()).toHaveLength(3);
  });

  it("flushes the queue before history and stops after dispose", () => {
    const { time, pacer, seqs } = setup();
    const live = [event("stage.started"), event("card.extracted")];
    pacer.push(live);
    const later = event("run.status", { status: "paused" });
    pacer.now([later]);
    expect(seqs()).toEqual([...live, later].map((e) => e.seq));
    pacer.push([event("stage.started"), event("card.extracted")]);
    pacer.dispose();
    time.advance(5000);
    expect(seqs()).toHaveLength(4);
  });
});
