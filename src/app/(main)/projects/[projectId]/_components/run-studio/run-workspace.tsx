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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GateAnswer } from "@/lib/run-stream/contract";
import { SHOW_REVIEW_MODE } from "@/lib/run-stream/features";
import { type RunSession, useProjectRun, useRunStudio } from "@/lib/run-stream/run-store";
import { displayStatus, liveStageKey } from "@/lib/run-stream/selectors";

import { DropBar, GateSheet } from "./gate-sheet";
import { NowCard, RunAside } from "./run-aside";
import { FlightLayer, PulseDot, StatusPill } from "./run-bits";
import { MODES, STAGE_SHORT } from "./run-meta";
import { StageScreen } from "./stage-screen";
import { StageTrack } from "./stage-track";
import { WorkspaceContext } from "./workspace-context";

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
  const setSpeed = useRunStudio((s) => s.setSpeed);
  const openFrom = useRunStudio((s) => s.openFrom);
  const scroller = useRef<HTMLDivElement>(null);
  const live = liveStageKey(state);
  const [viewKey, setViewKey] = useState<string | null>(null);
  const shown = viewKey ?? live ?? state.stageOrder[0] ?? null;
  const isLiveView = shown === live;
  const [follow, setFollow] = useState(true);
  const [dropMode, setDropMode] = useState(false);
  const [dropped, setDropped] = useState<string[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [asideOpen, setAsideOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [stepPause, setStepPause] = useState(false);
  const [holding, setHolding] = useState(false);
  const status = displayStatus(state);
  const paused = state.lifecycle === "paused";

  // A review stop always brings you back to the live stage.
  const gateId = state.gate?.id;
  useEffect(() => {
    if (!gateId) return;
    setViewKey(null);
    setMinimized(false);
    setDropMode(false);
    setDropped([]);
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
    if (doneSteps > lastDone.current && stepPause && !state.completed && !state.gate) {
      pause(runId);
      setHolding(true);
    }
    lastDone.current = doneSteps;
  }, [doneSteps, stepPause, state.completed, state.gate, pause, runId]);
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
      if (state.gate || state.completed) return;
      e.preventDefault();
      togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const answer = (a: GateAnswer) => {
    if (state.gate) answerGate(runId, state.gate.id, a);
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
          if (droppable.length - list.length <= 1) {
            toast.error(dropsPapers ? "Keep at least one paper." : "Keep at least one hypothesis.");
            return list;
          }
          return [...list, id];
        }),
    }),
    [session, state, follow, dropMode, dropped, droppable.length, dropsPapers],
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
            Experiments
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <ToggleGroup
                    type="single"
                    size="sm"
                    variant="outline"
                    value={String(session.speed)}
                    onValueChange={(v) => v && setSpeed(runId, Number(v))}
                    aria-label="Mock playback speed"
                  >
                    {[1, 2, 4].map((s) => (
                      <ToggleGroupItem key={s} value={String(s)} className="px-2 font-mono text-xs">
                        {s}×
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </span>
              </TooltipTrigger>
              <TooltipContent>Playback speed of the mock stream</TooltipContent>
            </Tooltip>
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
              disabled={Boolean(state.gate) || state.completed}
              title="Pause or resume (Space)"
            >
              {paused ? <Play /> : <Pause />}
              {paused ? "Resume" : "Pause"}
            </Button>
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

        <StageTrack state={state} viewKey={shown} onView={(key) => setViewKey(key === live ? null : key)} />

        <div className={cn("grid min-h-0 flex-1", asideOpen ? "lg:grid-cols-[minmax(0,1fr)_352px]" : "grid-cols-1")}>
          <div className="relative flex min-h-0 min-w-0 flex-col">
            <div className="border-b px-4 py-2.5 lg:hidden">
              <NowCard state={state} holding={holding} onContinue={togglePause} compact />
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
                    <StageScreen
                      state={state}
                      stageKey={shown}
                      runLabel={session.label}
                      live={isLiveView && !state.completed}
                      scroller={scroller}
                      onOpenReport={() => setViewKey("report")}
                      onOpenFindings={() => {
                        closeWorkspace();
                        router.push(`/projects/${session.projectId}/findings`);
                      }}
                      onClose={closeWorkspace}
                    />
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
                  <Button size="sm" onClick={() => setViewKey(null)}>
                    {!state.completed && <PulseDot className="bg-sky-400" />}
                    {state.completed ? "Back to" : "Live:"} {stageName(session, live)}
                    <ArrowRight />
                  </Button>
                </motion.div>
              )}
              {isLiveView && !follow && !state.completed && !state.gate && (
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
                />
              )}
              {state.gate && dropMode && (
                <DropBar
                  kept={droppable.length - dropped.length}
                  total={droppable.length}
                  noun={dropsPapers ? "paper in the shortlist" : "hypothesis in the set"}
                  onReset={() => setDropped([])}
                  onApprove={() => {
                    answer({ option_id: "drop", dropped });
                    setDropMode(false);
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {asideOpen && (
            <aside className="min-h-0 border-l bg-sidebar max-lg:hidden">
              <RunAside state={state} holding={holding} onContinue={togglePause} />
            </aside>
          )}
        </div>
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Steps and activity</SheetTitle>
            </SheetHeader>
            <RunAside state={state} holding={holding} onContinue={togglePause} />
          </SheetContent>
        </Sheet>
      </motion.section>
    </WorkspaceContext.Provider>
  );
}

/** Renders the open workspace over the whole app and tells you when a run you left needs you. */
export function RunWorkspaceHost({ projectId }: { projectId: string }) {
  const openRunId = useRunStudio((s) => s.openRunId);
  const openWorkspace = useRunStudio((s) => s.openWorkspace);
  const session = useProjectRun(projectId);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
  // Only tell about a finish that happened while you were away, not when you leave a finished run.
  const completed = Boolean(session?.state.completed);
  const withPaper = Boolean(session?.state.paperTitle);
  const wasCompleted = useRef(completed);
  useEffect(() => {
    if (completed && !wasCompleted.current && away)
      toast.success(`${label} finished`, {
        description: withPaper ? "The paper is in Findings." : "The hypotheses are ready.",
      });
    wasCompleted.current = completed;
  }, [completed, away, label, withPaper]);

  if (!mounted) return null;
  return createPortal(
    <>
      <FlightLayer />
      <AnimatePresence>
        {session && openRunId === session.runId && <RunWorkspace key={session.runId} session={session} />}
      </AnimatePresence>
    </>,
    document.body,
  );
}
