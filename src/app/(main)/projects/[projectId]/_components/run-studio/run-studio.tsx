"use client";

import { useRef, useState } from "react";

import Link from "next/link";

import { cn } from "cn";
import { ArrowRight, ChevronRight, CircleCheck, ExternalLink, Flag, Lightbulb, Play, Plus } from "lucide-react";
import { motion } from "motion/react";

import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInfiniteRuns } from "@/hooks/use-runs-query";
import { researchRunUrl } from "@/lib/research-workspace";
import type { ReviewMode, RunInput } from "@/lib/run-stream/contract";
import { SHOW_DATA_STAGE, SHOW_REVIEW_MODE } from "@/lib/run-stream/features";
import { DATASET } from "@/lib/run-stream/mock/scenario";
import { type RunSession, useProjectRun, useRunStudio } from "@/lib/run-stream/run-store";
import { displayStatus, finalResults, GATE_TITLE, nextStop, signed } from "@/lib/run-stream/selectors";

import { ListState, LoadMore } from "../workspace-ui";
import { AgentAvatar, StatusPill } from "./run-bits";
import { AGENTS, MODES, PIPELINE, STAGE_SHORT, STOP_INFO, stopsFor } from "./run-meta";
import { StartRunDialog } from "./start-run-dialog";

function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="-mb-2 flex items-baseline gap-2">
      <h2 className="font-semibold text-[15px]">{title}</h2>
      {aside && <span className="text-muted-foreground text-xs">{aside}</span>}
    </div>
  );
}

