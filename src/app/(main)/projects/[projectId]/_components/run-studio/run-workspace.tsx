"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { cn } from "cn";
import { ArrowDown, ArrowLeft, ArrowRight, PanelRight, Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useRunsQuery } from "@/hooks/use-runs-query";
import type { GateAnswer } from "@/lib/run-stream/contract";
import { SHOW_REVIEW_MODE } from "@/lib/run-stream/features";
import { type RunSession, useProjectRun, useRunSession, useRunStudio } from "@/lib/run-stream/run-store";
import { displayStatus, liveStageKey } from "@/lib/run-stream/selectors";

import { DropBar, GateSheet } from "./gate-sheet";
import { NowCard, RunAside } from "./run-aside";
import { FlightLayer, PulseDot, StatusPill } from "./run-bits";
import { MODES, STAGE_SHORT } from "./run-meta";
import { useStageHold } from "./stage-hold";
import { StageScreen } from "./stage-screen";
import { StageTrack } from "./stage-track";
import { BusyContext, WorkspaceContext } from "./workspace-context";

function stageName(session: RunSession, key: string | null) {
  if (!key) return "";
  if (key === "done") return "Paper";
  const planned = session.state.plan.find((s) => s.key === key);
  return planned ? `${STAGE_SHORT[planned.stage]}${planned.round ? ` · R${planned.round}` : ""}` : key;
}

