"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { ArrowRight, ChevronRight, CircleCheck, CircleX, Flag, Lock, PenLine, Play } from "lucide-react";
import { motion } from "motion/react";

import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldTitle } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInfiniteRuns } from "@/hooks/use-runs-query";
import { projectKeys } from "@/lib/api/query-keys";
import { type RunItem, runTitle } from "@/lib/api/services/fetch-runs";
import type { GateKind, IntentKind, ReviewMode, RunInput } from "@/lib/run-stream/contract";
import { SHOW_DATA_STAGE, SHOW_REVIEW_MODE, SHOW_WRITING_PREVIEW } from "@/lib/run-stream/features";
import { DATASET } from "@/lib/run-stream/mock/scenario";
import { type RunSession, useProjectRun, useRunStudio } from "@/lib/run-stream/run-store";
import { displayStatus, finalResults, GATE_TITLE, inSentence, nextStop, signed } from "@/lib/run-stream/selectors";

import { ListState, LoadMore } from "../workspace-ui";
import { AgentAvatar, StatusPill } from "./run-bits";
import {
  AGENTS,
  LOCKED_HINT,
  LOCKED_PIPELINE,
  MODES,
  PIPELINE,
  RUN_MODES,
  STAGE_SHORT,
  STOP_INFO,
  stopsFor,
} from "./run-meta";
import type { Readiness } from "./run-readiness";
import { focusReadinessPanel, RunReadinessPanel } from "./run-readiness-panel";
import { compactNumber, RunStats } from "./run-stats";
import { CaseDetailsInput, IntentInput, StartRunDialog, TopicInput, useTopicDraft } from "./start-run-dialog";
import { useRunReadiness } from "./use-run-readiness";
import { WritingRunRow } from "./writing/live/entry";
import { openWritingRun } from "./writing/live/open";
import { isDraftRun, isWritingRun } from "./writing/live/run";

function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="-mb-2 flex items-baseline gap-2">
      <h2 className="font-semibold text-[15px]">{title}</h2>
      {aside && <span className="text-muted-foreground text-xs">{aside}</span>}
    </div>
  );
}

/** Your own data, once runs can take it. Until then a run starts from the question alone and nothing is shown. */
function DataField() {
  if (!SHOW_DATA_STAGE) return null;
  return (
    <Field>
      <FieldTitle>Data</FieldTitle>
      <p className="text-sm">
        {DATASET.name} · v1{" "}
        <span className="text-muted-foreground text-xs">· 1,240 rows, checked by the Steward first</span>
      </p>
    </Field>
  );
}

