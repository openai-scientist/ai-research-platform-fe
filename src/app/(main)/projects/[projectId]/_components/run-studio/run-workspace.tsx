"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "cn";
import { ArrowDown, ArrowLeft, ArrowRight, Pause, Play, SkipForward } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useProjectAccess } from "@/hooks/use-project-access";
import { useProjectDetailQuery } from "@/hooks/use-projects-query";
import { useRunDetailQuery, useRunLocalNodeReview, useRunsQuery } from "@/hooks/use-runs-query";
import { getProjectAccess } from "@/lib/auth/project-access";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuth } from "@/lib/redux/slices/auth-slice";
import type { GateAnswer } from "@/lib/run-stream/contract";
import { EXECUTION_STAGE } from "@/lib/run-stream/execution";
import { DESIGN_STAGE } from "@/lib/run-stream/experiment-design";
import { isStudioRun, type RunSession, useProjectRun, useRunSession, useRunStudio } from "@/lib/run-stream/run-store";
import { displayStatus, liveStageKey } from "@/lib/run-stream/selectors";
import { PlatformRole, ProjectStatus } from "@/types/enums";

import { DatasetNowCard, DatasetRunAside } from "../dataset-run/dataset-run-aside";
import { DatasetReleaseStatus } from "../dataset-run/dataset-run-gate";
import {
  type DatasetStage,
  DatasetStageCard,
  DatasetStageScene,
  useDatasetStagePresentation,
} from "../dataset-run/dataset-stage-scene";
import { DropBar, GateSheet } from "./gate-sheet";
import { LocalNodeWaitBanner, SupersededDatasetBanner } from "./local-node-status";
import { DATASET_STAGE, pipelineStageOf, WRITING_RUN } from "./pipeline-stage-selection";
import { RecoveryBar } from "./recovery-bar";
import { NowCard, RunAside } from "./run-aside";
import { FlightLayer, PulseDot } from "./run-bits";
import { RunHeader, StopRun } from "./run-header";
import { STAGE_SHORT } from "./run-meta";
import { DesignHandoff } from "./scenes/design-handoff";
import { Pane } from "./scenes/scene-ui";
import { useStageHold } from "./stage-hold";
import { StageScreen } from "./stage-screen";
import { StageTrack } from "./stage-track";
import { BusyContext, WorkspaceContext } from "./workspace-context";
import {
  closeWritingPreview,
  HOST,
  openWritingPreview,
  PREVIEW_RUN_ID,
  startWriting,
  UI,
  useWritingPreviewOpen,
  useWritingRun,
} from "./writing/engine";
import { WritingStudio } from "./writing/shell";
import { WritingPreview } from "./writing-preview";

function stageName(session: RunSession, key: string | null) {
  if (!key) return "";
  if (key === DATASET_STAGE) return "Dataset";
  if (key === DESIGN_STAGE) return "Experiment design";
  if (key === "execution") return "Execution";
  if (key === "done") return "Paper";
  if (key === "write") return "Write";
  const planned = session.state.plan.find((s) => s.key === key);
  return planned ? `${STAGE_SHORT[planned.stage]}${planned.round ? ` · R${planned.round}` : ""}` : key;
}

type WorkspacePreview = {
  dataset?: DatasetStage;
  experimentDesign?: {
    scene(focus: string | null, onInspect: (key: string) => void, onShowGate?: () => void): ReactNode;
    document: ReactNode;
  };
  execution?: {
    start(): void;
    labels: Readonly<Record<string, string>>;
    scene(focus: string | null, inspect: (step: string | null) => void, onDesign: () => void): ReactNode;
  };
  close(): void;
  answer(answer: GateAnswer): Promise<boolean>;
  releaseAction?: ReactNode;
  togglePause(): void;
  skipStep?: () => void;
  openHypothesisDemo?: () => void;
};

