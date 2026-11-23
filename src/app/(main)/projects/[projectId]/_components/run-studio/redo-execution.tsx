"use client";

import { useState } from "react";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useProjectDetailQuery } from "@/hooks/use-projects-query";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { getProjectAccess } from "@/lib/auth/project-access";
import { type RedoExecution, redoBlocked, redoExecution, startExecutionAgain } from "@/lib/run-stream/redo-execution";
import { useRunStudio } from "@/lib/run-stream/run-store";

import { perform } from "../workspace-ui";

/** Why Execution cannot be sent back or run again now, or `null`. */
export function useRedoBlocked(projectId: string, runId: string) {
  const stages = useApiQuery(
    [...projectKeys.run(projectId, runId), "stages"],
    (signal) => fetchRuns.listStages(projectId, runId, signal),
    { enabled: Boolean(projectId && runId) },
  );
  return redoBlocked(stages.data?.data);
}

/** Run Execution again, from a finished or failed Execution. Says what happens before it does anything. */
export function RedoExecutionAction({ projectId, runId }: { projectId: string; runId: string }) {
  const stagesKey = [...projectKeys.run(projectId, runId), "stages"];
  const stages = useApiQuery(stagesKey, (signal) => fetchRuns.listStages(projectId, runId, signal), {
    enabled: Boolean(projectId && runId),
  });
  const project = useProjectDetailQuery(projectId).data?.data;
  const follow = useRunStudio((s) => s.follow);
  const redo = useApiMutation(
    (plan: RedoExecution) =>
      startExecutionAgain(plan, {
        sendStageBack: (id, target, note, mode) => fetchRuns.sendStageBack(projectId, runId, id, target, note, mode),
        rerunStage: (id, fresh) => fetchRuns.rerunStage(projectId, runId, id, fresh),
      }),
    [projectKeys.run(projectId, runId), stagesKey],
  );
  const plan = redoExecution(stages.data?.data);
  const blocked = redoBlocked(stages.data?.data);
  return (
    <RedoExecutionView
      plan={plan}
      blocked={blocked}
      canWrite={Boolean(project && getProjectAccess(project.my_role, project.status).canWrite)}
      pending={redo.isPending}
      onConfirm={() => {
        if (!plan) return;
        void perform(async () => {
          await redo.mutateAsync(plan);
          follow(runId);
        }, "Execution started again.");
      }}
    />
  );
}

export function RedoExecutionView({
  plan,
  blocked = null,
  canWrite,
  pending,
  onConfirm,
  initiallyAsking = false,
}: {
  plan: RedoExecution | null;
  /** Why it cannot start now, when a finished Execution is there but the Platform would refuse. */
  blocked?: string | null;
  canWrite: boolean;
  pending: boolean;
  onConfirm: () => void;
  initiallyAsking?: boolean;
}) {
  const [asking, setAsking] = useState(initiallyAsking);
  if (!canWrite) return null;
  if (blocked)
    return (
      <div className="grid gap-1">
        <Button variant="outline" size="sm" disabled aria-describedby="redo-blocked" className="w-fit">
          <RotateCcw data-icon="inline-start" /> Run Execution again
        </Button>
        <p id="redo-blocked" className="text-muted-foreground text-xs">
          {blocked}
        </p>
      </div>
    );
  if (!plan) return null;
  if (!asking)
    return (
      <div>
        <Button variant="outline" size="sm" onClick={() => setAsking(true)}>
          <RotateCcw data-icon="inline-start" /> Run Execution again
        </Button>
      </div>
    );
  return (
    <section aria-label="Run Execution again" className="grid gap-3 rounded-lg border bg-card p-4 text-sm">
      <b className="font-semibold">Run Execution again?</b>
      <ul className="grid list-disc gap-1 pl-5 text-muted-foreground">
        <li>A new Execution attempt starts on the same locked analysis plan. The plan is not changed.</li>
        <li>Earlier results stay in the run's history.</li>
        <li>It runs on your Local Node again and uses the Local Node budget again.</li>
      </ul>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setAsking(false)}>
          Keep current results
        </Button>
        <Button size="sm" disabled={pending} onClick={onConfirm}>
          <RotateCcw data-icon="inline-start" /> {pending ? "Starting…" : "Run Execution again"}
        </Button>
      </div>
    </section>
  );
}
