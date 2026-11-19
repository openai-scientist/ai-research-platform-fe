"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { Flag, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { AgentRole } from "@/lib/run-stream/contract";
import type { RunState } from "@/lib/run-stream/run-state";
import { GATE_TITLE, inSentence, nextStop } from "@/lib/run-stream/selectors";

import { AgentStrip, RunAsidePanel, StageRules, StageSteps, WaitingForYou } from "./aside-ui";
import { ReleaseReviewIcon, RunFailureMessage } from "./local-node-status";
import { AgentAvatar, Caret, TypedLine, WorkOrb } from "./run-bits";
import { AGENTS, RULE_IDS, RULES, TEAM } from "./run-meta";

/** Without news for this long, the card says the step is still going. */
const QUIET_MS = 3000;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** The step is still going though nothing new has come for a while: how long it has run. */
function StillWorking({ since }: { since?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const started = since ? Date.parse(since) : Number.NaN;
  const seconds = Number.isFinite(started) ? Math.max(0, Math.round((now - started) / 1000)) : null;
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="tabular-nums"
      role="status"
    >
      · Still working{seconds !== null && seconds < 6 * 3600 ? ` ${clock(seconds)}` : ""}
    </motion.span>
  );
}

export function NowCard({
  state,
  holding,
  onContinue,
  compact,
  typing = false,
}: {
  state: RunState;
  holding: boolean;
  onContinue(): void;
  compact?: boolean;
  /** Type out narration that arrives as whole lines (a backend run); a mock run streams it word by word. */
  typing?: boolean;
}) {
  const stage = state.currentStageKey ? state.stages[state.currentStageKey] : undefined;
  const steps = stage?.plan.steps ?? [];
  const step = steps.find((s) => s.id === stage?.currentStepId);
  const index = step ? steps.indexOf(step) : -1;
  const message = state.message;
  const speaker: AgentRole | null = message?.actor ?? step?.actor ?? null;
  // Quiet: nothing new for a while. The engine works in long calls, and the card should not look stuck.
  const [quietAt, setQuietAt] = useState(-1);
  const lastSeq = state.lastSeq;
  useEffect(() => {
    const timer = window.setTimeout(() => setQuietAt(lastSeq), QUIET_MS);
    return () => window.clearTimeout(timer);
  }, [lastSeq]);
  // Paused runs hold still; the orb only moves while work goes on or a stop waits for you.
  const moving = state.lifecycle === "running" || state.lifecycle === "awaiting_review";
  const working = quietAt === lastSeq && Boolean(step) && !step?.gate && !state.gate && state.lifecycle === "running";

  if (state.completed)
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
        <span className="text-muted-foreground text-xs">Finished</span>
        <h3 className="font-semibold text-[15px]">Run complete</h3>
        <p className="text-muted-foreground text-sm">
          {state.paperTitle
            ? "The paper is published. Use the stages above to look back at any part of the run."
            : "The hypotheses are picked. Experiments are switched off for now; use the stages above to look back."}
        </p>
      </div>
    );

  if (state.lifecycle === "failed")
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
        <span className="text-muted-foreground text-xs">Stopped</span>
        <h3 className="font-semibold text-[15px]">
          {state.failureCode === "LOCAL_NODE_CAPABILITY" ? "Local Node update needed" : "The run stopped"}
        </h3>
        <p className="text-muted-foreground text-sm">
          <RunFailureMessage message={state.failure} code={state.failureCode} />
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 shadow-xs ring-1 ring-foreground/10">
      <div className="flex justify-between gap-2 text-muted-foreground text-xs">
        <b className="font-medium text-foreground">
          {stage?.plan.title ?? "Starting"}
          {stage?.plan.round ? ` · Round ${stage.plan.round}` : ""}
        </b>
        <span>
          {step
            ? `Step ${index + 1} of ${steps.length}`
            : stage
              ? `${steps.length} ${steps.length === 1 ? "step" : "steps"}`
              : ""}
        </span>
      </div>
      {/* One block: the orb works the way the step does, the narration streams under the step, and a quiet line says
          who is speaking (the team row shows it too, but not on narrow screens). */}
      <div className={cn("grid items-start gap-x-3", moving && "grid-cols-[auto_minmax(0,1fr)]")}>
        {moving && <WorkOrb step={step?.id} waiting={Boolean(state.gate)} size={32} className="mt-0.5" />}
        <div className="min-w-0">
          {/* A new title fades in over the old one; waiting for the old one to leave can strand it when steps change
              in quick succession. */}
          <motion.h3
            key={step?.id ?? stage?.plan.key ?? "start"}
            title={step?.explain ?? stage?.plan.purpose}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="font-semibold text-[15px] tracking-tight"
          >
            {step?.title ?? stage?.plan.title ?? "Getting the team ready"}
          </motion.h3>
          <p className="mt-1 min-h-5 text-sm leading-relaxed">
            {message ? (
              <>
                <ReleaseReviewIcon text={message.text} />
                <TypedLine text={message.text} typing={typing} />
                {!message.done && <Caret />}
              </>
            ) : (
              !compact && <span className="text-muted-foreground">{step?.explain ?? stage?.plan.purpose}</span>
            )}
          </p>
          {speaker && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", AGENTS[speaker].solid)} />
              <span className={cn("font-medium", AGENTS[speaker].text)}>
                {speaker === "code" ? "Code check · no AI" : AGENTS[speaker].name}
              </span>
              <AnimatePresence>{working && <StillWorking since={state.stepStartedAt} />}</AnimatePresence>
            </p>
          )}
        </div>
      </div>
      <AnimatePresence>
        {holding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs">
              <span>
                Step done. Paused because <b>Pause each step</b> is on.
              </span>
              <Button size="sm" className="w-fit" onClick={onContinue}>
                Continue
                <Play />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Steps({ state }: { state: RunState }) {
  const stage = state.currentStageKey ? state.stages[state.currentStageKey] : undefined;
  if (!stage || state.completed) return null;
  const index = state.plan.findIndex((item) => item.key === stage.plan.key) + 1;
  return (
    <StageSteps
      count={"Stage " + index + " of " + state.plan.length}
      steps={stage.plan.steps.map((step) => {
        const now = stage.currentStepId === step.id && state.lifecycle !== "failed";
        return {
          id: step.id,
          title: step.title,
          gate: Boolean(step.gate),
          actor: step.gate ? "You decide · Popper waits" : AGENTS[step.actor].name,
          artifact: step.gate ? undefined : step.artifact,
          done: stage.doneStepIds.includes(step.id),
          now,
          asking: now && Boolean(step.gate && state.gate),
        };
      })}
    />
  );
}

function NextStop({ state }: { state: RunState }) {
  if (state.completed || state.lifecycle === "failed") return null;
  if (state.gate) return <WaitingForYou>{state.gate.title}. Nothing runs until you answer.</WaitingForYou>;
  const next = nextStop(state);
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-dashed p-3 text-xs">
      <span
        className={cn(
          "grid size-7 place-items-center rounded-lg",
          next ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-muted text-muted-foreground",
        )}
      >
        {next ? <Flag className="size-3.5" /> : <Play className="size-3.5" />}
      </span>
      <span>
        <b className="block font-semibold text-[13px]">
          {next
            ? `Next stop for you: ${inSentence(GATE_TITLE[next.gate])}`
            : state.mode === "auto"
              ? "Popper won't stop for you"
              : "No more stops"}
        </b>
        <span className="text-muted-foreground">
          {next
            ? `${next.stepsAway !== null ? (next.stepsAway <= 1 ? "Right after this step" : `In ${next.stepsAway} steps, in this stage`) : `In ${next.stage.title}${next.stage.round ? `, round ${next.stage.round}` : ""}`}. Until then the agents work on their own; you can leave and come back.`
            : state.mode === "auto"
              ? "Auto mode: the PI makes every call. Each call is logged in Activity."
              : "The run finishes on its own."}
        </span>
      </span>
    </div>
  );
}

