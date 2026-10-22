"use client";

import { type RefObject, useEffect, useState } from "react";

import { cn } from "cn";
import { ArrowRight, Check, CircleCheck, FileText } from "lucide-react";
import { motion } from "motion/react";

import type { Figure, KnowledgeCard, PlannedStage } from "@/lib/run-stream/contract";
import type { RunState, StageState } from "@/lib/run-stream/run-state";
import { liveStageKey, pipelineLabel } from "@/lib/run-stream/selectors";

import { AnimatedNumber } from "./animated-number";
import { AgentAvatar, PulseDot } from "./run-bits";
import { DataScene } from "./scenes/data-scene";
import { ExperimentScene } from "./scenes/experiment-scene";
import { HypothesizeScene } from "./scenes/hypothesize-scene";
import { InterpretScene } from "./scenes/interpret-scene";
import { MapScene } from "./scenes/map-scene";
import { PaperScene } from "./scenes/paper-scene";
import { ReadScene } from "./scenes/read-scene";
import { ReportScene } from "./scenes/report-scene";
import { SceneNote } from "./scenes/scene-ui";
import { ScopeScene } from "./scenes/scope-scene";
import { ScreenScene } from "./scenes/screen-scene";
import { SearchScene } from "./scenes/search-scene";
import { SynthesizeScene } from "./scenes/synthesize-scene";
import { WriteScene } from "./scenes/write-scene";

const set = (content: Extract<StageState["content"], { stage: "hypothesize" }>) =>
  Object.values(content.drafts).filter((d) => d.selected);

/** Hypotheses left out, at the review stop or when the run was accepted, from the last round of hypotheses. */
function dropped(state: RunState) {
  const key = [...state.stageOrder].reverse().find((k) => state.stages[k]?.content.stage === "hypothesize");
  const content = key ? state.stages[key].content : undefined;
  return content?.stage === "hypothesize" ? content.dropped.length : 0;
}

/** Counts up from zero after a delay, so the trail fills in left to right. */
function CountUp({ value, delay }: { value: number; delay: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(value), delay * 1000);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return <AnimatedNumber value={shown} duration={700} className="font-semibold text-2xl tabular-nums tracking-tight" />;
}

/** Where a run that stops at hypotheses ends: the whole trail from topic to hypotheses, in numbers. */
function RunEnd({ state, count }: { state: RunState; count: number }) {
  const content = <S extends StageState["content"]["stage"]>(key: string, stage: S) => {
    const c = state.stages[key]?.content;
    return c?.stage === stage ? (c as Extract<StageState["content"], { stage: S }>) : undefined;
  };
  const scope = content("scope", "scope");
  const search = content("search", "search");
  const screen = content("screen", "screen");
  const read = content("read", "read");
  const synth = content("synthesize", "synthesize");
  const trail = [
    { label: "Sub-questions", value: scope?.subQuestions.length ?? 0, from: "your topic" },
    { label: "Papers found", value: search?.collected?.unique ?? 0, from: `${search?.collected?.raw ?? 0} hits` },
    {
      label: "Kept to read",
      value: (screen?.kept.length ?? 0) - (screen?.dropped.length ?? 0),
      from: "relevance × quality",
    },
    { label: "Knowledge cards", value: read?.cards.length ?? 0, from: "one per paper" },
    { label: "Gaps", value: synth?.gaps.length ?? 0, from: "from the limitations" },
    { label: "Hypotheses", value: count, from: "each can be proved wrong" },
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4 rounded-xl bg-emerald-500/6 px-4 py-4 ring-1 ring-emerald-500/30"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
        <CircleCheck className="mt-0.5 size-5 text-emerald-600" />
        <div>
          <b className="block font-semibold">Run finished · {count} hypotheses ready to test</b>
          <p className="text-muted-foreground text-sm">
            Everything below was built from your topic alone. Testing the hypotheses is the next phase, switched off for
            now.
          </p>
        </div>
      </div>
      <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-emerald-500/20 sm:grid-cols-3 xl:grid-cols-6">
        {trail.map((step, i) => (
          <motion.li
            key={step.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 + i * 0.18, duration: 0.35 }}
            className={cn(
              "relative flex flex-col gap-0.5 bg-card px-3 py-2.5",
              i === trail.length - 1 && "bg-emerald-500/10",
            )}
          >
            <span className="font-mono text-[10.5px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <CountUp value={step.value} delay={0.5 + i * 0.18} />
            <span className="font-medium text-sm">{step.label}</span>
            <span className="text-muted-foreground text-xs">{step.from}</span>
            {i < trail.length - 1 && (
              <ArrowRight className="absolute top-3 right-2.5 hidden size-3.5 text-emerald-600/60 xl:block" />
            )}
          </motion.li>
        ))}
      </ol>
    </motion.section>
  );
}

