import type { RunEvent } from "./contract";

/**
 * Time to look at an event before the next one shows, at normal speed. Steps and stages get room to
 * breathe, results get time to be read, and bookkeeping shows at once.
 */
function beat(event: RunEvent): number {
  switch (event.type) {
    case "stage.started":
      return 900;
    case "stage.completed":
      return 1100;
    case "step.started":
      return 300;
    case "step.completed":
      return 500;
    case "agent.message": {
      const { text = "", done } = event.payload as { text?: string; done?: boolean };
      return Math.min(done ? 1600 : 900, (done ? 300 : 200) + text.length * (done ? 12 : 8));
    }
    // Each is typed out as it arrives: the next waits until most of it is read.
    case "scope.goal":
      return 800;
    case "problem.subquestion":
      return 1300;
    // Typed out one at a time, at 220 characters a second.
    case "review.finding":
      return 1000;
    case "search.strategy":
    case "screen.kept":
    case "card.extracted":
    case "synthesis.cluster":
    case "synthesis.tension":
    case "synthesis.gap":
    case "synthesis.overview":
    case "debate.turn":
    case "hypothesis.drafted":
    case "map.node":
    case "canvas.piece":
      return 450;
    case "run.started":
    case "run.plan":
    case "run.status":
    case "run.completed":
    case "gate.opened":
    case "gate.resolved":
    case "rule.checked":
      return 0;
    default:
      return 160;
  }
}

/** Events that come in bulk and show a handful at a time, up to this many. */
const BULK: Partial<Record<RunEvent["type"], { group: string; size: number }>> = {
  "screen.rejected": { group: "rejected", size: 8 },
  "screen.scored": { group: "scored", size: 3 },
  "literature.request": { group: "literature", size: 6 },
  "literature.batch": { group: "literature", size: 6 },
};
const BULK_BEAT = 120;

/** Events the person is waiting for (a review stop, the end, the effect of Pause): everything before them hurries. */
const URGENT = new Set<RunEvent["type"]>(["gate.opened", "run.completed", "run.status"]);

/** Never fall further behind the run than this, in milliseconds. */
const MAX_LAG = 8000;

interface Clock {
  now(): number;
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  /** True while nobody can see the page; there is nothing to animate then. */
  hidden(): boolean;
}

const browserClock: Clock = {
  now: () => Date.now(),
  setTimeout: (run, ms) => setTimeout(run, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  hidden: () => typeof document !== "undefined" && document.visibilityState === "hidden",
};

/**
 * Shows a live run's events at a pace a person can follow. The engine finishes parts of a stage in
 * bursts (a batch of scores, several cards at once); the pacer releases them one beat at a time, in
 * order, and speeds up as a backlog grows so the screen never trails the run by more than a few seconds.
 */
export class RunPacer {
  private queue: { event: RunEvent; at: number }[] = [];
  private timer: unknown = null;
  private disposed = false;

  constructor(
    private readonly show: (events: RunEvent[]) => void,
    private readonly clock: Clock = browserClock,
  ) {}

  /** Shows events at once: a run's history, read when the page opens. */
  now(events: RunEvent[]) {
    if (this.disposed) return;
    this.flush();
    if (events.length) this.show(events);
  }

  /** Queues events that just happened. */
  push(events: RunEvent[]) {
    if (this.disposed || !events.length) return;
    const at = this.clock.now();
    for (const event of events) this.queue.push({ event, at });
    if (this.timer === null) this.tick();
  }

  /** Shows everything still queued. */
  flush() {
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.timer = null;
    const events = this.queue.map((q) => q.event);
    this.queue = [];
    if (events.length) this.show(events);
  }

  dispose() {
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.timer = null;
    this.queue = [];
    this.disposed = true;
  }

  private tick = () => {
    this.timer = null;
    if (this.disposed || !this.queue.length) return;
    if (this.clock.hidden()) {
      this.flush();
      return;
    }
    const batch = this.take();
    this.show(batch);
    if (!this.queue.length) return;
    const last = batch[batch.length - 1];
    const wait = BULK[last.type] && batch.length > 1 ? BULK_BEAT : beat(last);
    this.timer = this.clock.setTimeout(this.tick, Math.round(wait / this.speed()));
  };

  /** The next event, or the next handful of one bulk kind. */
  private take(): RunEvent[] {
    const first = this.queue.shift();
    if (!first) return [];
    const batch = [first.event];
    const bulk = BULK[first.event.type];
    if (!bulk) return batch;
    while (batch.length < bulk.size) {
      const next = this.queue[0]?.event;
      if (!next || BULK[next.type]?.group !== bulk.group || next.stage_key !== first.event.stage_key) break;
      batch.push(next);
      this.queue.shift();
    }
    return batch;
  }

  /**
   * How much faster than normal to go: more with a longer queue or an older first event. Only this stage's queue
   * counts as backlog: the next stage's events wait their turn, so a stage still ends at a pace a person can follow.
   */
  private speed() {
    const next = this.queue.findIndex((q) => q.event.type === "stage.started");
    const backlog = Math.max(1, (next === -1 ? this.queue.length : next) / 12);
    const lag = this.clock.now() - (this.queue[0]?.at ?? this.clock.now());
    const behind = lag > MAX_LAG / 2 ? lag / (MAX_LAG / 2) : 1;
    const urgent = this.queue.some((q) => URGENT.has(q.event.type)) ? 3 : 1;
    return Math.max(backlog, behind, urgent);
  }
}
