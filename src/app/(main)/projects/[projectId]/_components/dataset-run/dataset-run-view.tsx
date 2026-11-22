"use client";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { runTitle } from "@/lib/api/services/fetch-runs";
import { outcomePending } from "@/lib/run-stream/dataset-run-model";
import type { RunDisplayStatus } from "@/lib/run-stream/selectors";
import { RunStatus } from "@/types/enums";

import { stageLine } from "../dataset-stage-state";
import { StopRun } from "../run-studio/run-header";
import { DatasetRunFrame } from "./dataset-run-frame";
import { DatasetOutcomeSheet, DatasetQuestionSheet } from "./dataset-run-gate";
import { useDatasetStagePresentation } from "./dataset-stage-scene";
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
  const line = stageLine(run);
  const runStatus = line === "failed" && run?.status === RunStatus.Stopped ? "stopped" : STATUS[line];
  const status: RunDisplayStatus = model.accepted ? "completed" : runStatus;
  const stage = useDatasetStagePresentation(projectId, datasetId, run, model, status);
  const label = run?.label ?? `RUN-${runId.slice(0, 4).toUpperCase()}`;
  const back = `/projects/${projectId}/datasets/${datasetId}`;
  const datasetName = stage?.name ?? "Dataset";

  let overlay: React.ReactNode;
  if (model.gate && !stage?.ended) {
    overlay = <DatasetQuestionSheet key={model.gate.id} gate={model.gate} />;
  } else if (outcomePending(model) && model.outcome) {
    overlay = <DatasetOutcomeSheet outcome={model.outcome} projectId={projectId} runId={runId} />;
  }

  return (
    <DatasetRunFrame
      stage={run ? stage : undefined}
      label={label}
      back={
        <Button variant="ghost" size="sm" asChild title="Leave the workspace. The run keeps going.">
          <Link href={back} className="max-w-[42vw] md:max-w-80" title={datasetName}>
            <ArrowLeft />
            <span className="min-w-0 truncate">{datasetName}</span>
          </Link>
        </Button>
      }
      question={run ? (runTitle(run) ?? "Dataset stage") : undefined}
      status={run ? (status === "running" && stage?.model.releaseWait ? "waiting" : status) : undefined}
      mode={run ? (run.review_mode ?? "light") : undefined}
      projectId={projectId}
      datasetId={datasetId}
      runId={run?.id}
      selectionKey={runId}
      actions={
        run && (
          <>
            {run.pipeline_key === "dataset_first" && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${encodeURIComponent(projectId)}/experiments?run=${encodeURIComponent(runId)}`}>
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
      overlay={overlay}
    />
  );
}
