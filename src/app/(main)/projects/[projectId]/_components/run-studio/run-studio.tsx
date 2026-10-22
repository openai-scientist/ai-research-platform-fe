"use client";

import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { ArrowRight, ChevronRight, CircleCheck, CircleX, Database, Flag, Lock, Play, Plus, Upload } from "lucide-react";
import { motion } from "motion/react";

import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldTitle } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInfiniteRuns } from "@/hooks/use-runs-query";
import { projectKeys } from "@/lib/api/query-keys";
import type { RunItem } from "@/lib/api/services/fetch-runs";
import type { ReviewMode, RunInput } from "@/lib/run-stream/contract";
import { SHOW_DATA_STAGE, SHOW_REVIEW_MODE } from "@/lib/run-stream/features";
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
import { compactNumber, RunStats } from "./run-stats";
import { FieldsInput, StartRunDialog, TopicInput, useTopicDraft } from "./start-run-dialog";

function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="-mb-2 flex items-baseline gap-2">
      <h2 className="font-semibold text-[15px]">{title}</h2>
      {aside && <span className="text-muted-foreground text-xs">{aside}</span>}
    </div>
  );
}

/** Your own data. A run starts from the topic alone for now, so choosing data stays locked. */
function DataField() {
  if (SHOW_DATA_STAGE)
    return (
      <Field>
        <FieldTitle>Data</FieldTitle>
        <p className="text-sm">
          {DATASET.name} · v1{" "}
          <span className="text-muted-foreground text-xs">· 1,240 rows, checked by the Steward first</span>
        </p>
      </Field>
    );
  return (
    <Field>
      <FieldTitle>
        Data
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-px font-medium text-[11px] text-muted-foreground">
          <Lock className="size-2.5" />
          Coming soon
        </span>
      </FieldTitle>
      <div className="flex flex-wrap gap-2" title="Coming soon. For now a run starts from your topic alone.">
        <Button variant="outline" size="sm" disabled>
          <Upload />
          Upload a dataset
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Database />
          Choose existing
        </Button>
      </div>
      <FieldDescription>
        For now a run starts from your topic alone. Your own data comes in with experiments.
      </FieldDescription>
    </Field>
  );
}

