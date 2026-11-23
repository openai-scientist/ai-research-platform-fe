import { toast } from "sonner";

import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { subscribeRunEvents } from "@/lib/realtime/run-events";
import { RunStatus } from "@/types/enums";

import type { GateAnswer, RunCommands, RunEvent } from "./contract";
import { loadPublishedDesign } from "./experiment-design";
import { RunPacer } from "./pacer";
import { PipelineAdapter, type PipelineEnvelope, type PipelineRunInfo } from "./pipeline-adapter";
import { loadPublishedHypotheses, type PublicationRef } from "./published-hypotheses";

/** How a finished run ended, by its status. */
const ENDED = new Map<RunStatus, "completed" | "failed" | "stopped">([
  [RunStatus.Completed, "completed"],
  [RunStatus.Failed, "failed"],
  [RunStatus.BudgetExceeded, "failed"],
  [RunStatus.Stopped, "stopped"],
]);

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
        locator: f.field ? `item:${f.hypothesis}/${f.field}` : `item:${f.hypothesis}`,
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
  /** Set by the first live event: from then on, what arrives is happening now rather than history. */
  private following = false;
  /** The last stored event read, so the stream can be picked up again after it. */
  private lastSeq = 0;
  private readonly artifactRequest = new AbortController();
  private readonly publications = new WeakSet<PublicationRef>();

  constructor(
    private readonly projectId: string,
    private readonly runId: string,
    receive: (events: RunEvent[], live: boolean) => void,
    /** Set for a pipeline run: what it says about itself before its events. */
    pipeline?: PipelineRunInfo,
    private readonly receiveEnvelopes?: (events: PipelineEnvelope[], live: boolean) => void,
  ) {
    this.pacer = new RunPacer((events) => receive(events, this.following));
    this.adapter = pipeline ? new PipelineAdapter(pipeline) : null;
  }

  private adapt(events: RunEvent[]) {
    const { adapter } = this;
    if (!adapter) return events;
    return events.flatMap((event) => adapter.convert(event as unknown as PipelineEnvelope));
  }

  /** `live` follows the stream; a finished run is only read. */
  start(live: boolean) {
    this.subscribe(0, live);
  }

  /** Follows the live stream again from the last event read: a run that ended goes on after a rerun or a raise. */
  follow() {
    this.stop?.();
    this.subscribe(this.lastSeq, true);
  }

  private subscribe(after: number, live: boolean) {
    this.stop = subscribeRunEvents(
      this.projectId,
      this.runId,
      { after, live },
      {
        onEvents: (events, origin) => {
          this.lastSeq = events[events.length - 1]?.seq ?? this.lastSeq;
          this.receiveEnvelopes?.(events as unknown as PipelineEnvelope[], origin === "live");
          const adapted = this.adapt(events);
          if (origin === "history") {
            this.pacer.now(adapted);
          } else {
            this.following = true;
            this.pacer.push(adapted);
          }
          this.hydratePublication();
          this.hydrateDesign();
        },
        onEnded: () => void this.settle(),
        onSessionEnded: () => window.dispatchEvent(new Event("auth:expired")),
        onError: showError,
      },
    );
  }

  private hydratePublication() {
    const adapter = this.adapter;
    const ref = adapter?.publicationToLoad();
    if (!adapter || !ref || this.publications.has(ref)) return;
    this.publications.add(ref);
    const { signal } = this.artifactRequest;
    void loadPublishedHypotheses(this.projectId, this.runId, ref, signal).then(
      (result) => {
        if (!signal.aborted) this.pacer.now(adapter.applyPublication(ref, result));
      },
      (error) => {
        if (signal.aborted) return;
        this.pacer.now(adapter.applyPublication(ref));
        showError(error);
      },
    );
  }

  private hydrateDesign() {
    const adapter = this.adapter;
    const ref = adapter?.designToLoad();
    if (!adapter || !ref || this.publications.has(ref)) return;
    this.publications.add(ref);
    const { signal } = this.artifactRequest;
    void loadPublishedDesign(this.projectId, this.runId, ref, signal).then(
      (publication) => {
        if (!signal.aborted) this.pacer.now(adapter.applyDesign(ref, publication));
      },
      (error) => {
        if (!signal.aborted) showError(error);
      },
    );
  }

  /** Every event has been read. A Popper run's last events say how it ended; a pipeline run's may not, so it is asked. */
  private async settle() {
    const { adapter } = this;
    if (!adapter) return;
    try {
      const run = (await fetchRuns.getById(this.projectId, this.runId)).data;
      const ended = ENDED.get(run.status);
      if (!ended) return;
      // Behind any live events still being shown.
      this.pacer.push(adapter.end(ended, run.failure_message));
    } catch {
      // The run keeps what its events said; opening it again asks again.
    }
  }

  dispose() {
    this.artifactRequest.abort();
    this.stop?.();
    this.stop = null;
    this.pacer.dispose();
  }

  async answerGate(gateId: string, answer: GateAnswer) {
    try {
      const route = this.adapter?.route(gateId);
      if (this.adapter) {
        await this.answerStage(this.adapter, gateId, answer);
        if (route?.to === "gate" && route.kind === "question") {
          this.following = true;
          this.pacer.now(this.adapter.acknowledgeGate(gateId, answer));
        }
      } else await fetchRuns.answerGate(this.projectId, this.runId, gateId, answer);
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
    if (route.to === "charter") {
      if (answer.option_id === "retry")
        await fetchRuns.retryConsultation(this.projectId, this.runId, route.consultationId);
      else if (answer.charter) await fetchRuns.putCharter(this.projectId, this.runId, answer.charter, note);
      else await fetchRuns.endorseConsultation(this.projectId, this.runId, route.consultationId, note);
      return;
    }
    if (route.to === "accept") {
      if (answer.option_id === "send_back" && route.stageKey) {
        await fetchRuns.sendStageBack(this.projectId, this.runId, route.stageRunId, route.stageKey, note);
        return;
      }
      const dropped = answer.dropped ?? [];
      const selected = route.hypothesisIds?.filter((id) => !dropped.includes(id));
      if (selected && !selected.length) throw new Error("Select at least one hypothesis.");
      await fetchRuns.acceptStage(this.projectId, this.runId, route.stageRunId, {
        selection: selected ? { hypothesis_ids: selected } : {},
        ...(note ? { note } : {}),
      });
      return;
    }
    if (route.kind === "artifact_review" && answer.option_id === "revise") {
      await fetchRuns.answerStageGate(this.projectId, this.runId, route.stageRunId, route.engineGateId ?? gateId, {
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
    await fetchRuns.answerStageGate(this.projectId, this.runId, route.stageRunId, route.engineGateId ?? gateId, {
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
