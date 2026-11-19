"use client";

import { useEffect, useRef } from "react";

import { ArrowRight, CircleCheck, HardDrive } from "lucide-react";

import { useDatasetDetailQuery, useDatasetVersionsQuery } from "@/hooks/use-datasets-query";
import { useLocalNodesQuery } from "@/hooks/use-local-nodes-query";
import { BRIEF_SCHEMA, DATA_CARD_SCHEMA } from "@/lib/api/services/fetch-dataset-runs";
import { isLocalVersion } from "@/lib/api/services/fetch-datasets";
import type { RunItem } from "@/lib/api/services/fetch-runs";
import {
  charterPending,
  DATASET_CAST,
  type DatasetRunModel,
  outcomePending,
  stepViews,
} from "@/lib/run-stream/dataset-run-model";
import type { RunDisplayStatus } from "@/lib/run-stream/selectors";

import { useDatasetBriefAvailability, useDatasetCard, useDatasetReviewFindings } from "../dataset-stage-hooks";
import { Pane } from "../run-studio/scenes/scene-ui";
import { StageHeading, StageLineage } from "../run-studio/stage-heading";
import { DatasetCardPreview } from "./dataset-card-preview";
import { ReleaseCard } from "./dataset-run-gate";
import { DatasetRunScene } from "./dataset-run-scene";

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
  const dataset = useDatasetDetailQuery(projectId, datasetId).data?.data;
  const versions = useDatasetVersionsQuery(projectId, datasetId).data?.data;
  const latest = dataset?.latest_version ?? undefined;
  const versionId = run?.dataset_version_id;
  const version = versionId
    ? (versions?.find((v) => v.id === versionId) ?? (latest?.id === versionId ? latest : undefined))
    : latest;
  const local = isLocalVersion(version);
  const nodes = useLocalNodesQuery(local ? projectId : "").data?.data;
  const node = nodes?.find((n) => n.id === version?.runner_id) ?? nodes?.[0];
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
  const nodePending = nodes?.some((n) => n.pending_reviews > 0 && (!version?.runner_id || n.id === version.runner_id));
  const releaseWait = Boolean(
    local &&
      !ended &&
      !model.published &&
      !model.accepted &&
      (model.releaseWait || (!model.gate && status === "running" && nodePending)),
  );
  const shownModel =
    releaseWait === model.releaseWait && !acceptGateOpen
      ? model
      : { ...model, releaseWait, readyToAccept: acceptGateOpen || model.readyToAccept };
  const steps = stepViews(shownModel, { local, ended: status === "completed" ? "done" : ended ? "failed" : null });
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
    local,
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

type DatasetStage = NonNullable<ReturnType<typeof useDatasetStagePresentation>>;

export function DatasetStageCard({
  stage,
  projectId,
  datasetId,
  runId,
}: {
  stage: Pick<DatasetStage, "card" | "cardLoading" | "model" | "version">;
  projectId: string;
  datasetId: string;
  runId?: string;
}) {
  return (
    <DatasetCardPreview
      card={stage.card}
      loading={stage.cardLoading}
      href={runId && datasetId ? `/projects/${projectId}/datasets/${datasetId}?view=card&run=${runId}` : undefined}
      fitness={stage.model.items.fitness}
      localNotes={stage.version?.local_card?.report.gaps}
    />
  );
}

export function DatasetStageScene({
  projectId,
  datasetId,
  run,
  stage,
  focusKey,
  onView,
  studio = false,
  handoff = false,
  cardInGate = false,
}: {
  projectId: string;
  datasetId: string;
  run?: RunItem;
  stage: DatasetStage;
  focusKey: string | null;
  onView(key: string | null): void;
  studio?: boolean;
  handoff?: boolean;
  cardInGate?: boolean;
}) {
  const { model, steps, status, ended, local, version, node, name, stageStatus, writes, variables, card } = stage;
  const accepted = status === "completed";
  const outcome =
    !cardInGate && stage.cardExpected ? (
      <Pane title={accepted ? "Dataset stage accepted" : "Data card ready for review"}>
        <DatasetStageCard stage={stage} projectId={projectId} datasetId={datasetId} runId={run?.id} />
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
        <Pane
          title={
            <span className="flex flex-wrap items-center gap-2">
              <CircleCheck className="size-4 text-emerald-600" />
              Data card accepted
              <ArrowRight className="size-4 text-muted-foreground" />
              Hypothesis stage starting
            </span>
          }
        >
          <p role="status" className="text-muted-foreground text-sm">
            Hypothesis starts from the accepted data card{card?.title && <> · {card.title}</>}.
          </p>
        </Pane>
      )}
      {model.gate === null && !ended && model.releaseWait && !model.published && <ReleaseCard />}
      {studio && local && stageStatus === "active" && (
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <HardDrive className="size-4" />
          Running on your Local Node
        </p>
      )}
      {studio && !handoff && outcome}
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
      />
      {!studio && outcome}
    </div>
  );
}