/** What the stage builds on and what it writes, so the hand-offs between stages stay visible. */
function Lineage({ stage }: { stage: StageState }) {
  const reads = stage.plan.reads ?? [];
  const writes = stage.plan.steps.filter((s) => s.artifact);
  if (!reads.length && !writes.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
      <span className="text-muted-foreground">Builds on</span>
      {reads.map((r) => (
        <span key={r} className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-foreground/80">
          {r}
        </span>
      ))}
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">Writes</span>
      {writes.map((step) => {
        const made = stage.doneStepIds.includes(step.id);
        const making = stage.currentStepId === step.id;
        return (
          <motion.span
            key={step.id}
            layout
            className={cn(
              "relative inline-flex h-6 items-center gap-1 overflow-hidden rounded-md border px-2 transition-colors duration-500",
              made
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "border-foreground/20 border-dashed text-muted-foreground",
              making && "border-sky-500/50 border-solid text-foreground",
            )}
          >
            {making && (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-sky-500/15 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "220%" }}
                transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              />
            )}
            {made ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <Check className="size-3" />
              </motion.span>
            ) : (
              <FileText className="size-3" />
            )}
            <span className="relative">{step.artifact}</span>
          </motion.span>
        );
      })}
    </div>
  );
}

function StageHeader({
  stage,
  index,
  total,
  showRound,
  planned,
  ended,
}: {
  stage: StageState;
  index: number;
  total: number;
  showRound: boolean;
  /** The run stopped or failed: a stage it did not finish no longer goes on. */
  ended?: boolean;
  /** This stage in the run's latest plan: a round learns its number once the next round exists. */
  planned?: PlannedStage;
}) {
  const plan = {
    ...stage.plan,
    round: planned?.round ?? stage.plan.round,
    round_kind: planned?.round_kind ?? stage.plan.round_kind,
  };
  const done = stage.status === "done";
  return (
    <header className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2 border-b pb-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span className="pt-1 font-mono text-muted-foreground text-xs">
        {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 font-semibold text-lg tracking-tight">
          {plan.title}
          {pipelineLabel(plan.pipeline) && (
            <span
              title="Popper pipeline stages this screen covers"
              className="rounded-md px-1.5 py-0.5 font-medium font-mono text-[11.5px] text-muted-foreground ring-1 ring-foreground/10"
            >
              {pipelineLabel(plan.pipeline)}
            </span>
          )}
          {showRound && plan.round && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium font-mono text-[11.5px] text-muted-foreground">
              Round {plan.round}
              {
                {
                  pivot: " · new direction",
                  refine: " · rerun",
                  revise: " · revision",
                  review: " · revised for the reviewer",
                  first: "",
                }[plan.round_kind ?? "first"]
              }
            </span>
          )}
        </h2>
        <p className="mt-1 max-w-[68ch] text-muted-foreground text-sm">{plan.purpose}</p>
        <Lineage stage={stage} />
        {done && stage.summary && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-2 font-medium text-sm"
          >
            <CircleCheck className="size-3.5 text-emerald-600" />
            {stage.summary}
          </motion.p>
        )}
      </div>
      <div className="col-start-2 flex items-center gap-3 sm:col-start-3 sm:pt-0.5">
        <div className="flex pl-2">
          {plan.cast.map((role) => (
            <span key={role} className="-ml-2 rounded-full bg-background p-0.5">
              <AgentAvatar agent={role} />
            </span>
          ))}
        </div>
        {done ? (
          <motion.span
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            className="inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 font-medium text-emerald-700 text-xs dark:text-emerald-300"
          >
            <Check className="size-3" />
            Done
          </motion.span>
        ) : ended ? (
          <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 font-medium text-muted-foreground text-xs">
            Not finished
          </span>
        ) : (
          <span className="inline-flex h-6 items-center gap-2 rounded-full bg-sky-500/12 px-2.5 font-medium text-sky-700 text-xs dark:text-sky-300">
            <PulseDot className="bg-sky-500" />
            In progress
          </span>
        )}
      </div>
    </header>
  );
}