/** The next run, started right here: type the topic, keep its fields, start. */
function TopicComposer({
  mode,
  onModeChange,
  canWrite,
  onStart,
}: {
  mode: ReviewMode;
  onModeChange(mode: ReviewMode): void;
  canWrite: boolean;
  /** Settles once the run has started or was refused. */
  onStart(mode: ReviewMode, input: RunInput, from: HTMLElement | null): Promise<void>;
}) {
  const draft = useTopicDraft();
  const button = useRef<HTMLButtonElement>(null);
  const [starting, setStarting] = useState(false);
  const stops = stopsFor(mode);
  const nouns = stops.map((k) => STOP_INFO[k].noun);
  const approves = nouns.length > 1 ? `${nouns.slice(0, -1).join(", ")} and ${nouns[nouns.length - 1]}` : nouns[0];
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
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <div className="flex flex-col gap-5 p-5 md:p-6">
        <span className="flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Next research run
        </span>
        <TopicInput
          draft={draft}
          id="composer-topic"
          label="What do you want to find out?"
          className="font-(family-name:--font-lora) font-normal text-[22px] leading-snug"
        />
        <div className="grid gap-5 md:grid-cols-2">
          <FieldsInput draft={draft} id="composer-field" />
          <DataField />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <span className="flex min-w-0 max-w-[60ch] items-start gap-2 text-muted-foreground text-xs">
            <Flag className="mt-px size-3.5 shrink-0" />
            {nouns.length
              ? `It stops ${nouns.length === 1 ? "once" : `${nouns.length} times`}, for ${approves}. A live workspace opens, and you can leave any time.`
              : "It never stops; the PI makes every call. A live workspace opens, and you can leave any time."}
          </span>
          <span className="flex flex-wrap items-center gap-2.5 max-sm:w-full max-sm:justify-between">
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={mode}
              onValueChange={(value) => {
                if (RUN_MODES.includes(value as ReviewMode)) onModeChange(value as ReviewMode);
              }}
              aria-label="How often the run stops for you"
            >
              {RUN_MODES.map((key) => (
                <ToggleGroupItem key={key} value={key} title={MODES[key].line} className="px-3.5">
                  {MODES[key].label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button ref={button} size="lg" disabled={!canWrite || !draft.ready || starting} onClick={start}>
              <Play />
              {starting ? "Starting…" : "Start research run"}
            </Button>
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 border-t bg-muted/45 px-5 py-4.5 md:px-6">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">What happens next</span>
        <ol className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((p, i) => {
            // The charter is endorsed before Scope starts; any other stop comes after its stage.
            const charter = p.stage === "scope" && stops.includes("charter");
            const stop = stops.find((k) => k !== "charter" && STOP_INFO[k].stage === p.stage);
            return (
              <motion.li
                key={p.stage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5"
              >
                <span className="grid size-[22px] place-items-center rounded-full border bg-card font-mono font-semibold text-[10.5px] text-muted-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <b className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-sm">
                    {p.title}
                    {charter && (
                      <span
                        title={STOP_INFO.charter.what}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 py-px pr-2 pl-1.5 font-medium text-[11px] text-amber-800 dark:text-amber-300"
                      >
                        <Flag className="size-2.5" />
                        once you endorse the plan
                      </span>
                    )}
                    {stop && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 py-px pr-2 pl-1.5 font-medium text-[11px] text-amber-800 dark:text-amber-300">
                        <Flag className="size-2.5" />
                        then {STOP_INFO[stop].verb}
                      </span>
                    )}
                  </b>
                  <span className="mt-0.5 block text-muted-foreground text-xs">{p.text}</span>
                </span>
              </motion.li>
            );
          })}
        </ol>
        {PIPELINE.some((p) => p.stage === "interpret") ? (
          <p className="text-muted-foreground text-xs">
            Steps {PIPELINE.findIndex((p) => p.stage === "hypothesize") + 1} to{" "}
            {PIPELINE.findIndex((p) => p.stage === "interpret") + 1} can repeat if the PI decides another round is worth
            it.
          </p>
        ) : (
          LOCKED_PIPELINE.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t pt-3.5">
              <span className="mr-1 text-muted-foreground text-xs">
                Runs end at the hypotheses for now. Coming later:
              </span>
              {LOCKED_PIPELINE.map((p) => (
                <span
                  key={p.stage}
                  title={`${p.title}: ${p.text}`}
                  className="inline-flex h-6 items-center gap-1.5 rounded-full border border-dashed px-2.5 text-muted-foreground text-xs"
                >
                  <Lock className="size-3" />
                  {STAGE_SHORT[p.stage]}
                </span>
              ))}
            </div>
          )
        )}
      </div>
    </motion.section>
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

const ROW =
  "grid w-full grid-cols-[96px_auto_minmax(0,1fr)_auto_16px] items-center gap-4 px-4.5 py-3.5 text-left text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 max-md:grid-cols-[auto_auto_1fr]";

function PastRunRow({ run }: { run: RunItem }) {
  return (
    <>
      <span className="font-mono font-semibold text-xs">
        {run.topic ? (run.label ?? run.id.slice(0, 8)) : run.id.slice(0, 8)}
      </span>
      <ManagementStatusBadge status={run.status} />
      <span className="min-w-0 max-md:col-span-3 max-md:row-start-2">
        <b className="block truncate font-medium">{run.topic ?? run.label ?? `Run ${run.id.slice(0, 8)}`}</b>
        <span className="text-muted-foreground text-xs">
          {/* Pipeline runs count tokens, not dollars. */}
          {run.pipeline_key
            ? `${compactNumber(run.tokens_used ?? 0)} of ${compactNumber(run.token_budget ?? 0)} tokens`
            : `$${run.cost_usd} of $${run.budget_usd}`}{" "}
          ·{" "}
          {run.topic
            ? "from a topic to hypotheses"
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
              <Button variant="outline" size="sm" onClick={() => setDialog(true)}>
                <Plus />
                Start a research run
              </Button>
            )}
          </div>
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
          onStart={async (chosen, input, el) => {
            from.current = el;
            await start(chosen, input);
          }}
        />
      )}
      <PastRuns projectId={projectId} hide={session?.runId} />
      <StartRunDialog open={dialog} onOpenChange={setDialog} defaultMode={mode} onStart={start} />
    </div>
  );
}
