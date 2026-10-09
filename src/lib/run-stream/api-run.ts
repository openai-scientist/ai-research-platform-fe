import { toast } from "sonner";

import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { subscribeRunEvents } from "@/lib/realtime/run-events";

import type { GateAnswer, RunCommands, RunEvent } from "./contract";
import { RunPacer } from "./pacer";

const showError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");

/**
 * A run on the backend. Reads its events, follows the live stream, and sends the person's answers and pauses.
 * The history shows at once; live events go through a pacer, because the engine sends parts of a stage in bursts.
 */
export class ApiRun implements RunCommands {
  private stop: (() => void) | null = null;
  private readonly pacer: RunPacer;

  constructor(
    private readonly projectId: string,
    private readonly runId: string,
    receive: (events: RunEvent[]) => void,
  ) {
    this.pacer = new RunPacer(receive);
  }

  /** `live` follows the stream; a finished run is only read. */
  start(live: boolean) {
    this.stop = subscribeRunEvents(
      this.projectId,
      this.runId,
      { after: 0, live },
      {
        onEvents: (events, origin) => (origin === "history" ? this.pacer.now(events) : this.pacer.push(events)),
        onEnded: () => {
          // Nothing to do: the last events have already marked the run as finished.
        },
        onSessionEnded: () => window.dispatchEvent(new Event("auth:expired")),
        onError: showError,
      },
    );
  }

  dispose() {
    this.stop?.();
    this.stop = null;
    this.pacer.dispose();
  }

  async answerGate(gateId: string, answer: GateAnswer) {
    try {
      await fetchRuns.answerGate(this.projectId, this.runId, gateId, answer);
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  }

  // The run's status changes when the backend's `run.status` event arrives, not here.
  pause() {
    fetchRuns.pause(this.projectId, this.runId).catch(showError);
  }

  resume() {
    fetchRuns.resume(this.projectId, this.runId).catch(showError);
  }
}