export function RunWorkspace({ session, preview }: { session: RunSession; preview?: WorkspacePreview }) {
  const { state, runId, dataset } = session;
  const close = useRunStudio((s) => s.closeWorkspace);
  const closeWorkspace = preview?.close ?? close;
  const answerGate = useRunStudio((s) => s.answerGate);
  const pause = useRunStudio((s) => s.pause);
  const resume = useRunStudio((s) => s.resume);
  const openingOrigin = useRunStudio((s) => s.openFrom);
  const openFrom = preview ? null : openingOrigin;
  const scroller = useRef<HTMLDivElement>(null);
  const researchLive = liveStageKey(state);
  const [viewKey, setViewKey] = useState<string | null>(null);
  const [hypothesisFocus, setHypothesisFocus] = useState<{ key: string; number: number }>();
  const [datasetFocus, setDatasetFocus] = useState<string | null>(null);
  const [designFocus, setDesignFocus] = useState<string | null>(null);
  const [executionFocus, setExecutionFocus] = useState<string | null>(null);
  const [acceptConfirmed, setAcceptConfirmed] = useState(false);
  const [handoffSeen, setHandoffSeen] = useState(false);
  const acceptedAtOpen = useRef(dataset?.model.accepted === true);
  const [follow, setFollow] = useState(true);
  const [dropMode, setDropMode] = useState(false);
  const [dropped, setDropped] = useState<string[]>([]);
  const [kept, setKept] = useState<string[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [asideOpen, setAsideOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [stepPause, setStepPause] = useState(false);
  const [holding, setHolding] = useState(false);
  const [skipHold, setSkipHold] = useState(false);
  const [answering, setAnswering] = useState(false);
  const projectQuery = useProjectDetailQuery(preview ? "" : session.projectId, {
    refetchInterval: (query) => (query.state.error ? false : 15_000),
  });
  const project = projectQuery.data?.data;
  const platformRole = useAppSelector(selectAuth).user?.platform_role;
  const canAct = Boolean(
    preview ||
      (project &&
        !projectQuery.isError &&
        (getProjectAccess(project.my_role, project.status).canWrite ||
          (platformRole === PlatformRole.PlatformAdmin && project.status !== ProjectStatus.Archived))),
  );
  const rawAccess = useProjectAccess(preview ? "" : session.projectId).context?.permissions.can_read_raw_datasets;
  const status = displayStatus(state);
  const paused = state.lifecycle === "paused";
  // A run that failed has ended too: nothing is live and there is nothing to pause.
  const ended = state.completed || state.lifecycle === "failed";
  const datasetAccepted = Boolean(dataset && (dataset.model.accepted === true || acceptConfirmed));
  const handoff = Boolean(
    dataset && (acceptConfirmed || (dataset.acceptedLive && !acceptedAtOpen.current)) && !handoffSeen && !ended,
  );
  const datasetLive = Boolean(dataset) && (!datasetAccepted || handoff);
  const previewControlsDisabled = [state.gate, preview?.releaseAction, ended, preview && handoff].some(Boolean);
  const live = datasetLive ? DATASET_STAGE : (researchLive ?? (dataset && !ended ? "scope" : null));
  const datasetRun = useRunDetailQuery(session.projectId, runId, { enabled: !preview && session.pipeline }).data?.data;
  const releasePending = useRunLocalNodeReview(
    session.projectId,
    datasetRun,
    !preview && session.pipeline && !ended && datasetRun?.current_stage?.stage_key !== DATASET_STAGE,
  );
  const releaseStage = releasePending ? datasetRun?.current_stage?.stage_key : undefined;
  const datasetId = datasetRun?.dataset_id ?? dataset?.id ?? "";
  const acceptDataset = !datasetAccepted && state.gate?.stageKey === DATASET_STAGE && state.gate.kind === "accept";
  const designContent = state.stages[DESIGN_STAGE]?.content;
  const design = designContent?.stage === "experiment" ? designContent.liveDesign : undefined;
  const loadedDatasetStage = useDatasetStagePresentation(
    preview ? "" : session.projectId,
    rawAccess ? datasetId : "",
    datasetRun,
    preview ? undefined : dataset?.model,
    datasetAccepted ? "completed" : status,
    acceptDataset,
  );
  const datasetStage = preview?.dataset ?? loadedDatasetStage;
  let headerStatus = status;
  if (releasePending && status === "running") headerStatus = "waiting";
  if (datasetLive && status === "running" && datasetStage?.stageStatus === "waiting") headerStatus = "waiting";
  useEffect(() => {
    if (!handoff || !researchLive || viewKey || datasetFocus) return;
    const timer = window.setTimeout(() => setHandoffSeen(true), 8000);
    return () => window.clearTimeout(timer);
  }, [handoff, researchLive, viewKey, datasetFocus]);
  const continueAfterDataset = () => {
    preview?.openHypothesisDemo?.();
    setHandoffSeen(true);
    setDatasetFocus(null);
    setViewKey(null);
  };
  // The live view finishes showing a stage before it follows the run to the next one.
  const hold = useStageHold(researchLive, ended, state.stages, skipHold || Boolean(state.gate) || viewKey !== null);
  useEffect(() => {
    if (skipHold && !hold.holding) setSkipHold(false);
  }, [hold.holding, skipHold]);
  const followed = datasetLive ? DATASET_STAGE : (hold.shown.key ?? live);
  const shown = viewKey ?? followed ?? state.stageOrder[0] ?? null;
  const hypothesisMilestone = hypothesisFocus?.key === shown ? hypothesisFocus.number : undefined;
  const isLiveView = shown === followed;
  const showingDataset = shown === DATASET_STAGE && datasetStage !== undefined;
  const hypothesisLocked = Boolean(dataset) && !datasetAccepted && pipelineStageOf(state.plan, shown) === "hypothesis";
  const showingDatasetProgress = showingDataset || hypothesisLocked;
  const datasetGate = state.gate?.stageKey === DATASET_STAGE;
  if (datasetGate && datasetAccepted && status === "waiting") headerStatus = "running";
  const showGate =
    !ended &&
    state.gate &&
    (!dataset || datasetGate === showingDataset) &&
    (state.gate.stageKey !== DESIGN_STAGE || shown === DESIGN_STAGE) &&
    (state.gate.stageKey !== EXECUTION_STAGE || shown === EXECUTION_STAGE) &&
    !(datasetGate && datasetAccepted && state.gate.kind === "accept")
      ? state.gate
      : null;
  const inspectDesignStep = (key: string) => {
    if (preview?.experimentDesign) {
      setDesignFocus(key === state.stages[DESIGN_STAGE]?.currentStepId ? null : key);
      scroller.current?.scrollTo({ top: 0 });
    } else {
      setDesignFocus(key);
      setFollow(false);
      scroller.current?.querySelector('[data-design-step="' + key + '"]')?.scrollIntoView({ block: "start" });
    }
    if (key === "design_accept" && showGate) setMinimized(false);
  };
  /* The Write stage is a preview of the writing run, with its own track, stops and aside. */
  const writing = Boolean(preview && shown === "write");
  const openWriting = () => {
    startWriting(runId, session.label);
    setViewKey("write");
    setAsideOpen(true);
  };
  // A toast from the writing run, while the workspace was closed, opens it on the writing view.
  useWritingRun();
  useEffect(() => {
    if (!preview || !UI.wantView || HOST.runId !== runId) return;
    UI.wantView = false;
    setViewKey("write");
    setAsideOpen(true);
  });

  // A review stop always brings you back to the live stage.
  const gateId = state.gate?.id;
  useEffect(() => {
    setAnswering(false);
    if (!gateId) return;
    setViewKey(null);
    setDesignFocus(null);
    setMinimized(false);
    setDropMode(false);
    setDropped([]);
  }, [gateId]);

  // The finished paper gets the full width.
  useEffect(() => {
    if (state.completed) setAsideOpen(false);
  }, [state.completed]);

  // Slide in the direction of travel, and start each stage at the top.
  const order = [DATASET_STAGE, ...state.plan.map((s) => s.key), "done", "write"];
  const previous = useRef(shown);
  const direction = order.indexOf(shown ?? "") >= order.indexOf(previous.current ?? "") ? 1 : -1;
  useEffect(() => {
    previous.current = shown;
    scroller.current?.scrollTo({ top: 0 });
    if (isLiveView) setFollow(true);
  }, [shown, isLiveView]);

  // "Pause each step" pauses the run whenever a step finishes.
  const doneSteps = Object.values(state.stages).reduce((n, s) => n + s.doneStepIds.length, 0);
  const lastDone = useRef(doneSteps);
  useEffect(() => {
    if (canAct && doneSteps > lastDone.current && stepPause && !ended && !state.gate) {
      pause(runId);
      setHolding(true);
    }
    lastDone.current = doneSteps;
  }, [canAct, doneSteps, stepPause, ended, state.gate, pause, runId]);
  const togglePause = () => {
    if (preview) {
      preview.togglePause();
      return;
    }
    if (!canAct || session.pipeline) return;
    if (paused) {
      resume(runId);
      setHolding(false);
    } else pause(runId);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || (e.target as HTMLElement).closest("input, textarea, button, [role=radio], [role=switch]"))
        return;
      if (state.gate || ended || session.pipeline || previewControlsDisabled) return;
      e.preventDefault();
      togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keep answers disabled while the server records them; ApiRun reconciles a successful gate POST immediately.
  const answer = async (a: GateAnswer) => {
    if (!canAct || ended || !state.gate || answering) return false;
    const acceptingDataset = dataset && datasetGate && state.gate.kind === "accept" && a.option_id === "accept";
    setAnswering(true);
    const recorded = preview ? await preview.answer(a) : await answerGate(runId, state.gate.id, a);
    if (!recorded) setAnswering(false);
    if (recorded && acceptingDataset) {
      if (preview) setAcceptConfirmed(true);
      setDatasetFocus(null);
      setViewKey(null);
    }
    if (recorded && preview && state.gate.kind === "accept" && !state.gate.stageKey) {
      setSkipHold(true);
      setViewKey(null);
      setFollow(true);
    }
    return recorded;
  };
  const droppable = state.gate?.droppable ?? [];
  const dropsPapers = state.gate?.kind === "screen";
  const ctx = useMemo(
    () => ({
      session,
      state,
      follow,
      setFollow,
      dropMode,
      dropped,
      toggleDrop: (id: string) =>
        setDropped((list) => {
          if (list.includes(id)) return list.filter((x) => x !== id);
          if (droppable.length - list.length + kept.length <= 1) {
            toast.error(dropsPapers ? "Keep at least one paper." : "Keep at least one hypothesis.");
            return list;
          }
          return [...list, id];
        }),
      kept,
      toggleKeep: (id: string) => setKept((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])),
    }),
    [session, state, follow, dropMode, dropped, kept, droppable.length, dropsPapers],
  );

  const W = typeof window === "undefined" ? 0 : window.innerWidth;
  const H = typeof window === "undefined" ? 0 : window.innerHeight;
  const from = openFrom
    ? `inset(${openFrom.top}px ${W - openFrom.right}px ${H - openFrom.bottom}px ${openFrom.left}px round 12px)`
    : "inset(0px 0px 0px 0px round 0px)";
  const liveRound = (live && state.stages[live]?.plan.round) || 1;
  const datasetAside =
    showingDatasetProgress && datasetStage ? (
      <DatasetRunAside
        model={datasetStage.model}
        steps={datasetStage.steps}
        status={datasetStage.status}
        local={datasetStage.local}
        focusKey={datasetFocus}
        typing
        onView={(step) => {
          setDatasetFocus(step);
          setDetailsOpen(false);
        }}
      />
    ) : null;

  return (
    <WorkspaceContext.Provider value={ctx}>
      <motion.section
        aria-label={`Research run ${session.label}`}
        className="fixed inset-0 z-50 flex flex-col bg-background"
        initial={{ clipPath: from, opacity: openFrom ? 1 : 0 }}
        animate={{ clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 1 }}
        exit={{ clipPath: from, opacity: 0.6 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <RunHeader
          back={
            <Button
              variant="ghost"
              size="sm"
              onClick={closeWorkspace}
              title={preview ? "Start the mock run over" : "Leave the workspace. The run keeps going."}
            >
              <ArrowLeft />
              {preview ? "Restart demo" : "Research flow"}
            </Button>
          }
          label={session.label}
          question={
            showingDataset && preview?.dataset?.workFacts?.question ? preview.dataset.workFacts.question : state.topic
          }
          status={headerStatus}
          mode={state.mode}
          asideOpen={asideOpen}
          onToggleAside={() => setAsideOpen((open) => !open)}
          actions={
            <>
              {/* A pipeline run can't be paused yet; the writing preview has its own controls. */}
              {preview?.skipStep && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={previewControlsDisabled}
                  onClick={() => {
                    setViewKey(null);
                    setDatasetFocus(null);
                    setDesignFocus(null);
                    setExecutionFocus(null);
                    setFollow(true);
                    setSkipHold(true);
                    if (datasetLive || !hold.holding) preview.skipStep?.();
                  }}
                >
                  <SkipForward />
                  Skip step
                </Button>
              )}
              {preview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={togglePause}
                  disabled={previewControlsDisabled}
                >
                  {paused ? <Play /> : <Pause />}
                  {paused ? "Resume demo" : "Pause demo"}
                </Button>
              )}
              {!preview && canAct && !session.pipeline && !writing && (
                <>
                  <span className="flex items-center gap-2 whitespace-nowrap text-xs">
                    <Switch
                      id="pause-each-step"
                      checked={stepPause}
                      onCheckedChange={(on) => {
                        setStepPause(on);
                        if (!on && holding) togglePause();
                      }}
                    />
                    <label htmlFor="pause-each-step" className="cursor-pointer">
                      Pause each step
                    </label>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePause}
                    disabled={Boolean(state.gate) || ended}
                    title="Pause or resume (Space)"
                  >
                    {paused ? <Play /> : <Pause />}
                    {paused ? "Resume" : "Pause"}
                  </Button>
                </>
              )}
              {!preview && canAct && session.pipeline && !ended && (
                <StopRun projectId={session.projectId} runId={session.runId} label={session.label} />
              )}
            </>
          }
        />

        <StageTrack
          state={state}
          writingRun={!preview && datasetRun?.current_stage?.stage_key === "writing"}
          allowWritingPreview={Boolean(preview)}
          viewKey={shown}
          hypothesisMilestone={hypothesisMilestone}
          designFocus={designFocus}
          execution={
            state.stages.execution && {
              focus: executionFocus,
              labels: preview?.execution?.labels ?? {},
              releasePending: releaseStage === EXECUTION_STAGE,
              inspect: (key) => {
                setViewKey(live === "execution" ? null : "execution");
                setExecutionFocus(key === state.stages.execution?.currentStepId ? null : key);
                scroller.current?.scrollTo({ top: 0 });
              },
            }
          }
          openHypothesisDemo={handoff && preview?.openHypothesisDemo ? continueAfterDataset : undefined}
          onDesignStep={inspectDesignStep}
          dataset={
            datasetStage && {
              steps: datasetStage.steps,
              accepted: datasetAccepted,
              handoff,
              viewKey: datasetFocus,
              liveFill: Math.min(85, 30 + (datasetStage.model.progress?.seconds ?? 0)),
              onView: setDatasetFocus,
            }
          }
          onView={(key, milestone) => {
            if (key === "write" && preview) return openWriting();
            if (handoff && key !== DATASET_STAGE) setHandoffSeen(true);
            setHypothesisFocus(milestone === undefined ? undefined : { key, number: milestone });
            setDesignFocus(null);
            if (key === live) hold.release();
            setViewKey(key === live || key === followed ? null : key);
          }}
        />
        <LocalNodeWaitBanner state={state} />
        {releaseStage && releaseStage !== DATASET_STAGE && (
          <DatasetReleaseStatus
            state="pending"
            next="Review the current request in the Local Node app. Logos records the release decision from that device."
          />
        )}
        <SupersededDatasetBanner state={state} />
        <AnimatePresence initial={false}>{!preview && <RecoveryBar session={session} />}</AnimatePresence>

        {writing ? (
          <WritingStudio asideOpen={asideOpen} />
        ) : (
          <div className={cn("grid min-h-0 flex-1", asideOpen ? "lg:grid-cols-[minmax(0,1fr)_352px]" : "grid-cols-1")}>
            <div className="relative flex min-h-0 min-w-0 flex-col">
              <div className="border-b px-4 py-2.5 lg:hidden">
                {showingDatasetProgress && datasetStage ? (
                  <DatasetNowCard
                    model={datasetStage.model}
                    steps={datasetStage.steps}
                    status={datasetStage.status}
                    compact
                    typing
                  />
                ) : (
                  <NowCard state={state} holding={holding} onContinue={togglePause} compact typing />
                )}
                <Button variant="ghost" size="xs" className="mt-1.5" onClick={() => setDetailsOpen(true)}>
                  Steps and activity
                </Button>
              </div>
              <div
                ref={scroller}
                className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
                onWheel={() => isLiveView && setFollow(false)}
                onTouchMove={() => isLiveView && setFollow(false)}
              >
                {!shown && (
                  <div className="grid min-h-[60vh] place-items-center px-4 text-center">
                    <span className="flex flex-col items-center gap-2">
                      {state.lifecycle === "failed" ? (
                        <b className="font-semibold text-sm">The run stopped before its first stage</b>
                      ) : (
                        <>
                          <PulseDot className="bg-sky-500" />
                          <b className="font-semibold text-sm">Waiting for Popper to start</b>
                        </>
                      )}
                      <span className="max-w-[44ch] text-muted-foreground text-xs">
                        {state.lifecycle === "failed"
                          ? (state.failure ?? "Popper could not start this run.")
                          : "The first stage opens here as soon as it begins. You can leave; the run keeps going."}
                      </span>
                    </span>
                  </div>
                )}
                <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                  {shown && (
                    <motion.div
                      key={shown}
                      custom={direction}
                      initial={{ opacity: 0, x: direction * 32 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction * -24 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="px-4 pt-5 pb-56 md:px-8"
                    >
                      <BusyContext.Provider value={isLiveView ? hold.busyContext : null}>
                        {showingDataset && datasetStage ? (
                          <DatasetStageScene
                            projectId={preview ? undefined : session.projectId}
                            datasetId={rawAccess ? datasetId : ""}
                            run={datasetRun}
                            question={preview?.dataset?.workFacts?.question ?? state.topic}
                            releaseAction={preview?.releaseAction}
                            stage={datasetStage}
                            focusKey={datasetFocus}
                            onView={setDatasetFocus}
                            studio
                            handoff={handoff}
                            onContinueHandoff={
                              researchLive || preview?.openHypothesisDemo ? continueAfterDataset : undefined
                            }
                            hypothesisDemo={Boolean(preview?.openHypothesisDemo)}
                            cardInGate={Boolean(showGate && acceptDataset && !minimized && !dropMode)}
                          />
                        ) : shown === WRITING_RUN && datasetRun?.current_stage?.stage_key === "writing" ? (
                          <Pane title="Writing">
                            <p className="text-sm">
                              {datasetRun.current_stage.waiting_input
                                ? "Writing is waiting for a decision from you."
                                : "Writing is running."}
                            </p>
                            <p className="mt-1 text-muted-foreground text-sm">
                              It reads the results package from Execution. This page does not draw the manuscript yet;
                              the Results report is under Execution.
                            </p>
                            <Button
                              className="mt-3"
                              size="sm"
                              variant="outline"
                              onClick={() => setViewKey(EXECUTION_STAGE)}
                            >
                              Open Execution
                            </Button>
                          </Pane>
                        ) : hypothesisLocked ? (
                          <Pane title="Starts after the Dataset stage is accepted">
                            <p className="text-muted-foreground text-sm">
                              Hypothesis starts with Scope and uses the data card approved in Dataset.
                            </p>
                            <Button className="mt-3" size="sm" variant="outline" onClick={() => setViewKey(null)}>
                              Back to Dataset
                            </Button>
                          </Pane>
                        ) : (
                          <StageScreen
                            state={state}
                            projectId={session.projectId}
                            local={datasetStage?.local}
                            datasetFirst={Boolean(datasetStage)}
                            hypothesisMilestone={hypothesisMilestone}
                            designPreview={
                              shown === DESIGN_STAGE && preview?.experimentDesign ? (
                                <>
                                  {preview?.experimentDesign?.scene(
                                    designFocus,
                                    inspectDesignStep,
                                    showGate && canAct ? () => setMinimized(false) : undefined,
                                  )}
                                  {preview?.execution && !state.stages.execution && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-violet-500/7 px-4 py-3">
                                      <p className="max-w-prose text-sm">
                                        Explore how paired retrieval scores turn into a result using synthetic evidence.
                                      </p>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setViewKey(null);
                                          setSkipHold(true);
                                          setAsideOpen(true);
                                          preview.execution?.start();
                                        }}
                                      >
                                        Open Execution rehearsal
                                      </Button>
                                    </div>
                                  )}
                                </>
                              ) : undefined
                            }
                            executionPreview={
                              shown === "execution"
                                ? preview?.execution?.scene(executionFocus, setExecutionFocus, () => {
                                    setDesignFocus("design_accept");
                                    setViewKey(DESIGN_STAGE);
                                  })
                                : undefined
                            }
                            executionFocus={executionFocus}
                            designFocus={designFocus}
                            onLiveStep={() => {
                              setDesignFocus(null);
                              setExecutionFocus(null);
                            }}
                            onDesign={
                              state.stages[DESIGN_STAGE]
                                ? () => {
                                    setDesignFocus(null);
                                    setViewKey(DESIGN_STAGE);
                                    scroller.current?.scrollTo({ top: 0 });
                                  }
                                : undefined
                            }
                            onExecution={
                              state.stages[EXECUTION_STAGE]
                                ? () => {
                                    setExecutionFocus(null);
                                    setViewKey(live === EXECUTION_STAGE ? null : EXECUTION_STAGE);
                                    scroller.current?.scrollTo({ top: 0 });
                                  }
                                : undefined
                            }
                            onShowGate={showGate && canAct ? () => setMinimized(false) : undefined}
                            stageKey={shown}
                            runLabel={session.label}
                            live={isLiveView && !hold.shown.ended}
                            scroller={scroller}
                            onOpenReport={() => setViewKey("report")}
                            onClose={closeWorkspace}
                          />
                        )}
                      </BusyContext.Provider>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {!isLiveView && live && (
                  <motion.div
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 16, opacity: 0 }}
                    className="absolute bottom-4 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-card py-1.5 pr-1.5 pl-4 text-sm shadow-lg ring-1 ring-foreground/10"
                  >
                    <span className="truncate text-muted-foreground">
                      Viewing <b className="font-semibold text-foreground">{stageName(session, shown)}</b>
                      {state.stages[shown ?? ""]?.status === "done" ? ", finished" : ""}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        hold.release();
                        setViewKey(null);
                      }}
                    >
                      {!ended && <PulseDot className="bg-sky-400" />}
                      {ended ? "Back to" : "Live:"} {stageName(session, live)}
                      <ArrowRight />
                    </Button>
                  </motion.div>
                )}
                {!showingDataset && isLiveView && hold.holding && live && followed !== live && (
                  <motion.div
                    key="finishing"
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 16, opacity: 0 }}
                    className="absolute bottom-4 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-card py-1.5 pr-1.5 pl-4 text-sm shadow-lg ring-1 ring-foreground/10"
                  >
                    <span className="truncate text-muted-foreground">
                      Finishing <b className="font-semibold text-foreground">{stageName(session, followed)}</b>
                    </span>
                    <Button size="sm" onClick={hold.release}>
                      <PulseDot className="bg-sky-400" />
                      {stageName(session, live)} started
                      <ArrowRight />
                    </Button>
                  </motion.div>
                )}
                {!showingDataset && isLiveView && !hold.holding && !follow && !ended && !state.gate && (
                  <motion.div
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 16, opacity: 0 }}
                    className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
                  >
                    <Button size="sm" variant="outline" className="shadow-md" onClick={() => setFollow(true)}>
                      <ArrowDown />
                      Follow the agents
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence key={preview && showingDataset ? DATASET_STAGE : "research-gate"}>
                {showGate && (!dropMode || !canAct) && (
                  <GateSheet
                    key={showGate.id}
                    gate={showGate}
                    mode={state.mode}
                    round={liveRound}
                    minimized={minimized}
                    onMinimize={setMinimized}
                    onAnswer={answer}
                    onStartDrop={() => {
                      setDropMode(true);
                      // The set is picked on its round of hypotheses, not on the map where the run stopped.
                      const round = state.stageOrder.findLast((k) => state.stages[k]?.content.stage === "hypothesize");
                      if (state.gate?.kind === "hypotheses" && round && round !== shown) setViewKey(round);
                    }}
                    pending={answering}
                    readOnly={!canAct}
                    documentPreview={
                      acceptDataset && datasetStage && !minimized ? (
                        <DatasetStageCard
                          stage={datasetStage}
                          projectId={preview ? undefined : session.projectId}
                          datasetId={rawAccess ? datasetId : ""}
                          runId={runId}
                        />
                      ) : showGate.kind === "accept" && showGate.stageKey === DESIGN_STAGE ? (
                        (preview?.experimentDesign?.document ?? (
                          <DesignHandoff
                            local={Boolean(datasetStage?.local)}
                            blocked={showGate.options.some((option) => option.id === "send_back")}
                            design={design}
                            projectId={session.projectId}
                            runId={runId}
                            detailed
                          />
                        ))
                      ) : undefined
                    }
                  />
                )}
                {showGate && dropMode && canAct && (
                  <DropBar
                    kept={droppable.length - dropped.length + kept.length}
                    total={droppable.length}
                    noun={dropsPapers ? "paper in the shortlist" : "hypothesis in the set"}
                    keepable={showGate.keepable?.length ?? 0}
                    restored={kept.length}
                    onReset={() => {
                      setDropped([]);
                      setKept([]);
                    }}
                    onApprove={async () => {
                      // Nothing dropped or kept is a plain approval; a "drop" with no items is refused.
                      const change = dropped.length > 0 || kept.length > 0;
                      const decision: GateAnswer = change
                        ? { option_id: "drop", dropped, ...(kept.length ? { kept } : {}) }
                        : { option_id: "approve" };
                      if (await answer(decision)) {
                        setDropMode(false);
                        setKept([]);
                      }
                    }}
                    pending={answering}
                  />
                )}
              </AnimatePresence>
            </div>

            {asideOpen && (
              <aside className="min-h-0 border-l bg-sidebar max-lg:hidden">
                {datasetAside ?? (
                  <RunAside
                    state={state}
                    holding={holding}
                    onContinue={togglePause}
                    typing
                    datasetFirst={Boolean(datasetStage)}
                  />
                )}
              </aside>
            )}
          </div>
        )}
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent side="bottom" className="p-0 data-[side=bottom]:h-[80dvh]">
            <SheetHeader className="sr-only">
              <SheetTitle>Steps and activity</SheetTitle>
            </SheetHeader>
            {datasetAside ?? (
              <RunAside
                state={state}
                holding={holding}
                onContinue={togglePause}
                typing
                datasetFirst={Boolean(datasetStage)}
              />
            )}
          </SheetContent>
        </Sheet>
      </motion.section>
    </WorkspaceContext.Provider>
  );
}