export function StageScreen({
  state,
  stageKey,
  runLabel,
  live,
  scroller,
  onOpenReport,
  onClose,
}: {
  state: RunState;
  stageKey: string;
  runLabel: string;
  live: boolean;
  scroller: RefObject<HTMLElement | null>;
  onOpenReport(): void;
  onClose(): void;
}) {
  const report = state.stages.report?.content;
  const figures: Figure[] = report?.stage === "report" ? report.figures : [];

  if (stageKey === "done") {
    const write = state.stages.write?.content;
    if (write?.stage !== "write") return null;
    return (
      <div className="flex flex-col gap-5">
        <header className="flex flex-wrap items-start gap-3 border-b pb-3.5">
          <CircleCheck className="mt-1 size-4 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-lg tracking-tight">The paper</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Published to Findings. Every number links back to the report; hover one to see where it came from.
            </p>
          </div>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 font-medium text-emerald-700 text-xs dark:text-emerald-300">
            <Check className="size-3" />
            Published
          </span>
        </header>
        <PaperScene
          state={state}
          paper={write}
          figures={figures}
          runLabel={runLabel}
          scroller={scroller}
          onOpenReport={onOpenReport}
          onClose={onClose}
        />
      </div>
    );
  }

  const stage = state.stages[stageKey];
  if (!stage) return null;
  const index = state.plan.findIndex((s) => s.key === stageKey);
  const { content } = stage;
  const notes = state.decisions.filter((d) => d.stageKey === stageKey);
  // The step running now; frames waiting on it pulse, the others stay still.
  const step = live ? stage.currentStepId : null;

  let scene: React.ReactNode = null;
  const decisionNotes = notes.map((n) => (
    <SceneNote key={n.seq} actor={n.actor} title="Your decision" text={n.text} note={n.note} />
  ));
  if (content.stage === "data") scene = <DataScene data={content} live={live} />;
  if (content.stage === "scope") {
    scene = (
      <>
        <ScopeScene data={content} topic={state.topic} domains={state.domains} live={live} step={step} />
        {decisionNotes}
      </>
    );
  }
  if (content.stage === "search") scene = <SearchScene data={content} live={live} />;
  if (content.stage === "screen")
    scene = (
      <>
        <ScreenScene data={content} live={live} step={step} />
        {decisionNotes}
      </>
    );
  if (content.stage === "read") {
    const screen = state.stages.screen?.content;
    const shortlist = screen?.stage === "screen" ? screen.kept.filter((p) => !screen.dropped.includes(p.id)) : [];
    scene = <ReadScene data={content} shortlist={shortlist} live={live} step={step} />;
  }
  if (content.stage === "synthesize") {
    const read = state.stages.read?.content;
    const cards: KnowledgeCard[] = read?.stage === "read" ? read.cards : [];
    scene = <SynthesizeScene data={content} cards={cards} live={live} />;
  }
  if (content.stage === "hypothesize") {
    const synthesis = state.stages.synthesize?.content;
    scene = (
      <HypothesizeScene
        data={content}
        tensions={synthesis?.stage === "synthesize" ? synthesis.tensions : []}
        round={stage.plan.round ?? 1}
        stageKey={stageKey}
        decisions={state.decisions}
        live={live}
        step={step}
      />
    );
  }
  if (content.stage === "map")
    scene = (
      <>
        <MapScene data={content} topic={state.topic} runLabel={runLabel} date={state.startedAt} live={live} />
        {decisionNotes}
      </>
    );
  if (content.stage === "experiment") scene = <ExperimentScene data={content} live={live} />;
  if (content.stage === "interpret")
    scene = (
      <InterpretScene
        data={content}
        round={stage.plan.round ?? 1}
        stageKey={stageKey}
        decisions={state.decisions}
        live={live}
      />
    );
  if (content.stage === "report")
    scene = (
      <>
        <ReportScene
          data={content}
          runLabel={runLabel}
          rounds={state.plan.filter((s) => s.stage === "interpret").length}
          live={live}
        />
        {notes.map((n) => (
          <SceneNote key={n.seq} actor={n.actor} title="Your decision" text={n.text} note={n.note} />
        ))}
      </>
    );
  if (content.stage === "write")
    scene = <WriteScene stage={stage} figures={figures} runLabel={runLabel} decisions={state.decisions} live={live} />;

  const endsHere = state.completed && !state.paperTitle && stageKey === liveStageKey(state);
  return (
    <div className="flex flex-col gap-5">
      <StageHeader
        stage={stage}
        index={index}
        total={state.plan.length}
        showRound={state.plan.filter((s) => s.stage === "hypothesize").length > 1}
        planned={state.plan.find((s) => s.key === stageKey)}
        ended={state.lifecycle === "failed"}
      />
      {endsHere && content.stage === "hypothesize" && <RunEnd state={state} count={set(content).length} />}
      {endsHere && content.stage === "map" && (
        <RunEnd state={state} count={content.nodes.filter((n) => n.type === "hypothesis").length - dropped(state)} />
      )}
      {scene}
    </div>
  );
}
