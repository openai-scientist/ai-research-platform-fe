import { toast } from "sonner";

import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { subscribeRunEvents } from "@/lib/realtime/run-events";

import type { GateAnswer, RunCommands, RunEvent } from "./contract";

const showError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");

/**
 * A run on the backend. Reads its events, follows the live stream, and sends the person's answers and pauses.
 * The backend paces the stream, so events are shown as they arrive.
 */
export class ApiRun implements RunCommands {
  private stop: (() => void) | null = null;

  constructor(
    private readonly projectId: string,
    private readonly runId: string,
    private readonly receive: (events: RunEvent[]) => void,
  ) {}

  /** `live` follows the stream; a finished run is only read. */
  start(live: boolean) {
    this.stop = subscribeRunEvents(
      this.projectId,
      this.runId,
      { after: 0, live },
      {
        onEvents: this.receive,
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
