"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";
import { AnimatePresence, MotionConfig } from "motion/react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { runTitle } from "@/lib/api/services/fetch-runs";
import { outcomePending } from "@/lib/run-stream/dataset-run-model";
import type { RunDisplayStatus } from "@/lib/run-stream/selectors";
import { RunStatus } from "@/types/enums";

import { stageLine } from "../dataset-stage-state";
import { LocalNodeWaitBanner, SupersededDatasetBanner } from "../run-studio/local-node-status";
import { RunHeader, StopRun } from "../run-studio/run-header";
import { DatasetNowCard, DatasetRunAside } from "./dataset-run-aside";
import { DatasetOutcomeSheet, DatasetQuestionSheet } from "./dataset-run-gate";
import { DatasetRunTrack } from "./dataset-run-track";
import { DatasetStageScene, useDatasetStagePresentation } from "./dataset-stage-scene";
import { useDatasetRun } from "./use-dataset-run";

const STATUS = {
  idle: "running",
  running: "running",
  waiting_review: "waiting",
  waiting_node: "paused",
  done: "completed",
  failed: "failed",
} as const;

/** The Dataset stage as a run, in the same frame as a Research run: top bar, steps, a scene and the agents' column. */
export function DatasetRunView({
  projectId,
  datasetId,
  runId,
}: {
  projectId: string;
  datasetId: string;
  runId: string;
}) {
  const { run, model } = useDatasetRun(projectId, runId);
  const [asideOpen, setAsideOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const line = stageLine(run);
  const runStatus = line === "failed" && run?.status === RunStatus.Stopped ? "stopped" : STATUS[line];
  const status: RunDisplayStatus = model.accepted ? "completed" : runStatus;
  const stage = useDatasetStagePresentation(projectId, datasetId, run, model, status);
  const label = run?.label ?? `RUN-${runId.slice(0, 4).toUpperCase()}`;
  const back = `/projects/${projectId}/datasets/${datasetId}`;
  const datasetName = stage?.name ?? "Dataset";
  const nodeWait = status === "paused" && (model.pauseReason ?? "runner_offline") === "runner_offline";

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label={`Dataset run ${label}`} className="fixed inset-0 z-50 flex flex-col bg-background">
        <RunHeader
          back={
            <Button variant="ghost" size="sm" asChild title="Leave the workspace. The run keeps going.">
              <Link href={back} className="max-w-[42vw] md:max-w-80" title={datasetName}>
                <ArrowLeft />
                <span className="min-w-0 truncate">{datasetName}</span>
              </Link>
            </Button>
          }
          label={label}
          question={run ? (runTitle(run) ?? "Dataset stage") : undefined}
          status={run ? status : undefined}
          mode={run ? (run.review_mode ?? "light") : undefined}
          asideOpen={asideOpen}
          onToggleAside={() => setAsideOpen((open) => !open)}
          actions={
            run && (
              <>
                {run.pipeline_key === "dataset_first" && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/projects/${encodeURIComponent(projectId)}/experiments?run=${encodeURIComponent(runId)}`}
                    >
                      Open in Run Studio
                    </Link>
                  </Button>
                )}
                {!stage?.ended && !model.published && (
                  <StopRun
                    projectId={projectId}
                    runId={runId}
                    label={label}
                    description="The running Dataset stage is cancelled. What finished stays."
                  />
                )}
              </>
            )
          }
        />

        {!run || !stage ? (
          <div className="p-6">
            <Skeleton className="h-40 w-full" aria-label="Loading the run" />
          </div>
        ) : (
          <>
            <DatasetRunTrack
              steps={stage.steps}
              ended={stage.ended}
              viewKey={focusKey}
              onView={setFocusKey}
              liveFill={Math.min(85, 30 + (model.progress?.seconds ?? 0))}
            />
            {nodeWait && <LocalNodeWaitBanner state={{ lifecycle: "paused", pauseReason: "runner_offline" }} />}
            <SupersededDatasetBanner
              state={{
                dataset_superseded: model.superseded ? true : undefined,
                superseded_by_version: model.superseded?.by,
              }}
            />
            <div className={`grid min-h-0 flex-1 grid-cols-1 ${asideOpen ? "lg:grid-cols-[minmax(0,1fr)_352px]" : ""}`}>
              <div className="relative flex min-h-0 min-w-0 flex-col">
                <div className="border-b px-4 py-2.5 lg:hidden">
                  <DatasetNowCard model={stage.model} steps={stage.steps} status={status} compact typing />
                  <Button variant="ghost" size="xs" className="mt-1.5" onClick={() => setDetailsOpen(true)}>
                    Steps and activity
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="px-4 pt-5 pb-24 md:px-8">
                    <DatasetStageScene
                      projectId={projectId}
                      datasetId={datasetId}
                      run={run}
                      stage={stage}
                      focusKey={focusKey}
                      onView={setFocusKey}
                    />
                  </div>
                </div>
                <AnimatePresence>
                  {model.gate && !stage.ended ? (
                    <DatasetQuestionSheet key={model.gate.id} gate={model.gate} />
                  ) : outcomePending(model) && model.outcome ? (
                    <DatasetOutcomeSheet outcome={model.outcome} projectId={projectId} runId={runId} />
                  ) : null}
                </AnimatePresence>
              </div>
              {asideOpen && (
                <aside className="min-h-0 border-l bg-sidebar max-lg:hidden">
                  <DatasetRunAside model={stage.model} steps={stage.steps} status={status} local={stage.local} typing />
                </aside>
              )}
            </div>
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
              <SheetContent side="bottom" className="p-0 data-[side=bottom]:h-[80dvh]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Steps and activity</SheetTitle>
                </SheetHeader>
                <DatasetRunAside model={stage.model} steps={stage.steps} status={status} local={stage.local} typing />
              </SheetContent>
            </Sheet>
          </>
        )}
      </section>
    </MotionConfig>
  );
}