function StartCard({
  mode,
  onStart,
  canWrite,
}: {
  mode: ReviewMode;
  onStart(from: HTMLElement | null): void;
  canWrite: boolean;
}) {
  const meta = MODES[mode];
  const button = useRef<HTMLButtonElement>(null);
  const stops = stopsFor(mode);
  const nouns = stops.map((k) => STOP_INFO[k].noun);
  const approves = nouns.length > 1 ? `${nouns.slice(0, -1).join(", ")} and ${nouns[nouns.length - 1]}` : nouns[0];
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
    >
      <div className="flex min-w-0 flex-col gap-4.5 p-6">
        <div>
          <span className="flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Next research run
            <Badge variant="outline" className="normal-case tracking-normal">
              Mock stream
            </Badge>
          </span>
          <p className="font-(family-name:--font-lora) mt-2 text-[22px] leading-snug">Start from a topic</p>
          <p className="mt-1.5 max-w-[60ch] text-muted-foreground text-sm">
            Type one question. Popper writes the goal, splits it into sub-questions, reads the literature and proposes
            hypotheses before any code runs.
          </p>
        </div>
        <dl className="grid grid-cols-1 border-t text-sm sm:grid-cols-[110px_minmax(0,1fr)]">
          <dt className="border-b py-2.5 text-muted-foreground max-sm:border-b-0 max-sm:pb-0">Topic</dt>
          <dd className="border-b py-2.5">
            You type it when you start{" "}
            <span className="text-muted-foreground text-xs">· sub-questions are derived from it</span>
          </dd>
          {SHOW_DATA_STAGE && (
            <>
              <dt className="border-b py-2.5 text-muted-foreground max-sm:border-b-0 max-sm:pb-0">Data</dt>
              <dd className="border-b py-2.5">
                {DATASET.name} · v1{" "}
                <span className="text-muted-foreground text-xs">· 1,240 rows, checked by the Steward first</span>
              </dd>
            </>
          )}
          <dt className="border-b py-2.5 text-muted-foreground max-sm:border-b-0 max-sm:pb-0">
            {SHOW_REVIEW_MODE ? "Review mode" : "Stops for you"}
          </dt>
          <dd className="border-b py-2.5">
            {SHOW_REVIEW_MODE && `${meta.label} `}
            <span className={cn(SHOW_REVIEW_MODE && "text-muted-foreground text-xs")}>
              {SHOW_REVIEW_MODE && "· "}
              {nouns.length
                ? `${SHOW_REVIEW_MODE ? "you" : "Once:"} approve ${approves}`
                : "never stops; the PI decides"}
            </span>
          </dd>
        </dl>
        <ul className="flex flex-col gap-2 text-muted-foreground text-sm">
          <li className="grid grid-cols-[16px_1fr] gap-2.5">
            <ExternalLink className="mt-0.5 size-3.5" />A live workspace opens where you can watch each agent work,
            stage by stage.
          </li>
          <li className="grid grid-cols-[16px_1fr] gap-2.5">
            <Flag className="mt-0.5 size-3.5" />
            It only stops at the flagged steps. Leave any time; the sidebar shows when it needs you.
          </li>
        </ul>
        <div className="mt-auto flex flex-wrap items-center gap-3.5">
          <Button ref={button} size="lg" disabled={!canWrite} onClick={() => onStart(button.current)}>
            <Play />
            Start a research run
          </Button>
          <span className="text-muted-foreground text-xs">You can change any of these before it starts.</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4 border-t bg-muted/45 p-6 lg:border-t-0 lg:border-l">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          What the agents will do
        </span>
        <ol className="flex flex-col">
          {PIPELINE.map((p, i) => {
            const stop = stops.find((k) => STOP_INFO[k].stage === p.stage);
            return (
              <motion.li
                key={p.stage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-3 pb-3.5 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-6 [&:not(:last-child)]:before:bottom-0.5 [&:not(:last-child)]:before:left-[10.5px] [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-foreground/20"
              >
                <span className="grid size-[22px] place-items-center rounded-full border bg-card font-mono font-semibold text-[10.5px] text-muted-foreground">
                  {i + 1}
                </span>
                <span>
                  <b className="flex flex-wrap items-center gap-2 font-semibold text-sm">
                    {p.title}
                    {stop && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 py-px pr-2 pl-1.5 font-medium text-[11px] text-amber-800 dark:text-amber-300">
                        <Flag className="size-2.5" />
                        then {STOP_INFO[stop].verb}
                      </span>
                    )}
                  </b>
                  <span className="text-muted-foreground text-xs">{p.text}</span>
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
          <p className="text-muted-foreground text-xs">
            For now a run ends once the hypotheses are picked. Experiments, the report and the paper come later.
          </p>
        )}
      </div>
    </motion.section>
  );
}

/** The end of a run that stops at pipeline stage 8: the hypotheses it picked. */
function HypothesesReady({ state }: { state: RunSession["state"] }) {
  const stage = Object.values(state.stages).find((s) => s.content.stage === "hypothesize");
  const picked =
    stage?.content.stage === "hypothesize" ? Object.values(stage.content.drafts).filter((d) => d.selected) : [];
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
          {SHOW_REVIEW_MODE && `${MODES[state.mode].label} mode · `}started today · mock stream
        </span>
        <Button
          size="sm"
          variant={state.gate ? "default" : state.completed ? "outline" : "default"}
          className={cn("ml-auto", state.gate && "bg-amber-500 text-amber-950 hover:bg-amber-500/85")}
          onClick={() => onOpen(card.current)}
        >
          {state.gate ? "Review now" : state.completed ? "View results" : "Open workspace"}
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
                {current && !state.gate && (
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
      </ol>
      {state.completed && !state.paperTitle ? (
        <HypothesesReady state={state} />
      ) : state.completed ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-muted/70 px-3.5 py-3 text-sm max-sm:grid-cols-[auto_minmax(0,1fr)]">
          <CircleCheck className="size-4.5 text-emerald-600" />
          <span>
            <b className="block font-semibold">Paper published to Findings</b>
            <span className="text-muted-foreground text-xs">
              {h1 && h1.estimate !== null
                ? `Students sleeping 7 h or more scored ${signed(h1.estimate)} points higher.`
                : state.paperTitle}
            </span>
          </span>
          <Button variant="ghost" size="sm" asChild className="max-sm:col-span-2 max-sm:justify-self-start">
            <Link href={`/projects/${session.projectId}/findings`}>
              <Lightbulb />
              Open in Findings
            </Link>
          </Button>
        </div>
      ) : state.gate ? (
        <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg bg-amber-500/10 px-3.5 py-3 text-sm">
          <Flag className="size-4 text-amber-700 dark:text-amber-300" />
          <span>
            <b className="block font-semibold">Waiting for you: {state.gate.title.toLowerCase()}</b>
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
                  ? `Next stop for you: ${GATE_TITLE[next.gate].toLowerCase()}.`
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

function PastRuns({ projectId }: { projectId: string }) {
  const runs = useInfiniteRuns(projectId, { refetchInterval: (query) => (query.state.error ? false : 15_000) });
  return (
    <>
      <SectionTitle title="Past runs" aside={runs.runs.length ? String(runs.runs.length) : undefined} />
      <ListState
        pending={runs.isPending}
        failed={runs.isError}
        empty={!runs.runs.length}
        title="Runs"
        retry={runs.refetch}
      />
      {runs.runs.length > 0 && (
        <ul className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {runs.runs.map((run) => (
            <li key={run.id} className="border-b last:border-0">
              <Link
                prefetch={false}
                href={researchRunUrl(projectId, run.id)}
                className="grid grid-cols-[96px_auto_minmax(0,1fr)_auto_16px] items-center gap-4 px-4.5 py-3.5 text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 max-md:grid-cols-[auto_auto_1fr]"
              >
                <span className="font-mono font-semibold text-xs">{run.id.slice(0, 8)}</span>
                <ManagementStatusBadge status={run.status} />
                <span className="min-w-0 max-md:col-span-3 max-md:row-start-2">
                  <b className="block truncate font-medium">
                    Context v{run.research_context_version} · dataset v{run.dataset_version_number}
                  </b>
                  <span className="text-muted-foreground text-xs">
                    ${run.cost_usd} of ${run.budget_usd} ·{" "}
                    {run.auto_review ? "frame reviews approved automatically" : "you review frames"}
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
              </Link>
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
  const discardRun = useRunStudio((s) => s.discardRun);
  const [dialog, setDialog] = useState(false);
  const [mode] = useState<ReviewMode>("copilot");
  const from = useRef<HTMLElement | null>(null);

  const start = (chosen: ReviewMode, input: RunInput) => {
    setDialog(false);
    if (session) discardRun(projectId);
    const runId = startRun(projectId, chosen, input);
    // Let the dialog close, then grow the workspace out of the card.
    window.setTimeout(() => openWorkspace(runId, document.querySelector("[data-live-run]") ?? from.current), 380);
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {session ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle
              title={session.state.completed ? "Latest run" : "Running now"}
              aside={session.state.completed ? undefined : "One run at a time per project"}
            />
            {session.state.completed && canWrite && (
              <Button variant="outline" size="sm" onClick={() => setDialog(true)}>
                <Plus />
                Start a research run
              </Button>
            )}
          </div>
          <div data-live-run>
            <LiveRunCard session={session} onOpen={(el) => openWorkspace(session.runId, el)} />
          </div>
        </>
      ) : (
        <StartCard
          mode={mode}
          canWrite={canWrite}
          onStart={(el) => {
            from.current = el;
            setDialog(true);
          }}
        />
      )}
      <PastRuns projectId={projectId} />
      <StartRunDialog open={dialog} onOpenChange={setDialog} defaultMode={mode} onStart={start} />
    </div>
  );
}
