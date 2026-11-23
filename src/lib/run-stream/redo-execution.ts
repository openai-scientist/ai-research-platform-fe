import type { StageRunItem } from "@/lib/api/services/fetch-runs";

import { EXECUTION_STAGE } from "./execution";

/**
 * How to run Execution again, from the run's stage runs. A finished Execution is sent back to itself with `redo`
 * (the same locked plan, a new attempt); a failed or stopped one is started again by the rerun endpoint.
 */
export type RedoExecution = { how: "send_back" | "rerun"; stageRunId: string };

const FINISHED = new Set(["COMPLETED", "ACCEPTED", "FAILED", "STOPPED"]);

/** Said when Execution cannot start again because a later stage of the same iteration has begun. */
export const REDO_BLOCKED = "Writing has started; stop or finish it before running Execution again.";

/** What the Platform accepts: not while a later stage of the same iteration is pending or running. */
export function redoBlocked(stages: readonly StageRunItem[] | undefined): string | null {
  const latest = latestExecution(stages);
  if (!latest || !FINISHED.has(latest.status)) return null;
  const later = (stages ?? []).some(
    (stage) =>
      stage.stage_key !== EXECUTION_STAGE &&
      stage.iteration === latest.iteration &&
      stage.created_at >= latest.created_at &&
      (stage.status === "PENDING" || stage.status === "RUNNING"),
  );
  return later ? REDO_BLOCKED : null;
}

/** `null` while Execution is still running, or when the run has none. */
export function redoExecution(stages: readonly StageRunItem[] | undefined): RedoExecution | null {
  const latest = latestExecution(stages);
  if (!latest || redoBlocked(stages)) return null;
  if (latest.status === "COMPLETED" || latest.status === "ACCEPTED")
    return { how: "send_back", stageRunId: latest.stage_run_id };
  if (latest.status === "FAILED" || latest.status === "STOPPED")
    return { how: "rerun", stageRunId: latest.stage_run_id };
  return null;
}

function latestExecution(stages: readonly StageRunItem[] | undefined) {
  return (stages ?? [])
    .filter((stage) => stage.stage_key === EXECUTION_STAGE)
    .reduce<StageRunItem | undefined>(
      (best, stage) =>
        !best ||
        stage.iteration > best.iteration ||
        (stage.iteration === best.iteration && stage.created_at >= best.created_at)
          ? stage
          : best,
      undefined,
    );
}

const NOTE = "Run Execution again on the same locked plan.";

/** The one request a Redo makes; `api` is the API layer, so the choice of endpoint is testable. */
export function startExecutionAgain(
  plan: RedoExecution,
  api: {
    sendStageBack(stageRunId: string, target: string, note: string, mode: "redo"): Promise<unknown>;
    rerunStage(stageRunId: string, fresh: boolean): Promise<unknown>;
  },
) {
  if (plan.how === "send_back") return api.sendStageBack(plan.stageRunId, EXECUTION_STAGE, NOTE, "redo");
  return api.rerunStage(plan.stageRunId, true);
}
