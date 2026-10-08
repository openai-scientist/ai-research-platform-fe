"use client";

import { useEffect, useRef } from "react";

import { cn } from "cn";
import { Check, ChevronRight, FileText, Flag, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentRole } from "@/lib/run-stream/contract";
import type { RunState } from "@/lib/run-stream/run-state";
import { GATE_TITLE, nextStop } from "@/lib/run-stream/selectors";

import { AgentAvatar, Caret, TypedLine } from "./run-bits";
import { AGENTS, RULE_IDS, RULES, TEAM } from "./run-meta";

function Team({ active }: { active: AgentRole | null }) {
  return (
    <div className="flex flex-wrap gap-px border-b px-3 py-3">
      {TEAM.map((role) => {
        const on = role === active;
        const agent = AGENTS[role];
        return (
          <motion.span
            key={role}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className={cn(
              "inline-flex items-center rounded-full p-0.5",
              on && cn("gap-1.5 pr-2", agent.soft.split(" ")[0]),
            )}
          >
            <span className="relative">
              <AgentAvatar
                agent={role}
                size="sm"
                className={cn("size-6 transition-[opacity,filter] duration-300", !on && "opacity-50 saturate-[.3]")}
              />
              {on && (
                <span
                  className={cn(
                    "absolute -inset-[3px] animate-ping rounded-full opacity-40 ring-[1.5px] ring-current",
                    agent.text,
                  )}
                />
              )}
            </span>
            <AnimatePresence>
              {on && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className={cn("overflow-hidden whitespace-nowrap font-semibold text-xs", agent.text)}
                >
                  {agent.name}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        );
      })}
    </div>
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
        <h3 className="font-semibold text-[15px]">The run stopped</h3>
        <p className="text-muted-foreground text-sm">
          {state.failure ?? "Popper could not finish this run."} Use the stages above to look back at what was done.
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
        <span>{step ? `Step ${index + 1} of ${steps.length}` : stage ? `${steps.length} steps` : ""}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step?.id ?? stage?.plan.key ?? "start"}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          <h3 className="font-semibold text-[15px] tracking-tight">
            {step?.title ?? stage?.plan.title ?? "Getting the team ready"}
          </h3>
          {!compact && (
            <p className="mt-0.5 text-muted-foreground text-sm leading-relaxed">
              {step?.explain ?? stage?.plan.purpose}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
      {speaker && (
        <div className="mt-1 grid grid-cols-[auto_1fr] gap-2.5 border-t pt-2.5">
          <AgentAvatar agent={speaker} />
          <div className="min-w-0">
            <span className={cn("flex items-center gap-1.5 font-semibold text-xs", AGENTS[speaker].text)}>
              {speaker === "code" ? "Code check · no AI" : AGENTS[speaker].name}
              {!message && (
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.i
                      key={i}
                      className="size-1 rounded-full bg-current"
                      animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                      transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
                    />
                  ))}
                </span>
              )}
            </span>
            <p className="mt-0.5 min-h-5 text-sm leading-relaxed">
              {message ? (
                <>
                  <TypedLine text={message.text} typing={typing} />
                  {!message.done && <Caret />}
                </>
              ) : (
                <span className="text-muted-foreground">{step?.gate ? "" : "Working on it…"}</span>
              )}
            </p>
          </div>
        </div>
      )}
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
  return (
    <div className="flex flex-col gap-2">
      <p className="flex justify-between font-medium text-muted-foreground text-xs">
        <span>Steps in this stage</span>
        <span>
          Stage {state.plan.findIndex((s) => s.key === stage.plan.key) + 1} of {state.plan.length}
        </span>
      </p>
      <ol className="flex flex-col">
        {stage.plan.steps.map((step, i) => {
          const done = stage.doneStepIds.includes(step.id);
          const now = stage.currentStepId === step.id;
          return (
            <li
              key={step.id}
              className={cn(
                "relative grid grid-cols-[18px_1fr] gap-2.5 rounded-lg px-1 pb-3 last:pb-0",
                i < stage.plan.steps.length - 1 &&
                  cn(
                    "before:absolute before:top-[22px] before:bottom-1 before:left-[13px] before:w-px",
                    done ? "before:bg-foreground" : "before:bg-border",
                  ),
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-[18px] place-items-center rounded-full border bg-card transition-colors",
                  done && "border-foreground bg-foreground text-background",
                  now && !step.gate && "border-2 border-sky-500",
                  step.gate && !done && "border-amber-500 text-amber-600",
                  step.gate && now && "bg-amber-500 text-white",
                )}
              >
                {done && <Check className="size-2.5" strokeWidth={3.5} />}
                {!done && step.gate && <Flag className="size-2.5" />}
                {now && !step.gate && (
                  <motion.span
                    className="size-1.5 rounded-full bg-sky-500"
                    animate={{ scale: [1, 0.6, 1] }}
                    transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
                  />
                )}
              </span>
              <span className="min-w-0">
                <b
                  className={cn("block font-medium text-[13px]", !done && !now && "font-normal text-muted-foreground")}
                >
                  {step.title}
                </b>
                <small
                  className={cn(
                    "text-[11.5px]",
                    step.gate ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground",
                  )}
                >
                  {step.gate ? "You decide · Popper waits" : AGENTS[step.actor].name}
                  {step.artifact && !step.gate && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <FileText className="size-3" />
                      {step.artifact}
                    </span>
                  )}
                </small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function NextStop({ state }: { state: RunState }) {
  if (state.completed || state.lifecycle === "failed") return null;
  if (state.gate)
    return (
      <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
        <span className="grid size-7 place-items-center rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
          <Flag className="size-3.5" />
        </span>
        <span>
          <b className="block font-semibold text-[13px]">Waiting for you now</b>
          <span className="text-muted-foreground">{state.gate.title}. Nothing runs until you answer.</span>
        </span>
      </div>
    );
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
            ? `Next stop for you: ${GATE_TITLE[next.gate].toLowerCase()}`
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

function Rules({ state }: { state: RunState }) {
  const checked = Object.keys(state.rules).length;
  return (
    <Collapsible className="rounded-xl bg-card ring-1 ring-foreground/10">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2.5 text-left font-medium text-xs outline-none">
        <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        Rules Popper never bends
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {checked} of {RULE_IDS.length} checked
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1.5 px-3 pb-3 text-xs">
          {RULE_IDS.map((rule) => {
            const s = state.rules[rule];
            return (
              <li
                key={rule}
                className={cn(
                  "grid grid-cols-[14px_1fr] gap-2 rounded px-1 transition-colors duration-500",
                  s ? "text-foreground" : "text-muted-foreground",
                  s === "hit" && "bg-amber-500/12",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-2 rounded-full border-[1.5px]",
                    s === "pass" && "border-emerald-500 bg-emerald-500",
                    s === "hit" && "border-amber-500 bg-amber-500",
                    !s && "border-foreground/30",
                  )}
                />
                {RULES[rule]}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
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
    <div className="flex h-full min-h-0 flex-col">
      <Team active={active === "code" ? null : active} />
      <Tabs defaultValue="now" className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className="w-full justify-start border-b px-3">
          <TabsTrigger value="now" className="flex-none">
            Now
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-none">
            Activity
            <motion.span
              key={state.feed.length}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-muted px-1.5 font-mono font-semibold text-[10.5px] text-muted-foreground"
            >
              {state.feed.length}
            </motion.span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="now" className="min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-3.5 p-3.5">
            <NowCard state={state} holding={holding} onContinue={onContinue} typing={typing} />
            <Steps state={state} />
            <NextStop state={state} />
            <Rules state={state} />
          </div>
        </TabsContent>
        <TabsContent value="activity" className="min-h-0 overflow-y-auto p-3.5">
          <Activity state={state} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
