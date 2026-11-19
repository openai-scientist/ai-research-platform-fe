"use client";

import { useEffect, useRef } from "react";

import { cn } from "cn";
import { Flag } from "lucide-react";
import { motion } from "motion/react";

import {
  activeAgent,
  charterPending,
  DATASET_CAST,
  type DatasetAgent,
  type DatasetRunModel,
  datasetStepArtifact,
  nextStopFor,
  outcomePending,
  type StepView,
} from "@/lib/run-stream/dataset-run-model";
import type { RunDisplayStatus } from "@/lib/run-stream/selectors";

import { AgentStrip, RunAsidePanel, StageRules, StageSteps, WaitingForYou } from "../run-studio/aside-ui";
import { ReleaseReviewIcon, RunFailureMessage } from "../run-studio/local-node-status";
import { AgentAvatar, Caret, TypedLine, WorkOrb } from "../run-studio/run-bits";
import { AGENTS } from "../run-studio/run-meta";
import { useElapsed } from "./dataset-run-scene";

export interface AsideProps {
  model: DatasetRunModel;
  steps: StepView[];
  status: RunDisplayStatus;
  local: boolean;
  /** Type out narration that arrives as whole lines. */
  typing?: boolean;
}

const nameOf = (actor: DatasetAgent) => (actor === "you" ? "You" : AGENTS[actor].name);
const isEnded = (status: RunDisplayStatus) => status === "completed" || status === "failed" || status === "stopped";

