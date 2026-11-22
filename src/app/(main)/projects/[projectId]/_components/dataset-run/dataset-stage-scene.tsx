"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { ArrowRight, CircleCheck, HardDrive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDatasetDetailQuery, useDatasetVersionsQuery } from "@/hooks/use-datasets-query";
import { useLocalNodesQuery } from "@/hooks/use-local-nodes-query";
import { useRunLocalNodeReview } from "@/hooks/use-runs-query";
import { BRIEF_SCHEMA, DATA_CARD_SCHEMA, type DataCardVariable } from "@/lib/api/services/fetch-dataset-runs";
import { isLocalVersion } from "@/lib/api/services/fetch-datasets";
import { type RunItem, runTitle } from "@/lib/api/services/fetch-runs";
import {
  charterPending,
  DATASET_CAST,
  type DatasetRunModel,
  outcomePending,
  RELEASE_KEY,
  stepViews,
} from "@/lib/run-stream/dataset-run-model";
import type { RunDisplayStatus } from "@/lib/run-stream/selectors";

import { useDatasetBriefAvailability, useDatasetCard, useDatasetReviewFindings } from "../dataset-stage-hooks";
import { DATASET_STEPS, DatasetLiveCard } from "../run-studio/live-run/live-run-card";
import { Pane } from "../run-studio/scenes/scene-ui";
import { StageHeading, StageLineage } from "../run-studio/stage-heading";
import { DatasetCardPreview } from "./dataset-card-preview";
import { DatasetRunScene } from "./dataset-run-scene";
import type { DatasetWorkFacts } from "./dataset-work-scene";

/** Only the release hand-off runs on the Node; the PI, Steward and Reviewer work in Logos on released summaries. */
const runsOnNode = (step: { key: string }) => step.key === RELEASE_KEY;

const STAGE_STATUS = {
  running: "active",
  waiting: "waiting",
  paused: "paused",
  completed: "done",
  stopped: "ended",
  failed: "ended",
} as const;

export function useDatasetStagePresentation(
  projectId: string,
  datasetId: string,
  run: RunItem | undefined,
  model: DatasetRunModel | undefined,
  status: RunDisplayStatus,
  acceptGateOpen = false,
) {
  const stageRunId = run?.current_stage?.stage_key === "dataset" ? run.current_stage.stage_run_id : model?.stageRunId;
  const streamedReview = stageRunId ? model?.localNodeReviews?.[stageRunId] : undefined;
  const bootstrapReview = useRunLocalNodeReview(
    projectId,
    run,
    streamedReview === undefined && run?.current_stage?.stage_key === "dataset",
    false,
  );
  const dataset = useDatasetDetailQuery(projectId, datasetId).data?.data;
  const versions = useDatasetVersionsQuery(projectId, datasetId).data?.data;
  const latest = dataset?.latest_version ?? undefined;
  const versionId = run?.dataset_version_id;
  const version = versionId
    ? (versions?.find((v) => v.id === versionId) ?? (latest?.id === versionId ? latest : undefined))
    : latest;
  const local = isLocalVersion(version);
  const nodes = useLocalNodesQuery(local ? projectId : "").data?.data;
  const node = nodes?.find((n) => n.id === version?.runner_id);
  const cardExpected = Boolean(
    status === "completed" ||
      acceptGateOpen ||
      model?.readyToAccept ||
      model?.published ||
      model?.delivered.includes(DATA_CARD_SCHEMA),
  );
  const outputQuery = useDatasetCard(projectId, cardExpected ? run?.id : undefined, model?.dataCardArtifactId);
  const card = outputQuery.data;
  const briefFromStream = model?.delivered.includes(BRIEF_SCHEMA);
  const briefOnServer = useDatasetBriefAvailability(
    projectId,
    cardExpected && !briefFromStream ? run?.id : undefined,
  ).data;
  const findings = useDatasetReviewFindings(projectId, run?.id, model?.reviewResult?.artifactId).data;
  if (!model) return undefined;

  const ended = status === "completed" || status === "failed" || status === "stopped";
  const waitingForAccept = !ended && (acceptGateOpen || model.readyToAccept === true || outcomePending(model));
  const releasePending = streamedReview ?? (bootstrapReview || model.releaseWait);
  const releaseWait = releasePending && !ended && !model.published && !model.accepted;
  const shownModel =
    releaseWait === model.releaseWait && !acceptGateOpen
      ? model
      : { ...model, releaseWait, readyToAccept: acceptGateOpen || model.readyToAccept };
  const steps = stepViews(shownModel, {
    local: local || releaseWait,
    ended: status === "completed" ? "done" : ended ? "failed" : null,
  });
  const waiting =
    status === "waiting" || shownModel.releaseWait || model.gate !== null || charterPending(model) || waitingForAccept;
  const writes = [
    { id: DATA_CARD_SCHEMA, label: "Data card", step: "disclosure", available: Boolean(card) },
    { id: BRIEF_SCHEMA, label: "Dataset brief", step: "review", available: Boolean(briefOnServer) },
  ].map(({ id, label, step, available }) => ({
    id,
    label,
    done: Boolean(available) || model.delivered.includes(id),
    active: !ended && steps.some((item) => item.key === step && item.state === "now"),
  }));
  return {
    model: shownModel,
    steps,
    status,
    ended,
    local: local || releaseWait,
    version,
    node,
    name: dataset?.name ?? "Dataset",
    stageStatus: status === "running" && waiting ? "waiting" : STAGE_STATUS[status],
    writes,
    variables: card?.variables ?? version?.local_card?.variables,
    card,
    cardExpected,
    cardLoading: cardExpected && outputQuery.isPending,
    findings,
    waitingForAccept,
  } as const;
}

