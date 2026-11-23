import { afterEach, describe, expect, it, vi } from "vitest";

import apiService from "@/lib/api/core";
import { fetchRuns, type StageRunItem } from "@/lib/api/services/fetch-runs";

import { REDO_BLOCKED, redoBlocked, redoExecution, startExecutionAgain } from "./redo-execution";

const stage = (status: string, extra: Partial<StageRunItem> = {}): StageRunItem => ({
  stage_run_id: `s-${status}`,
  stage_key: "execution",
  status,
  iteration: 1,
  created_at: "2026-11-01T10:00:00Z",
  ...extra,
});

afterEach(() => vi.restoreAllMocks());

describe("redoExecution", () => {
  it("sends a finished Execution back to itself, and starts a failed one again", () => {
    expect(redoExecution([stage("COMPLETED")])).toEqual({ how: "send_back", stageRunId: "s-COMPLETED" });
    expect(redoExecution([stage("ACCEPTED")])?.how).toBe("send_back");
    expect(redoExecution([stage("FAILED")])).toEqual({ how: "rerun", stageRunId: "s-FAILED" });
    expect(redoExecution([stage("STOPPED")])?.how).toBe("rerun");
  });

  it("offers nothing while Execution runs or when the run has none", () => {
    expect(redoExecution([stage("RUNNING")])).toBeNull();
    expect(redoExecution([stage("PENDING")])).toBeNull();
    expect(redoExecution([{ ...stage("COMPLETED"), stage_key: "writing" }])).toBeNull();
    expect(redoExecution(undefined)).toBeNull();
  });

  it("reads the newest attempt, not an earlier one", () => {
    const earlier = stage("FAILED", { stage_run_id: "old", created_at: "2026-11-01T09:00:00Z" });
    const newest = stage("COMPLETED", { stage_run_id: "new", created_at: "2026-11-01T11:00:00Z" });
    expect(redoExecution([newest, earlier])).toEqual({ how: "send_back", stageRunId: "new" });
    expect(redoExecution([earlier, { ...newest, status: "RUNNING" }])).toBeNull();
  });
});

describe("when the Platform would refuse", () => {
  const writing = (status: string, extra: Partial<StageRunItem> = {}) =>
    stage(status, { stage_key: "writing", stage_run_id: "w", created_at: "2026-11-01T12:00:00Z", ...extra });

  it("hides the redo while a later stage of the same iteration is pending or running", () => {
    for (const status of ["PENDING", "RUNNING"]) {
      const stages = [stage("COMPLETED"), writing(status)];
      expect(redoExecution(stages)).toBeNull();
      expect(redoBlocked(stages)).toBe(REDO_BLOCKED);
    }
  });

  it("allows it when the later stage finished or belongs to another iteration", () => {
    expect(redoBlocked([stage("COMPLETED"), writing("COMPLETED")])).toBeNull();
    expect(redoBlocked([stage("COMPLETED"), writing("RUNNING", { iteration: 2 })])).toBeNull();
    expect(redoExecution([stage("FAILED"), writing("FAILED")])?.how).toBe("rerun");
  });

  it("gives no reason while Execution itself is still running", () => {
    expect(redoBlocked([stage("RUNNING"), writing("PENDING")])).toBeNull();
  });
});

describe("running Execution again", () => {
  it("posts a send-back to the Execution stage with mode redo and no other change", async () => {
    const post = vi.spyOn(apiService, "post").mockResolvedValue({ data: { data: {} } } as never);
    await startExecutionAgain(
      { how: "send_back", stageRunId: "stage 1" },
      {
        sendStageBack: (id, target, note, mode) => fetchRuns.sendStageBack("p1", "r1", id, target, note, mode),
        rerunStage: (id, fresh) => fetchRuns.rerunStage("p1", "r1", id, fresh),
      },
    );
    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith("/projects/p1/runs/r1/stages/stage%201/send-back", {
      target_stage_key: "execution",
      note: "Run Execution again on the same locked plan.",
      mode: "redo",
    });
  });

  it("uses the rerun endpoint for a failed Execution", async () => {
    const post = vi.spyOn(apiService, "post").mockResolvedValue({ data: { data: {} } } as never);
    await startExecutionAgain(
      { how: "rerun", stageRunId: "s2" },
      {
        sendStageBack: (id, target, note, mode) => fetchRuns.sendStageBack("p1", "r1", id, target, note, mode),
        rerunStage: (id, fresh) => fetchRuns.rerunStage("p1", "r1", id, fresh),
      },
    );
    expect(post).toHaveBeenCalledWith("/projects/p1/runs/r1/stages/s2/rerun", { fresh: true });
  });
});
