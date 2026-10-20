import { z } from "zod";

import { getApiBaseUrl } from "@/lib/api/config";
import { runPath } from "@/lib/api/request";
import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import type { RunEvent } from "@/lib/run-stream/contract";
import { ApiError } from "@/types/api";

const PAGE = 500;

// Only the envelope is checked here. The backend validates every payload against the contract before storing it.
const envelopeSchema = z.object({
  seq: z.number().int().positive(),
  run_id: z.string(),
  ts: z.string(),
  type: z.string(),
  stage_key: z.string().nullish(),
  actor: z.string().nullish(),
  payload: z.record(z.string(), z.unknown()),
  // Pipeline runs: the stage run, the engine's step and phase the event belongs to.
  stage_run_id: z.string().nullish(),
  step_key: z.string().nullish(),
  phase: z.string().nullish(),
});

/** Reads one stored event. Returns null when it is not a run event. */
export function parseRunEvent(value: unknown): RunEvent | null {
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success) return null;
  const { stage_key, actor, stage_run_id, step_key, phase, ...rest } = parsed.data;
  return {
    ...rest,
    ...(stage_key ? { stage_key } : {}),
    ...(actor ? { actor } : {}),
    ...(stage_run_id ? { stage_run_id } : {}),
    ...(step_key ? { step_key } : {}),
    ...(phase ? { phase } : {}),
  } as RunEvent;
}

/** `history`: already stored when the page opened. `live`: happened while following (or while reconnecting). */
export type RunEventOrigin = "history" | "live";

interface RunEventHandlers {
  /** New events in `seq` order. An event is never delivered twice. */
  onEvents: (events: RunEvent[], origin: RunEventOrigin) => void;
  /** The run finished and every event was delivered. */
  onEnded: () => void;
  onSessionEnded: (code: string) => void;
  onError: (error: Error) => void;
}

/**
 * Follows a run: reads every stored event after `after`, then streams new ones while the run is `live`.
 * After a dropped connection it reads what it missed and reconnects.
 */
export function subscribeRunEvents(
  projectId: string,
  runId: string,
  options: { after: number; live: boolean },
  handlers: RunEventHandlers,
) {
  let source: EventSource | null = null;
  let disposed = false;
  let syncing = false;
  let lastSeq = options.after;
  let attempt = 0;
  // Until the stream has been open once, what the backend returns is the run's history.
  let followed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  const stop = () => {
    disposed = true;
    controller.abort();
    clearTimeout(timer);
    source?.close();
    source = null;
  };
  const deliver = (events: RunEvent[], origin: RunEventOrigin) => {
    const fresh = events.filter((event) => event.seq > lastSeq);
    if (!fresh.length) return;
    lastSeq = fresh[fresh.length - 1].seq;
    handlers.onEvents(fresh, origin);
  };
  const catchUp = async () => {
    for (;;) {
      const page = await fetchRuns.getEvents(projectId, runId, { after: lastSeq, limit: PAGE }, controller.signal);
      if (disposed) return;
      const events = page.data.map(parseRunEvent);
      if (events.some((event) => event === null)) throw new Error("Unable to read the run's progress.");
      deliver(events as RunEvent[], followed ? "live" : "history");
      if (page.data.length < PAGE) return;
    }
  };
  const retry = (seconds?: number) => {
    source?.close();
    source = null;
    clearTimeout(timer);
    const delay = seconds ?? [1, 2, 5, 10, 30][Math.min(attempt++, 4)];
    timer = setTimeout(() => void sync(), delay * 1000);
  };
  // Reads what was missed, then connects the stream. Errors that cannot heal end the subscription.
  const sync = async () => {
    if (disposed || syncing) return;
    syncing = true;
    try {
      await catchUp();
      if (!disposed && options.live) connect();
    } catch (error) {
      if (disposed) return;
      if (error instanceof ApiError && SESSION_INVALID_CODES.includes(error.code)) {
        stop();
        handlers.onSessionEnded(error.code);
      } else if (error instanceof ApiError && [403, 404].includes(error.status)) {
        stop();
        handlers.onError(error);
      } else {
        // Only the first failure is reported; the retries after it stay quiet.
        if (attempt === 0) handlers.onError(error instanceof Error ? error : new Error("Lost the run's progress."));
        retry(error instanceof ApiError && error.code === "RATE_LIMITED" ? (error.retryAfter ?? 60) : undefined);
      }
    } finally {
      syncing = false;
    }
  };
  const connect = () => {
    const url = new URL(`${getApiBaseUrl()}${runPath(projectId, runId)}/events/stream`, window.location.origin);
    url.searchParams.set("after", String(lastSeq));
    const current = new EventSource(url.href, { withCredentials: true });
    source = current;
    current.onopen = () => {
      if (source !== current) return;
      attempt = 0;
      followed = true;
    };
    current.addEventListener("run-event", (message) => {
      if (disposed || source !== current) return;
      let event: RunEvent | null = null;
      try {
        event = parseRunEvent(JSON.parse((message as MessageEvent<string>).data));
      } catch {
        event = null;
      }
      // Events the stream replays before it opened are still the history.
      if (event) deliver([event], followed ? "live" : "history");
      else {
        handlers.onError(new Error("Unable to read the run's progress. Reconnecting."));
        retry();
      }
    });
    current.addEventListener("run-ended", () => {
      if (disposed || source !== current) return;
      stop();
      handlers.onEnded();
    });
    current.addEventListener("session-ended", (message) => {
      if (disposed || source !== current) return;
      let code = "UNAUTHENTICATED";
      try {
        code = z.object({ code: z.string() }).parse(JSON.parse((message as MessageEvent<string>).data)).code;
      } catch {
        /* Closing is still right when the reason can't be read. */
      }
      stop();
      handlers.onSessionEnded(code);
    });
    // The browser would retry on its own, but a stream refused with 401 or 404 never comes back.
    // Reading the missed events tells the two apart and fills the gap either way.
    current.onerror = () => {
      if (disposed || source !== current) return;
      retry();
    };
  };
  void sync();
  return stop;
}