function RunWorkspace({ session }: { session: RunSession }) {
  const { state, runId } = session;
  const router = useRouter();
  const closeWorkspace = useRunStudio((s) => s.closeWorkspace);
  const answerGate = useRunStudio((s) => s.answerGate);
  const pause = useRunStudio((s) => s.pause);
  const resume = useRunStudio((s) => s.resume);
  const openFrom = useRunStudio((s) => s.openFrom);
  const scroller = useRef<HTMLDivElement>(null);
  const live = liveStageKey(state);
  const [viewKey, setViewKey] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const [dropMode, setDropMode] = useState(false);
  const [dropped, setDropped] = useState<string[]>([]);
  const [kept, setKept] = useState<string[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [asideOpen, setAsideOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [stepPause, setStepPause] = useState(false);
  const [holding, setHolding] = useState(false);
  const [answering, setAnswering] = useState(false);
  const status = displayStatus(state);
  const paused = state.lifecycle === "paused";
  // A run that failed has ended too: nothing is live and there is nothing to pause.
  const ended = state.completed || state.lifecycle === "failed";
  // The live view finishes showing a stage before it follows the run to the next one.
  const hold = useStageHold(live, ended, state.stages, Boolean(state.gate) || viewKey !== null);
  const followed = hold.shown.key;
  const shown = viewKey ?? followed ?? state.stageOrder[0] ?? null;
  const isLiveView = shown === followed;

  // A review stop always brings you back to the live stage.
  const gateId = state.gate?.id;
  useEffect(() => {
    if (!gateId) return;
    setViewKey(null);
    setMinimized(false);
    setDropMode(false);
    setDropped([]);
    setAnswering(false);
  }, [gateId]);

  // The finished paper gets the full width.
  useEffect(() => {
    if (state.completed) setAsideOpen(false);
  }, [state.completed]);

  // Slide in the direction of travel, and start each stage at the top.
  const order = [...state.plan.map((s) => s.key), "done"];
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
    if (doneSteps > lastDone.current && stepPause && !ended && !state.gate) {
      pause(runId);
      setHolding(true);
    }
    lastDone.current = doneSteps;
  }, [doneSteps, stepPause, ended, state.gate, pause, runId]);
  const togglePause = () => {
    if (paused) {
      resume(runId);
      setHolding(false);
    } else pause(runId);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || (e.target as HTMLElement).closest("input, textarea, button, [role=radio], [role=switch]"))
        return;
      if (state.gate || ended || session.pipeline) return;
      e.preventDefault();
      togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The gate closes when the backend's `gate.resolved` arrives; until then the answer can't be sent again.
  const answer = async (a: GateAnswer) => {
    if (!state.gate || answering) return false;
    setAnswering(true);
    const recorded = await answerGate(runId, state.gate.id, a);
    if (!recorded) setAnswering(false);
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
        <header className="flex min-h-14 flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b px-3 py-2 md:flex-nowrap md:pr-4">
          <Button variant="ghost" size="sm" onClick={closeWorkspace} title="Leave the workspace. The run keeps going.">
            <ArrowLeft />
            Research flow
          </Button>
          <Separator orientation="vertical" className="h-5 max-md:hidden" />
          <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
            <b className="whitespace-nowrap font-mono font-semibold text-sm">{session.label}</b>
            <span className="truncate text-muted-foreground text-sm max-md:hidden">{state.topic}</span>
          </div>
          <StatusPill status={status} />
          {SHOW_REVIEW_MODE && (
            <span className="whitespace-nowrap text-muted-foreground text-xs max-lg:hidden">
              Review mode <b className="font-medium text-foreground">{MODES[state.mode].label}</b>
            </span>
          )}
          <div className="flex items-center gap-2 max-md:w-full max-md:justify-between">
            {/* A pipeline run can't be paused yet. */}
            {!session.pipeline && (
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
            <Button
              variant="ghost"
              size="icon-sm"
              className="max-lg:hidden"
              onClick={() => setAsideOpen((o) => !o)}
              aria-label="Show or hide the side panel"
            >
              <PanelRight />
            </Button>
          </div>
        </header>

        <StageTrack
          state={state}
          viewKey={shown}
          onView={(key) => {
            if (key === live) hold.release();
            setViewKey(key === live || key === followed ? null : key);
          }}
        />

        <div className={cn("grid min-h-0 flex-1", asideOpen ? "lg:grid-cols-[minmax(0,1fr)_352px]" : "grid-cols-1")}>
          <div className="relative flex min-h-0 min-w-0 flex-col">
            <div className="border-b px-4 py-2.5 lg:hidden">
              <NowCard state={state} holding={holding} onContinue={togglePause} compact typing />
              <Button variant="ghost" size="xs" className="mt-1.5" onClick={() => setDetailsOpen(true)}>
                Steps and activity
              </Button>
            </div>
            <div
              ref={scroller}
              className="min-h-0 flex-1 overflow-y-auto"
              onWheel={() => isLiveView && setFollow(false)}
              onTouchMove={() => isLiveView && setFollow(false)}
            >
              {!shown && (
                <div className="grid min-h-[60vh] place-items-center px-4 text-center">
                  <span className="flex flex-col items-center gap-2">
                    {status === "failed" ? (
                      <b className="font-semibold text-sm">The run stopped before its first stage</b>
                    ) : (
                      <>
                        <PulseDot className="bg-sky-500" />
                        <b className="font-semibold text-sm">Waiting for Popper to start</b>
                      </>
                    )}
                    <span className="max-w-[44ch] text-muted-foreground text-xs">
                      {status === "failed"
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
                      <StageScreen
                        state={state}
                        stageKey={shown}
                        runLabel={session.label}
                        live={isLiveView && !hold.shown.ended}
                        scroller={scroller}
                        onOpenReport={() => setViewKey("report")}
                        onOpenFindings={() => {
                          closeWorkspace();
                          router.push(`/projects/${session.projectId}/findings`);
                        }}
                        onClose={closeWorkspace}
                      />
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
              {isLiveView && hold.holding && live && followed !== live && (
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
              {isLiveView && !hold.holding && !follow && !ended && !state.gate && (
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

            <AnimatePresence>
              {state.gate && !dropMode && (
                <GateSheet
                  key={state.gate.id}
                  gate={state.gate}
                  mode={state.mode}
                  round={liveRound}
                  minimized={minimized}
                  onMinimize={setMinimized}
                  onAnswer={answer}
                  onStartDrop={() => setDropMode(true)}
                  pending={answering}
                />
              )}
              {state.gate && dropMode && (
                <DropBar
                  kept={droppable.length - dropped.length + kept.length}
                  total={droppable.length}
                  noun={dropsPapers ? "paper in the shortlist" : "hypothesis in the set"}
                  keepable={state.gate.keepable?.length ?? 0}
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
              <RunAside state={state} holding={holding} onContinue={togglePause} typing />
            </aside>
          )}
        </div>
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Steps and activity</SheetTitle>
            </SheetHeader>
            <RunAside state={state} holding={holding} onContinue={togglePause} typing />
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
    // Runs started from a dataset have no topic and keep their own page.
    if (!run?.topic || run.id === shown) return;
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

  const gate = session?.state.gate;
  const away = Boolean(session) && openRunId !== session?.runId;
  const label = session?.label;
  const runId = session?.runId;
  const told = useRef<string | null>(null);
  useEffect(() => {
    if (!gate || !away || !runId || told.current === gate.id) return;
    told.current = gate.id;
    toast(`${label} needs you`, {
      description: gate.title,
      duration: 12_000,
      action: { label: "Review now", onClick: () => openWorkspace(runId) },
    });
  }, [gate, away, label, runId, openWorkspace]);
  // Tell about a finish that happened while you were away, and about any stop, but only when it happens:
  // not when you leave a finished run, and not when a run that had already ended is loaded.
  const completed = Boolean(session?.state.completed);
  const withPaper = Boolean(session?.state.paperTitle);
  const failed = session?.state.lifecycle === "failed";
  const failure = session?.state.failure;
  const seen = useRef({ runId, completed, failed });
  useEffect(() => {
    const before = seen.current;
    seen.current = { runId, completed, failed };
    if (!runId || before.runId !== runId) return;
    if (completed && !before.completed && away)
      toast.success(`${label} finished`, {
        description: withPaper ? "The paper is in Findings." : "The hypotheses are ready.",
      });
    if (failed && !before.failed)
      toast.error(`${label} stopped`, { description: failure ?? "Popper could not finish this run." });
  }, [runId, completed, failed, away, label, withPaper, failure]);

  if (!mounted) return null;
  return createPortal(
    <>
      <FlightLayer />
      <AnimatePresence>
        {open?.projectId === projectId && <RunWorkspace key={open.runId} session={open} />}
      </AnimatePresence>
    </>,
    document.body,
  );
}