function Activity({ state }: { state: RunState }) {
  const end = useRef<HTMLDivElement>(null);
  const count = state.feed.length;
  useEffect(() => {
    if (count) end.current?.scrollIntoView({ block: "nearest" });
  }, [count]);
  if (!state.feed.length) return <p className="text-muted-foreground text-xs">Nothing yet.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {state.feed.map((item) => {
        const you = item.actor === "you";
        return (
          <motion.li
            key={`${item.seq}-${item.kind}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-[auto_1fr] gap-2.5 text-xs"
          >
            {you ? (
              <span className="grid size-5 place-items-center rounded-full bg-amber-500/20 font-semibold text-[8.5px] text-amber-800 dark:text-amber-300">
                You
              </span>
            ) : (
              <AgentAvatar agent={item.actor as AgentRole} size="sm" />
            )}
            <div className={cn(item.kind === "event" && "text-muted-foreground")}>
              <b
                className={cn(
                  "font-semibold",
                  you ? "text-amber-800 dark:text-amber-300" : AGENTS[item.actor as AgentRole].text,
                )}
              >
                {you ? "You" : AGENTS[item.actor as AgentRole].name}
              </b>
              <span className="ml-1.5 font-mono text-[10.5px] text-muted-foreground">
                #{String(item.seq).padStart(4, "0")}
              </span>
              <p className={cn("mt-px leading-relaxed", you && "font-medium")}>{item.text}</p>
            </div>
          </motion.li>
        );
      })}
      <div ref={end} />
    </ol>
  );
}

export function RunAside({
  state,
  holding,
  onContinue,
  typing,
}: {
  state: RunState;
  holding: boolean;
  onContinue(): void;
  typing?: boolean;
}) {
  const stage = state.currentStageKey ? state.stages[state.currentStageKey] : undefined;
  const step = stage?.plan.steps.find((s) => s.id === stage.currentStepId);
  const ended = state.completed || state.lifecycle === "failed";
  const active = ended || state.gate ? null : (state.message?.actor ?? step?.actor ?? null);
  return (
    <RunAsidePanel
      team={<AgentStrip cast={TEAM} active={active === "code" ? null : active} />}
      activityCount={state.feed.length}
      activity={<Activity state={state} />}
    >
      <NowCard state={state} holding={holding} onContinue={onContinue} typing={typing} />
      <Steps state={state} />
      <NextStop state={state} />
      <StageRules
        title="Rules Popper never bends"
        rules={RULE_IDS.map((id) => ({ id: String(id), text: RULES[id], state: state.rules[id] }))}
      />
    </RunAsidePanel>
  );
}