/** The next run, started right here: type the topic, keep its fields, start. */
function TopicComposer({
  mode,
  onModeChange,
  canWrite,
  readiness,
  onStart,
}: {
  mode: ReviewMode;
  onModeChange(mode: ReviewMode): void;
  canWrite: boolean;
  /** What a run needs; Start stays disabled while an item blocks it. */
  readiness: Readiness;
  /** Settles once the run has started or was refused. */
  onStart(mode: ReviewMode, input: RunInput, from: HTMLElement | null): Promise<void>;
}) {
  const draft = useTopicDraft("composer");
  const button = useRef<HTMLButtonElement>(null);
  const [starting, setStarting] = useState(false);
  const stops = stopsFor(mode);
  const start = async () => {
    const input = draft.input();
    if (!input) return;
    setStarting(true);
    try {
      await onStart(mode, input, button.current);
    } finally {
      setStarting(false);
    }
  };
  const count = stops.length;
  const modes = (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={mode}
      onValueChange={(value) => {
        if (RUN_MODES.includes(value as ReviewMode)) onModeChange(value as ReviewMode);
      }}
      aria-label="How often the run stops for you"
      className="bg-background"
    >
      {RUN_MODES.map((key) => (
        <ToggleGroupItem
          key={key}
          value={key}
          title={MODES[key].line}
          className="px-3.5 data-[state=on]:bg-foreground data-[state=on]:text-background"
        >
          {MODES[key].label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5 p-5 md:p-6">
          <TopicInput
            draft={draft}
            labelClassName="font-(family-name:--font-lora) font-normal text-[22px] leading-snug"
          />
          <IntentInput draft={draft} />
          <DataField />
          <CaseDetailsInput draft={draft} />
        </div>
        <RunPath stops={stops} className="max-xl:hidden">
          {modes}
          <p className="text-muted-foreground text-xs leading-relaxed">{MODES[mode].line}</p>
        </RunPath>
      </div>
      <RunReadinessPanel readiness={readiness} className="rounded-none border-x-0 border-b-0" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 px-5 py-3.5 md:px-6">
        <span className="flex items-center gap-2 text-muted-foreground text-sm">
          <Flag className="size-3.5 fill-amber-500/30 text-amber-600 dark:text-amber-400" />
          {count ? `Stops ${count === 1 ? "once" : `${count} times`} for your approval` : "Runs without stopping"}
        </span>
        <span className="flex flex-wrap items-center gap-2.5 max-sm:w-full max-sm:justify-between">
          <span className="xl:hidden">{modes}</span>
          <Button ref={button} disabled={!canWrite || starting || !readiness.canStart} onClick={start}>
            <Play />
            {starting ? "Starting…" : "Start research run"}
          </Button>
        </span>
      </div>
    </section>
  );
}

/** How involved you are, and what the run does once it starts: one line per stage, flagged where it waits for you. */
function RunPath({ stops, className, children }: { stops: GateKind[]; className?: string; children: ReactNode }) {
  return (
    <aside className={cn("flex flex-col gap-5 border-l bg-muted/30 p-5", className)}>
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-sm">How involved are you?</h3>
        {children}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-sm">How the run goes</h3>
        <ol className="flex flex-col">
          {PIPELINE.map((p, i) => {
            const charter = p.stage === "scope" && stops.includes("charter");
            const stop = stops.find((k) => k !== "charter" && STOP_INFO[k].stage === p.stage);
            return (
              <li
                key={p.stage}
                title={p.text}
                className="relative flex items-center gap-2.5 py-1.5 text-sm before:absolute before:top-0 before:bottom-0 before:left-[9.5px] before:w-px before:bg-border first:before:top-1/2 last:before:bottom-1/2"
              >
                <span className="relative grid size-5 shrink-0 place-items-center rounded-full border bg-card font-medium text-[10.5px] text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                {(charter || stop) && (
                  <span className="flex shrink-0 items-center gap-1 font-medium text-amber-700 text-xs dark:text-amber-400">
                    <Flag className="size-3 fill-amber-500/30" />
                    {charter ? "you endorse" : "you approve"}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        {LOCKED_PIPELINE.length > 0 && !PIPELINE.some((p) => p.stage === "interpret") && (
          <p className="text-muted-foreground text-xs leading-relaxed">{LOCKED_HINT}</p>
        )}
      </div>
    </aside>
  );
}

/** The end of a run that stops at pipeline stage 8: the hypotheses it picked. */
function HypothesesReady({ state }: { state: RunSession["state"] }) {
  // The last round of hypotheses, without those left out at the review stop or when the run was accepted.
  const key = [...state.stageOrder].reverse().find((k) => state.stages[k]?.content.stage === "hypothesize");
  const content = key ? state.stages[key].content : undefined;
  const picked =
    content?.stage === "hypothesize"
      ? Object.values(content.drafts).filter((d) => d.selected && !content.dropped.includes(d.hypothesis.id))
      : [];
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg bg-muted/70 px-3.5 py-3 text-sm">
      <CircleCheck className="mt-0.5 size-4.5 text-emerald-600" />
      <span className="flex min-w-0 flex-col gap-2">
        <span>
          <b className="block font-semibold">{picked.length} hypotheses ready to test</b>
          <span className="text-muted-foreground text-xs">Each one says what result would prove it wrong.</span>
        </span>
        <span className="flex flex-col gap-1">
          {picked.map((d) => (
            <span key={d.hypothesis.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2 text-xs">
              <b className="rounded bg-primary px-1.5 font-mono font-semibold text-[11px] text-primary-foreground">
                {d.hypothesis.id}
              </b>
              <span className="truncate">{d.hypothesis.statement}</span>
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}

export function LiveRunCard({ session, onOpen }: { session: RunSession; onOpen(from: HTMLElement | null): void }) {
  const { state } = session;
  const card = useRef<HTMLElement>(null);
  const status = displayStatus(state);
  const liveIndex = state.completed ? state.plan.length : state.plan.findIndex((s) => s.key === state.currentStageKey);
  const stage = state.currentStageKey ? state.stages[state.currentStageKey] : undefined;
  const step = stage?.plan.steps.find((s) => s.id === stage.currentStepId);
  const actor = state.message?.actor ?? step?.actor ?? "steward";
  const next = nextStop(state);
  const h1 = finalResults(state).H1;
  const failed = state.lifecycle === "failed";
  const locked = state.plan.length ? LOCKED_PIPELINE.filter((p) => !state.plan.some((s) => s.stage === p.stage)) : [];
  const started = state.startedAt
    ? `started ${new Date(state.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "starting";
  return (
    <motion.section
      ref={card}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col gap-3.5 rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-shadow duration-300",
        state.gate && "shadow-[0_0_0_3px] shadow-amber-500/20 ring-amber-500/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <b className="font-mono font-semibold text-sm">{session.label}</b>
        <StatusPill status={status} />
        <span className="text-muted-foreground text-xs">
          {SHOW_REVIEW_MODE && `${MODES[state.mode].label} mode · `}
          {started}
        </span>
        <Button
          size="sm"
          variant={state.gate ? "default" : state.completed ? "outline" : "default"}
          className={cn("ml-auto", state.gate && "bg-amber-500 text-amber-950 hover:bg-amber-500/85")}
          onClick={() => onOpen(card.current)}
        >
          {state.gate ? "Review now" : state.completed ? "View results" : failed ? "View run" : "Open workspace"}
          <ArrowRight />
        </Button>
      </div>
      <p className="font-(family-name:--font-lora) text-[19px] leading-snug">{state.topic}</p>
      <ol className="flex gap-1 pt-4">
        {state.plan.map((p, i) => {
          const done = i < liveIndex;
          const current = i === liveIndex;
          return (
            <motion.li key={p.key} layout className="relative flex min-w-0 flex-1 flex-col gap-1.5">
              {p.has_gate && (
                <Flag
                  className={cn(
                    "absolute -top-4 -right-1.5 size-3.5",
                    done ? "text-muted-foreground" : "fill-amber-500/25 text-amber-500",
                  )}
                />
              )}
              <i
                className={cn(
                  "relative h-1 overflow-hidden rounded-full bg-muted",
                  done && "bg-foreground",
                  current && (state.gate ? "bg-amber-500" : "bg-sky-500/30"),
                )}
              >
                {current && !state.gate && !failed && (
                  <motion.b
                    className="absolute inset-y-0 w-2/5 rounded-full bg-sky-500"
                    animate={{ x: ["-100%", "250%"] }}
                    transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  />
                )}
              </i>
              <span
                className={cn(
                  "truncate text-[11.5px]",
                  done || current ? "text-foreground" : "text-muted-foreground",
                  current && "font-semibold",
                )}
              >
                {p.round ? `R${p.round} ` : ""}
                {STAGE_SHORT[p.stage]}
              </span>
            </motion.li>
          );
        })}
        {locked.map((p) => (
          <li key={`locked-${p.stage}`} title={LOCKED_HINT} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <i className="mt-px h-0 border-foreground/15 border-t-2 border-dashed" />
            <span className="flex items-center gap-1 truncate text-[11.5px] text-muted-foreground/70">
              <Lock className="size-2.5 shrink-0" />
              {STAGE_SHORT[p.stage]}
              <span className="sr-only">, locked</span>
            </span>
          </li>
        ))}
      </ol>
      {failed ? (
        <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg bg-muted/70 px-3.5 py-3 text-sm">
          <CircleX className="size-4.5 text-destructive" />
          <span>
            <b className="block font-semibold">The run stopped</b>
            <span className="text-muted-foreground text-xs">
              {state.failure ?? "Popper could not finish this run."}
            </span>
          </span>
        </div>
      ) : state.completed && !state.paperTitle ? (
        <HypothesesReady state={state} />
      ) : state.completed ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg bg-muted/70 px-3.5 py-3 text-sm">
          <CircleCheck className="size-4.5 text-emerald-600" />
          <span>
            <b className="block font-semibold">Paper published</b>
            <span className="text-muted-foreground text-xs">
              {h1 && h1.estimate !== null
                ? `Students sleeping 7 h or more scored ${signed(h1.estimate)} points higher.`
                : state.paperTitle}
            </span>
          </span>
        </div>
      ) : state.gate ? (
        <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg bg-amber-500/10 px-3.5 py-3 text-sm">
          <Flag className="size-4 text-amber-700 dark:text-amber-300" />
          <span>
            <b className="block font-semibold">Waiting for you: {inSentence(state.gate.title)}</b>
            <span className="text-muted-foreground text-xs">Nothing runs until you answer.</span>
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg bg-muted/70 px-3.5 py-3 text-sm">
          <AgentAvatar agent={actor} size="sm" />
          <span className="min-w-0">
            <b className="block truncate font-semibold">
              <span className={AGENTS[actor].text}>{AGENTS[actor].name}</span> ·{" "}
              {step?.title ?? stage?.plan.title ?? "Getting started"}
            </b>
            <span className="text-muted-foreground text-xs">
              {state.lifecycle === "paused"
                ? "Paused by you."
                : next
                  ? `Next stop for you: ${inSentence(GATE_TITLE[next.gate])}.`
                  : state.mode === "auto"
                    ? "Auto mode: it won't stop for you."
                    : "No more stops for you."}
            </span>
          </span>
        </div>
      )}
    </motion.section>
  );
}

/** What a run set out to do, in the list of past runs. */
const INTENT_LINE: Record<IntentKind, string> = {
  test: "testing a claim",
  compare: "comparing",
  explain: "explaining an outcome",
  explore_dataset: "exploring a dataset",
};

const ROW =
  "grid w-full grid-cols-[96px_auto_minmax(0,1fr)_auto_16px] items-center gap-4 px-4.5 py-3.5 text-left text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 max-md:grid-cols-[auto_auto_1fr]";

function PastRunRow({ run }: { run: RunItem }) {
  const title = runTitle(run);
  return (
    <>
      <span className="font-mono font-semibold text-xs">{run.label ?? run.id.slice(0, 8)}</span>
      <ManagementStatusBadge status={run.status} />
      <span className="min-w-0 max-md:col-span-3 max-md:row-start-2">
        <b className="block truncate font-medium">{title ?? `Run ${run.id.slice(0, 8)}`}</b>
        <span className="text-muted-foreground text-xs">
          {/* Pipeline runs count tokens, not dollars. */}
          {run.pipeline_key
            ? `${compactNumber(run.tokens_used ?? 0)} of ${compactNumber(run.token_budget ?? 0)} tokens`
            : `$${run.cost_usd} of $${run.budget_usd}`}{" "}
          ·{" "}
          {isWritingRun(run)
            ? isDraftRun(run)
              ? "first draft from the sample results"
              : "paper outline from the sample results"
            : run.pipeline_key
              ? INTENT_LINE[run.case?.intent.kind ?? "test"]
              : run.auto_review
                ? "frame reviews approved automatically"
                : "you review frames"}
        </span>
      </span>
      <span className="whitespace-nowrap text-muted-foreground text-xs max-md:justify-self-end">
        {new Date(run.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
      <ChevronRight className="size-4 text-muted-foreground max-md:hidden" />
    </>
  );
}

/** Earlier runs. A run started from a topic opens in the workspace; older runs open their own page. */
function PastRuns({ projectId, hide }: { projectId: string; hide?: string }) {
  const runs = useInfiniteRuns(projectId, { refetchInterval: (query) => (query.state.error ? false : 15_000) });
  const attachRun = useRunStudio((s) => s.attachRun);
  const openWorkspace = useRunStudio((s) => s.openWorkspace);
  // The run shown in the card above isn't listed again. With nothing to list, the section stays out of the way.
  const list = runs.runs.filter((run) => run.id !== hide);
  if (runs.isSuccess && !list.length) return null;
  return (
    <>
      <SectionTitle title="Past runs" aside={list.length ? String(list.length) : undefined} />
      <ListState
        pending={runs.isPending}
        failed={runs.isError}
        empty={!list.length}
        title="Runs"
        retry={runs.refetch}
      />
      {list.length > 0 && (
        <ul className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {list.map((run) => (
            <li key={run.id} className="border-b last:border-0">
              <button
                type="button"
                className={ROW}
                onClick={(event) => {
                  // A writing run opens in the writing studio.
                  if (isWritingRun(run)) return openWritingRun(projectId, run);
                  attachRun(projectId, run, false);
                  openWorkspace(run.id, event.currentTarget);
                }}
              >
                <PastRunRow run={run} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <LoadMore visible={Boolean(runs.hasNextPage)} pending={runs.isFetching} onClick={runs.loadMore} />
    </>
  );
}

/** The research runs tab: the next run or the one in progress, then earlier runs. */
export function RunStudio({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const session = useProjectRun(projectId);
  const readiness = useRunReadiness(projectId);
  const startRun = useRunStudio((s) => s.startRun);
  const openWorkspace = useRunStudio((s) => s.openWorkspace);
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [mode, setMode] = useState<ReviewMode>("light");
  const from = useRef<HTMLElement | null>(null);
  const finished = Boolean(session && (session.state.completed || session.state.lifecycle === "failed"));
  const canStart = canWrite && (!session || finished);

  // Links elsewhere in the project use `#start-run`: focus the topic box, or open the dialog after a finished run.
  const hasSession = Boolean(session);
  useEffect(() => {
    if (!canStart || window.location.hash !== "#start-run") return;
    if (hasSession) setDialog(true);
    else document.getElementById("composer-topic")?.focus();
  }, [canStart, hasSession]);

  // From the start dialog: close it, then bring the panel that lists what is missing into view.
  const focusTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(focusTimer.current), []);
  const seeMissing = () => {
    setDialog(false);
    window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(focusReadinessPanel, 350);
  };

  // The dialog stays open until the run has started, so a refused start can be fixed and tried again.
  const start = async (chosen: ReviewMode, input: RunInput) => {
    const runId = await startRun(projectId, chosen, input);
    if (!runId) return;
    setDialog(false);
    void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    // Let the dialog close, then grow the workspace out of the card.
    window.setTimeout(() => openWorkspace(runId, document.querySelector("[data-live-run]") ?? from.current), 380);
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {session ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle
              title={finished ? "Latest run" : "Running now"}
              aside={finished ? undefined : "One run at a time per project"}
            />
            {finished && canWrite && (
              <Button onClick={() => setDialog(true)}>
                <Play />
                Start research run
              </Button>
            )}
          </div>
          {finished && canWrite && <RunReadinessPanel readiness={readiness} />}
          <div data-live-run>
            <LiveRunCard session={session} onOpen={(el) => openWorkspace(session.runId, el)} />
          </div>
          <RunStats session={session} />
        </>
      ) : (
        <TopicComposer
          mode={mode}
          onModeChange={setMode}
          canWrite={canWrite}
          readiness={readiness}
          onStart={async (chosen, input, el) => {
            from.current = el;
            await start(chosen, input);
          }}
        />
      )}
      {!session && <RunStats />}
      {SHOW_WRITING_PREVIEW && <WritingRunRow projectId={projectId} canWrite={canWrite} />}
      <PastRuns projectId={projectId} hide={session?.runId} />
      <StartRunDialog
        open={dialog}
        onOpenChange={setDialog}
        defaultMode={mode}
        readiness={readiness}
        onSeeMissing={seeMissing}
        onStart={start}
      />
    </div>
  );
}