export function DatasetNowCard({
  model,
  steps,
  status,
  compact,
  typing = false,
}: Pick<AsideProps, "model" | "steps" | "status" | "typing"> & { compact?: boolean }) {
  const current = steps.find((s) => s.state === "now" || s.state === "asking");
  const index = current ? steps.indexOf(current) : -1;
  const speaker = isEnded(status) ? null : (model.message?.actor ?? current?.actor ?? null);
  const moving = status === "running" || status === "waiting";
  const done = steps.filter((s) => s.state === "done").length;
  const elapsed = useElapsed(model.progress);

  if (status === "completed")
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
        <span className="text-muted-foreground text-xs">Finished</span>
        <h3 className="font-semibold text-[15px]">Dataset stage complete</h3>
        <p className="text-muted-foreground text-sm">
          The data card and the brief are ready. Hypothesis and Experiment design start from them.
        </p>
      </div>
    );
  if (status === "failed" || status === "stopped")
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
        <span className="text-muted-foreground text-xs">Stopped</span>
        <h3 className="font-semibold text-[15px]">
          {model.failure?.code === "LOCAL_NODE_CAPABILITY" ? "Local Node update needed" : "The stage stopped"}
        </h3>
        <p className="text-muted-foreground text-sm">
          {status === "stopped" ? (
            "You stopped this run. What finished stays."
          ) : (
            <RunFailureMessage message={model.failure?.message} code={model.failure?.code} />
          )}
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 shadow-xs ring-1 ring-foreground/10">
      <div className="flex justify-between gap-2 text-muted-foreground text-xs">
        <b className="font-medium text-foreground">Dataset stage</b>
        <span>{current ? `Step ${index + 1} of ${steps.length}` : `${done} of ${steps.length} done`}</span>
      </div>
      <div className={cn("grid items-start gap-x-3", moving && "grid-cols-[auto_minmax(0,1fr)]")}>
        {moving && (
          <WorkOrb
            step={current?.key}
            waiting={status === "waiting" || current?.state === "asking"}
            size={32}
            className="mt-0.5"
          />
        )}
        <div className="min-w-0">
          <motion.h3
            key={current?.key ?? "start"}
            title={current?.explain}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="font-semibold text-[15px] tracking-tight"
          >
            {current?.title ?? "Getting the stage ready"}
          </motion.h3>
          <p className={cn("mt-1 min-h-5 text-sm leading-relaxed", compact && "line-clamp-3")}>
            {model.message ? (
              <>
                <ReleaseReviewIcon text={model.message.text} />
                <TypedLine text={model.message.text} typing={typing} />
                {status === "running" && <Caret />}
              </>
            ) : (
              !compact && <span className="text-muted-foreground">{current?.explain}</span>
            )}
          </p>
          {speaker && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
              <span
                className={cn("size-1.5 rounded-full", speaker === "you" ? "bg-amber-500" : AGENTS[speaker].solid)}
              />
              <span className={cn("font-medium", speaker === "you" ? "text-amber-700" : AGENTS[speaker].text)}>
                {speaker === "code" ? "Code check · no AI" : nameOf(speaker)}
              </span>
              {model.progress && elapsed !== null && <span className="tabular-nums">· {elapsed} s so far</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NextStop({ steps, status, local, model }: Pick<AsideProps, "steps" | "status" | "local" | "model">) {
  if (isEnded(status)) return null;
  const next = nextStopFor(steps, local);
  if (model.gate) {
    const [question] = model.gate.prompt.split(/\r?\n/, 1);
    return <WaitingForYou>{question.replace(/^Decision:\s*/i, "")}</WaitingForYou>;
  }
  if ((model.releaseWait || model.readyToAccept === true || outcomePending(model) || charterPending(model)) && next)
    return <WaitingForYou>{next.detail} Nothing runs until you answer.</WaitingForYou>;
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-dashed p-3 text-xs">
      <span className="grid size-7 place-items-center rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300">
        <Flag className="size-3.5" />
      </span>
      <span>
        <b className="block font-semibold text-[13px]">{next?.title ?? "No more stops"}</b>
        <span className="text-muted-foreground">
          {next
            ? `${next.detail} Until then the agents work on their own; you can leave and come back.`
            : "The stage finishes on its own."}
        </span>
      </span>
    </div>
  );
}

function Activity({ model }: { model: DatasetRunModel }) {
  const end = useRef<HTMLDivElement>(null);
  const count = model.feed.length;
  useEffect(() => {
    if (count) end.current?.scrollIntoView({ block: "nearest" });
  }, [count]);
  if (!count) return <p className="text-muted-foreground text-xs">Nothing yet.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {model.feed.map((item) => (
        <motion.li
          key={`${item.seq}-${item.text}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-[auto_1fr] gap-2.5 text-xs"
        >
          {item.actor === "you" ? (
            <span className="grid size-5 place-items-center rounded-full bg-amber-500/20 font-semibold text-[8.5px] text-amber-800 dark:text-amber-300">
              You
            </span>
          ) : (
            <AgentAvatar agent={item.actor} size="sm" />
          )}
          <div className="text-muted-foreground">
            <b className={cn("font-semibold", item.actor === "you" ? "text-amber-800" : AGENTS[item.actor].text)}>
              {nameOf(item.actor)}
            </b>
            <span className="ml-1.5 font-mono text-[10.5px]">#{String(item.seq).padStart(4, "0")}</span>
            <p className="mt-px text-foreground leading-relaxed">{item.text}</p>
          </div>
        </motion.li>
      ))}
      <div ref={end} />
    </ol>
  );
}

export function DatasetRunAside({ model, steps, status, local, typing }: AsideProps) {
  const waiting =
    !isEnded(status) &&
    (model.gate !== null ||
      model.releaseWait ||
      model.readyToAccept === true ||
      outcomePending(model) ||
      charterPending(model));
  const check = (key: string): "pass" | "hit" | undefined => {
    const state = model.items[key]?.state;
    if (state === "green") return "pass";
    if (state === "red" || state === "needs_you") return "hit";
  };
  const rules = [
    { id: "sources", text: "Record the sources and their licences.", state: check("sources") },
    { id: "split", text: "Fix the row partition before analysis.", state: check("split") },
    { id: "data_checks", text: "Run data checks in code.", state: check("data_checks") },
    ...(local ? [{ id: "release", text: "Rows stay on the Local Node.", state: "pass" as const }] : []),
  ];
  const active = isEnded(status) ? null : activeAgent(model, status === "paused");
  return (
    <RunAsidePanel
      team={<AgentStrip cast={DATASET_CAST} active={active === "you" ? null : active} />}
      activityCount={model.feed.length}
      activity={<Activity model={model} />}
    >
      <DatasetNowCard model={model} steps={steps} status={status} typing={typing} />
      {waiting && <NextStop steps={steps} status={status} local={local} model={model} />}
      <StageSteps
        count={`${steps.filter((step) => step.state === "done").length} of ${steps.length}`}
        steps={steps.map((step) => ({
          id: step.key,
          title: step.title,
          gate: step.gate || step.state === "asking",
          actor:
            step.gate || step.state === "asking"
              ? step.state === "done"
                ? "You decided"
                : "You decide · the stage waits"
              : nameOf(step.actor),
          artifact: datasetStepArtifact(step.key),
          done: step.state === "done",
          now: !isEnded(status) && (step.state === "now" || step.state === "asking"),
          asking: !isEnded(status) && step.state === "asking",
        }))}
      />
      {!waiting && <NextStop steps={steps} status={status} local={local} model={model} />}
      <StageRules title="Rules the Dataset stage never bends" rules={rules} />
    </RunAsidePanel>
  );
}
