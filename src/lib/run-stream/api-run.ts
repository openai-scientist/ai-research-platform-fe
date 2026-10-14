import { toast } from "sonner";

import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { subscribeRunEvents } from "@/lib/realtime/run-events";

import type { GateAnswer, RunCommands, RunEvent } from "./contract";
import { RunPacer } from "./pacer";
import { PipelineAdapter, type PipelineEnvelope, type PipelineRunInfo } from "./pipeline-adapter";

/**
 * What a hypotheses gate sends back to be revised: the reviewer's findings the person picked, as the engine sent them,
 * and the findings the person wrote, anchored to the set under review.
 */
export function revisionFindings(
  answer: GateAnswer,
  reviewed: Record<string, unknown>[],
  artifactId?: string,
): Record<string, unknown>[] {
  const picked = reviewed.filter((f) => answer.findings?.includes(String(f.finding_id)));
  const own = (answer.own ?? [])
    .filter((f) => f.issue.trim())
    .map((f, i) => ({
      finding_id: `you-${f.hypothesis}-${i + 1}`,
      anchor: {
        artifact_id: artifactId ?? null,
        locator: f.field ? `hypothesis:${f.hypothesis}/${f.field}` : `hypothesis:${f.hypothesis}`,
      },
      severity: f.severity,
      kind: f.kind,
      category: f.category,
      issue: f.issue.trim(),
      ...(f.suggestion?.trim() ? { suggestion: f.suggestion.trim() } : {}),
      author: "researcher",
      evidence_refs: [],
    }));
  const findings = [...picked.map((f) => ({ ...f, author: "researcher" })), ...own];
  if (!findings.length) throw new Error("Pick a finding or write a comment to send back.");
  return findings;
}

const showError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");

/**
 * A run on the backend. Reads its events, follows the live stream, and sends the person's answers and pauses.
 * The history shows at once; live events go through a pacer, because the engine sends parts of a stage in bursts.
 * A pipeline run's events go through an adapter first, which turns them into the events a Popper run sends.
 */
export class ApiRun implements RunCommands {
  private stop: (() => void) | null = null;
  private readonly pacer: RunPacer;
  private readonly adapter: PipelineAdapter | null;

  constructor(
    private readonly projectId: string,
    private readonly runId: string,
    receive: (events: RunEvent[]) => void,
    /** Set for a pipeline run: what it says about itself before its events. */
    pipeline?: PipelineRunInfo,
  ) {
    this.pacer = new RunPacer(receive);
    this.adapter = pipeline ? new PipelineAdapter(pipeline) : null;
  }

  private adapt(events: RunEvent[]) {
    const { adapter } = this;
    if (!adapter) return events;
    return events.flatMap((event) => adapter.convert(event as unknown as PipelineEnvelope));
  }

  /** `live` follows the stream; a finished run is only read. */
  start(live: boolean) {
    this.stop = subscribeRunEvents(
      this.projectId,
      this.runId,
      { after: 0, live },
      {
        onEvents: (events, origin) =>
          origin === "history" ? this.pacer.now(this.adapt(events)) : this.pacer.push(this.adapt(events)),
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
      if (this.adapter) await this.answerStage(this.adapter, gateId, answer);
      else await fetchRuns.answerGate(this.projectId, this.runId, gateId, answer);
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  }

  private async answerStage(adapter: PipelineAdapter, gateId: string, answer: GateAnswer) {
    const route = adapter.route(gateId);
    if (!route) throw new Error("This review stop is no longer open.");
    const note = answer.note?.trim();
    if (route.to === "accept") {
      const dropped = answer.dropped ?? [];
      await fetchRuns.acceptStage(this.projectId, this.runId, route.stageRunId, {
        selection: { hypothesis_ids: route.hypothesisIds.filter((id) => !dropped.includes(id)) },
        ...(note ? { note } : {}),
      });
      return;
    }
    if (route.kind === "artifact_review" && answer.option_id === "revise") {
      await fetchRuns.answerStageGate(this.projectId, this.runId, route.stageRunId, gateId, {
        action: "comment",
        findings: revisionFindings(answer, route.findings ?? [], route.artifactId),
        ...(note ? { text: note } : {}),
      });
      return;
    }
    const params = {
      ...(answer.dropped?.length ? { dropped: answer.dropped } : {}),
      ...(answer.kept?.length ? { kept: answer.kept } : {}),
    };
    await fetchRuns.answerStageGate(this.projectId, this.runId, route.stageRunId, gateId, {
      ...(route.kind === "artifact_review"
        ? { action: "approve" as const }
        : { action: "answer" as const, option_id: answer.option_id }),
      ...(note ? { text: note } : {}),
      ...(Object.keys(params).length ? { params } : {}),
    });
  }

  // The run's status changes when the backend's `run.status` event arrives, not here.
  pause() {
    fetchRuns.pause(this.projectId, this.runId).catch(showError);
  }

  resume() {
    fetchRuns.resume(this.projectId, this.runId).catch(showError);
  }
}