export type DatasetStage = NonNullable<ReturnType<typeof useDatasetStagePresentation>> & {
  partialProfile?: boolean;
  profileVariables?: DataCardVariable[];
  workFacts?: DatasetWorkFacts;
};

export function DatasetStageCard({
  stage,
  projectId,
  datasetId,
  runId,
}: {
  stage: Pick<DatasetStage, "card" | "cardLoading" | "model" | "version">;
  projectId?: string;
  datasetId?: string;
  runId?: string;
}) {
  return (
    <DatasetCardPreview
      card={stage.card}
      loading={stage.cardLoading}
      href={
        runId && projectId && datasetId
          ? `/projects/${projectId}/datasets/${datasetId}?view=card&run=${runId}`
          : undefined
      }
      fitness={stage.model.items.fitness}
      localNotes={stage.version?.local_card?.report.gaps}
    />
  );
}

export function DatasetStageScene({
  projectId,
  datasetId,
  run,
  runId,
  question,
  stage,
  focusKey,
  onView,
  studio = false,
  handoff = false,
  onContinueHandoff,
  hypothesisDemo = false,
  cardInGate = false,
  releaseAction,
}: {
  projectId?: string;
  datasetId?: string;
  run?: RunItem;
  runId?: string;
  question?: string | null;
  stage: DatasetStage;
  focusKey: string | null;
  onView(key: string | null): void;
  studio?: boolean;
  handoff?: boolean;
  onContinueHandoff?: () => void;
  hypothesisDemo?: boolean;
  cardInGate?: boolean;
  releaseAction?: ReactNode;
}) {
  const { model, steps, status, local, version, node, name, stageStatus, writes, variables, card } = stage;
  const accepted = status === "completed";
  const current = steps.find((step) => step.state === "now" || step.state === "asking");
  const viewingDisclosure = (focusKey ?? current?.key) === "disclosure";
  const viewingMockReview = Boolean(stage.workFacts?.cardReview && (focusKey ?? current?.key ?? "review") === "review");
  const workFacts: DatasetWorkFacts = {
    ...stage.workFacts,
    question: question ?? (run ? runTitle(run) : undefined) ?? stage.workFacts?.question,
    unit: card?.unit_of_observation ?? stage.workFacts?.unit,
    split: card?.split ?? stage.workFacts?.split,
    caveats: card?.caveats ?? stage.workFacts?.caveats,
  };
  const outcome =
    !cardInGate && !viewingMockReview && stage.cardExpected ? (
      <Pane title={accepted ? "Dataset stage accepted" : "Data card ready for review"}>
        <DatasetStageCard stage={stage} projectId={projectId} datasetId={datasetId} runId={runId ?? run?.id} />
      </Pane>
    ) : null;
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusKey) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scene.current?.querySelector("#dataset-focused-step")?.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }, [focusKey]);
  const shownStep = steps.find((step) => step.key === focusKey) ?? current;
  const liveRunId = runId ?? run?.id;
  const liveCard = Boolean(
    projectId &&
      liveRunId &&
      (status === "running" || status === "waiting") &&
      shownStep &&
      (DATASET_STEPS as readonly string[]).includes(shownStep.key),
  );
  return (
    <div ref={scene} className="flex flex-col gap-4">
      <StageHeading
        index={0}
        total={studio ? 5 : 1}
        title="Dataset"
        pipeline={[1]}
        purpose="Check the dataset and prepare the data card and brief for research."
        cast={DATASET_CAST}
        status={stageStatus}
      >
        <StageLineage reads={[version ? `${name} · v${version.version_number}` : name]} writes={writes} />
      </StageHeading>
      {handoff && (
        <section aria-label="Data card accepted" className="grid gap-2 border-y py-3">
          <h3 className="flex flex-wrap items-center gap-2 font-semibold text-sm">
            <CircleCheck className="size-4 text-emerald-600" />
            Data card accepted
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="max-w-prose text-muted-foreground text-sm">
              {hypothesisDemo ? (
                "Hypothesis replays a recorded information retrieval study in this workspace."
              ) : (
                <>
                  Hypothesis uses the accepted Data card
                  {card?.title && (
                    <>
                      {" "}
                      for <b>{card.title}</b>
                    </>
                  )}
                  , including its recorded limits.
                </>
              )}
            </p>
            {onContinueHandoff && (
              <Button type="button" size="sm" onClick={onContinueHandoff}>
                Open Hypothesis <ArrowRight data-icon="inline-end" />
              </Button>
            )}
          </div>
        </section>
      )}
      {studio && local && stageStatus === "active" && current && !focusKey && (
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <HardDrive className="size-4" />
          {runsOnNode(current) ? "Running on your Local Node" : "Running in Logos, from what the Node released"}
        </p>
      )}
      {/* A recorded step opens above the card, so its evidence is on the first screen. */}
      {studio && !viewingDisclosure && !focusKey && outcome}
      {liveCard && shownStep ? (
        <DatasetLiveCard
          projectId={projectId}
          runId={liveRunId}
          stepKey={current?.key ?? shownStep.key}
          focusKey={focusKey && shownStep !== current ? shownStep.key : null}
          onBack={() => onView(null)}
          live
        />
      ) : (
        <DatasetRunScene
          steps={steps}
          model={model}
          dataset={{ name }}
          version={version}
          local={local}
          focusKey={focusKey}
          live={status === "running"}
          onView={onView}
          variables={variables}
          node={node}
          showLocalProgress={local && stageStatus === "active"}
          findings={stage.findings}
          waitingForAccept={stage.waitingForAccept}
          releaseAction={releaseAction}
          partialProfile={stage.partialProfile}
          profileVariables={stage.profileVariables}
          workFacts={workFacts}
          cardPreview={
            (viewingDisclosure || viewingMockReview) && !cardInGate && card ? (
              <DatasetStageCard stage={stage} projectId={projectId} datasetId={datasetId} runId={runId ?? run?.id} />
            ) : undefined
          }
        />
      )}
      {(!studio || focusKey) && !viewingDisclosure && outcome}
    </div>
  );
}