/**
 * With runs on the backend, brings back the project's latest run after a reload or on another device. While the run
 * shown has ended, it keeps asking, so a run started elsewhere (another tab, another member) shows up here too.
 */
function useLatestRun(projectId: string, session: RunSession | undefined) {
  const attachRun = useRunStudio((s) => s.attachRun);
  const openRunId = useRunStudio((s) => s.openRunId);
  const ended = session ? session.state.completed || session.state.lifecycle === "failed" : false;
  const latest = useRunsQuery(
    projectId,
    { limit: 1 },
    {
      enabled: !session || ended,
      refetchInterval: (query) => (session && !query.state.error ? 15_000 : false),
    },
  );
  const run = latest.data?.data[0];
  const shown = session?.runId;
  const shownAt = session?.createdAt;
  useEffect(() => {
    if (!run || !isStudioRun(run) || run.id === shown) return;
    // Only a newer run: a cached answer from before may still name an older one.
    if (shownAt && Date.parse(run.created_at) <= Date.parse(shownAt)) return;
    // Not while the ended run is open: switching would close the workspace under you.
    if (shown && openRunId === shown) return;
    attachRun(projectId, run, true);
  }, [run, shown, shownAt, openRunId, projectId, attachRun]);
}

/** Renders the open workspace over the whole app and tells you when a run you left needs you. */
export function RunWorkspaceHost({ projectId }: { projectId: string }) {
  const openRunId = useRunStudio((s) => s.openRunId);
  const openWorkspace = useRunStudio((s) => s.openWorkspace);
  const session = useProjectRun(projectId);
  const open = useRunSession(openRunId);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useLatestRun(projectId, session);

  const previewOpen = useWritingPreviewOpen();
  // A writing run that needs you, while its workspace is closed, opens it on the writing view.
  useEffect(() => {
    HOST.open = () => {
      const id = HOST.runId;
      if (!id) return;
      if (id === PREVIEW_RUN_ID) return openWritingPreview();
      UI.wantView = true;
      openWorkspace(id);
    };
  }, [openWorkspace]);
  // Opening a research run's workspace leaves the preview.
  useEffect(() => {
    if (openRunId) closeWritingPreview();
  }, [openRunId]);

  const gate = session?.state.gate;
  const away = Boolean(session) && openRunId !== session?.runId;
  const label = session?.label;
  const runId = session?.runId;
  const told = useRef<string | null>(null);
  useEffect(() => {
    if (!runId) return;
    const id = `run-gate-${runId}`;
    if (!gate || !away) {
      toast.dismiss(id);
      return;
    }
    const notification = `${runId}:${gate.id}`;
    if (told.current === notification) return;
    told.current = notification;
    toast.warning(`${label} needs you`, {
      id,
      description: gate.title,
      position: "bottom-right",
      duration: 12_000,
      action: { label: "Review now", onClick: () => openWorkspace(runId) },
    });
  }, [gate, away, label, runId, openWorkspace]);
  // Tell about a finish that happened while you were away, and about any stop, but only when it happens:
  // not when you leave a finished run, and not when a run that had already ended is loaded. A reload
  // replays the history in batches (started, then failed), so only a session following live events counts.
  const completed = Boolean(session?.state.completed);
  const withPaper = Boolean(session?.state.paperTitle);
  const withExecution = session?.state.stages[EXECUTION_STAGE]?.status === "done";
  const failed = session?.state.lifecycle === "failed";
  const failure = session?.state.failure;
  const live = Boolean(session?.followed);
  const seen = useRef({ runId, completed, failed });
  useEffect(() => {
    const before = seen.current;
    seen.current = { runId, completed, failed };
    if (!runId || before.runId !== runId || !live) return;
    if (completed && !before.completed && away)
      toast.success(`${label} finished`, {
        description: withPaper
          ? "The paper is in Findings."
          : withExecution
            ? "The execution evidence is ready."
            : "The hypotheses are ready.",
      });
    if (failed && !before.failed)
      toast.error(`${label} stopped`, {
        description: failure ?? "Popper could not finish this run.",
      });
  }, [runId, completed, failed, away, label, withPaper, withExecution, failure, live]);

  if (!mounted) return null;
  return createPortal(
    <>
      <FlightLayer />
      <AnimatePresence>
        {open?.projectId === projectId && (
          <MotionConfig key={open.runId} reducedMotion="user">
            <RunWorkspace session={open} />
          </MotionConfig>
        )}
        {previewOpen && !open && <WritingPreview key="writing-preview" />}
      </AnimatePresence>
    </>,
    document.body,
  );
}
