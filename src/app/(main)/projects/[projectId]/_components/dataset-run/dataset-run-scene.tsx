"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { FileSpreadsheet, HardDrive } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DataCardVariable, DatasetReviewFindings } from "@/lib/api/services/fetch-dataset-runs";
import type { DatasetVersionItem } from "@/lib/api/services/fetch-datasets";
import type { LocalNodeItem } from "@/lib/api/services/fetch-local-nodes";
import {
  activeAgent,
  type DatasetRunModel,
  PLAN_KEY,
  REVIEW_KEY,
  type StepView,
} from "@/lib/run-stream/dataset-run-model";

import { AnimatedNumber } from "../run-studio/animated-number";
import { DatasetColumnEvidence } from "./dataset-column-evidence";
import { DatasetHandOffReview } from "./dataset-hand-off-review";
import { SourceMethod } from "./dataset-method-evidence";
import { PlanDraftWorkbench } from "./dataset-plan-draft";
import { DatasetProfileBench } from "./dataset-profile-bench";
import { DatasetReleaseStatus } from "./dataset-run-gate";
import { StepVisual, splitClause } from "./dataset-run-visuals";
import { type DatasetWorkFacts, DatasetWorkScene, hasDatasetWorkScene } from "./dataset-work-scene";

/** Seconds the long computation has run: the engine's last count plus the time since it arrived. */
export function useElapsed(progress: DatasetRunModel["progress"]) {
  const [, setTick] = useState(0);
  const seen = useRef({ progress, at: Date.now() });
  if (seen.current.progress !== progress) seen.current = { progress, at: Date.now() };
  useEffect(() => {
    if (!progress) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [progress]);
  return progress ? progress.seconds + Math.floor((Date.now() - seen.current.at) / 1000) : null;
}

/** The scene of the Dataset stage: the step it is on, the checks around it, and the review. */
export function DatasetRunScene({
  steps,
  model,
  dataset,
  version,
  local,
  focusKey,
  live,
  onView,
  variables,
  node,
  showLocalProgress,
  findings,
  waitingForAccept,
  releaseAction,
  partialProfile,
  profileVariables,
  workFacts = {},
  cardPreview,
}: {
  steps: StepView[];
  model: DatasetRunModel;
  dataset: { name: string };
  version: DatasetVersionItem | undefined;
  local: boolean;
  focusKey: string | null;
  live: boolean;
  onView(key: string | null): void;
  variables?: DataCardVariable[];
  node?: LocalNodeItem;
  showLocalProgress?: boolean;
  findings?: DatasetReviewFindings;
  waitingForAccept?: boolean;
  releaseAction?: ReactNode;
  partialProfile?: boolean;
  profileVariables?: DataCardVariable[];
  workFacts?: DatasetWorkFacts;
  cardPreview?: ReactNode;
}) {
  const done = steps.filter((step) => step.state === "done").length;
  const current = steps.find((step) => step.state === "now" || step.state === "asking");
  const recordedReview = model.review ?? model.reviewResult;
  const reviewStep = steps.find((step) => step.key === REVIEW_KEY);
  const shown = steps.find((step) => step.key === focusKey) ?? current ?? (recordedReview ? reviewStep : undefined);
  const columnNames = version?.column_names ?? [];
  const hasColumns = Boolean(columnNames.length || variables?.length);
  const sectionContainsColumns =
    shown && ["sources", "table_model", "profile_quality", "disclosure"].includes(shown.key);
  const profiling = shown?.key === "profile_quality";
  const sourceEvidence =
    shown?.key === "sources" || shown?.key === "table_model" ? workFacts.sourceEvidence : undefined;
  const workScene =
    profiling ||
    Boolean(sourceEvidence) ||
    hasDatasetWorkScene(shown?.key) ||
    (shown?.key === REVIEW_KEY && Boolean(workFacts.cardReview));
  const reason = shown?.state === "done" ? undefined : shown?.reason;
  const file = version?.original_filename;
  const actor = live && shown === current && shown?.state === "now" ? activeAgent(model, false) : null;
  const cursorAgent = actor === "steward" || actor === "reviewer" ? actor : null;
  const releaseSelected = shown?.key === "release";
  const hasOperation = shown && shown === current && Boolean(model.message ?? model.progress);
  const showStepDetail =
    shown &&
    !releaseSelected &&
    !workScene &&
    (shown.key === REVIEW_KEY || Boolean(reason) || (!hasOperation && (!sectionContainsColumns || !hasColumns)));
  const releaseState = model.releaseWait ? "pending" : "upcoming";
  const activeColumn = reason?.split(/;\s*/).flatMap((clause) => splitClause(clause).columns)[0];
  return (
    <section aria-label="Dataset inspection" className="min-w-0 overflow-hidden rounded-xl border bg-background">
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <FileSpreadsheet aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="wrap-anywhere font-semibold text-sm">{file?.trim() ? file : dataset.name}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground text-xs">
              {version && <span className="font-mono">v{version.version_number}</span>}
              {local && (
                <span className="inline-flex items-center gap-1">
                  <HardDrive aria-hidden="true" className="size-3.5" />
                  Rows stay on the Local Node
                </span>
              )}
            </p>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <div>
            <dt className="text-muted-foreground">Rows</dt>
            <dd className="font-mono font-semibold text-sm tabular-nums">
              {version ? `${local ? "~" : ""}${version.row_count.toLocaleString("en-US")}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Columns</dt>
            <dd className="font-mono font-semibold text-sm tabular-nums">
              {version?.column_names.length ?? variables?.length ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{workFacts.cardReview || profileVariables ? "Steps" : "Checks"}</dt>
            <dd className="font-mono font-semibold text-sm tabular-nums">
              <AnimatedNumber value={done} />/{steps.length}
            </dd>
          </div>
        </dl>
      </header>

      <div id="dataset-focused-step">
        {releaseSelected && shown && (
          <div
            className={cn("border-t", releaseState !== "pending" || shown.state === "done" ? "px-4 py-3" : undefined)}
          >
            <DatasetReleaseStatus
              state={shown.state === "done" ? "reviewed" : releaseState}
              node={node}
              action={releaseAction}
            />
          </div>
        )}
        {!shown && (
          <p className="border-t px-4 py-3 text-muted-foreground text-sm">
            {model.progress?.text ??
              (showLocalProgress
                ? "Your Local Node is preparing the dataset checks."
                : "Waiting for the first check from the engine.")}
          </p>
        )}
        {focusKey && shown && shown !== current && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2">
            <span className="font-medium text-muted-foreground text-xs">Viewing · {shown.title}</span>
            {current && (
              <Button variant="ghost" size="xs" onClick={() => onView(null)}>
                Back to the current step
              </Button>
            )}
          </div>
        )}
      </div>

      {sourceEvidence && (
        <SourceMethod
          evidence={sourceEvidence}
          table={shown?.key === "table_model"}
          animate={live && shown === current}
        />
      )}

      {profiling && (
        <div className="border-t">
          <DatasetProfileBench
            columns={columnNames}
            variables={profileVariables ?? variables ?? []}
            active={activeColumn}
            working={live && shown === current && shown.state === "now"}
            local={local}
            agent={cursorAgent}
          />
        </div>
      )}

      {shown && workScene && !profiling && !sourceEvidence && (
        <DatasetWorkScene
          step={shown}
          steps={steps}
          columns={columnNames}
          variables={variables}
          facts={workFacts}
          active={activeColumn}
          agent={cursorAgent}
          live={live && shown === current}
          notes={shown.reason || (shown === current ? model.message?.text : undefined)}
          card={cardPreview}
          local={local}
          onInspect={onView}
        />
      )}

      {shown && showStepDetail && (
        <div className="border-t px-4 py-3 text-sm">
          {shown.key === REVIEW_KEY ? (
            <div className="grid gap-2">
              <h3 className="font-semibold">{shown.title}</h3>
              <DatasetHandOffReview
                model={model}
                findings={findings}
                waitingForAccept={Boolean(waitingForAccept)}
                reviewing={shown.state === "now"}
              />
            </div>
          ) : shown.key === PLAN_KEY && shown.state === "now" ? (
            <PlanDraftWorkbench live={live && shown === current} />
          ) : (
            <StepVisual
              step={shown}
              version={version}
              localWork={local && live && shown === current && shown.key !== PLAN_KEY}
            />
          )}
        </div>
      )}

      {hasColumns &&
        !profiling &&
        (!shown || releaseSelected || shown.key === "sources" || shown.key === "table_model") && (
          <div className="border-t">
            <DatasetColumnEvidence
              key={version?.id}
              columnNames={columnNames}
              variables={variables}
              reason={reason}
              agent={cursorAgent}
              partialProfile={partialProfile}
              local={local}
            />
          </div>
        )}
    </section>
  );
}
