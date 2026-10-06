"use client";

import type { RefObject } from "react";

import { Check, CircleCheck } from "lucide-react";
import { motion } from "motion/react";

import type { Figure } from "@/lib/run-stream/contract";
import type { RunState, StageState } from "@/lib/run-stream/run-state";

import { AgentAvatar, PulseDot } from "./run-bits";
import { DataScene } from "./scenes/data-scene";
import { ExperimentScene } from "./scenes/experiment-scene";
import { HypothesizeScene } from "./scenes/hypothesize-scene";
import { InterpretScene } from "./scenes/interpret-scene";
import { PaperScene } from "./scenes/paper-scene";
import { ReportScene } from "./scenes/report-scene";
import { SceneNote } from "./scenes/scene-ui";
import { UnderstandScene } from "./scenes/understand-scene";
import { WriteScene } from "./scenes/write-scene";

function StageHeader({ stage, index, total }: { stage: StageState; index: number; total: number }) {
  const { plan } = stage;
  const done = stage.status === "done";
  return (
    <header className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2 border-b pb-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span className="pt-1 font-mono text-muted-foreground text-xs">
        {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 font-semibold text-lg tracking-tight">
          {plan.title}
          {plan.round && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium font-mono text-[11.5px] text-muted-foreground">
              Round {plan.round}
              {plan.round_kind === "pivot" ? " · new direction" : plan.round_kind === "refine" ? " · rerun" : ""}
            </span>
          )}
        </h2>
        <p className="mt-1 max-w-[68ch] text-muted-foreground text-sm">{plan.purpose}</p>
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
        <div className="flex pl-1.5">
          {plan.cast.map((role) => (
            <AgentAvatar key={role} agent={role} size="sm" className="-ml-1.5 ring-2 ring-background" />
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
  onOpenFindings,
  onClose,
}: {
  state: RunState;
  stageKey: string;
  runLabel: string;
  live: boolean;
  scroller: RefObject<HTMLElement | null>;
  onOpenReport(): void;
  onOpenFindings(): void;
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
          onOpenFindings={onOpenFindings}
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

  let scene: React.ReactNode = null;
  if (content.stage === "data") scene = <DataScene data={content} live={live} />;
  if (content.stage === "understand")
    scene = (
      <>
        <UnderstandScene data={content} question={state.question} live={live} />
        {notes.map((n) => (
          <SceneNote key={n.seq} actor={n.actor} title="Your decision" text={n.text} note={n.note} />
        ))}
      </>
    );
  if (content.stage === "hypothesize")
    scene = (
      <HypothesizeScene
        data={content}
        round={stage.plan.round ?? 1}
        stageKey={stageKey}
        decisions={state.decisions}
        live={live}
      />
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

  return (
    <div className="flex flex-col gap-5">
      <StageHeader stage={stage} index={index} total={state.plan.length} />
      {scene}
    </div>
  );
}
