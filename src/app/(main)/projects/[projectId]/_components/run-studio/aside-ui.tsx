"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { Check, ChevronRight, FileText, Flag } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentRole } from "@/lib/run-stream/contract";

import { AgentAvatar } from "./run-bits";
import { AGENTS } from "./run-meta";

export function AgentStrip({ cast, active }: { cast: readonly AgentRole[]; active: AgentRole | null }) {
  return (
    // One row: the speaker's name gives way before the row wraps and the card below jumps.
    <div className="flex gap-px overflow-hidden border-b px-3 py-3">
      {cast.map((role) => {
        const on = role === active;
        const agent = AGENTS[role];
        // The avatar already reads "PI"; a name that repeats it is left out.
        const named = on && agent.name !== agent.initials;
        return (
          <motion.span
            key={role}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full p-0.5",
              on && agent.soft.split(" ")[0],
              named && "min-w-0 shrink gap-1.5 pr-2",
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
                    "absolute -inset-[3px] animate-ping rounded-full opacity-40 ring-[1.5px] ring-current motion-reduce:animate-none",
                    agent.text,
                  )}
                />
              )}
            </span>
            <AnimatePresence>
              {named && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className={cn("min-w-0 truncate font-semibold text-xs", agent.text)}
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

type StageStepRow = {
  id: string;
  title: string;
  actor: string;
  artifact?: string;
  gate?: boolean;
  done: boolean;
  now: boolean;
  asking: boolean;
};

export function StageSteps({ steps, count }: { steps: StageStepRow[]; count: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="flex flex-col gap-2">
      <p className="flex justify-between font-medium text-muted-foreground text-xs">
        <span>Steps in this stage</span>
        <span>{count}</span>
      </p>
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const { done, now, asking } = step;
          return (
            <li
              key={step.id}
              className={cn(
                "relative grid grid-cols-[18px_1fr] gap-2.5 rounded-lg px-1 pb-3 last:pb-0",
                i < steps.length - 1 &&
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
                  now && !asking && "border-2 border-sky-500",
                  step.gate && !done && !now && "border-amber-500 text-amber-600",
                  asking && "border-amber-500 bg-amber-500 text-white",
                )}
              >
                {done && <Check className="size-2.5" strokeWidth={3.5} />}
                {!done && step.gate && (!now || asking) && <Flag className="size-2.5" />}
                {now && !asking && (
                  <motion.span
                    className="size-1.5 rounded-full bg-sky-500"
                    animate={reducedMotion ? undefined : { scale: [1, 0.6, 1] }}
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
                  {step.actor}
                  {step.artifact && (
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

export function StageRules({
  title,
  rules,
}: {
  title: string;
  rules: { id: string; text: string; state?: "pass" | "hit" }[];
}) {
  const checked = rules.filter((rule) => rule.state).length;
  return (
    <Collapsible className="rounded-xl bg-card ring-1 ring-foreground/10">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2.5 text-left font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        {title}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {checked} of {rules.length} checked
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1.5 px-3 pb-3 text-xs">
          {rules.map(({ id, text, state: s }) => {
            return (
              <li
                key={id}
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
                {text}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WaitingForYou({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
      <span className="grid size-7 place-items-center rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
        <Flag className="size-3.5" />
      </span>
      <span>
        <b className="block font-semibold text-[13px]">Waiting for you now</b>
        <span className="text-muted-foreground">{children}</span>
      </span>
    </div>
  );
}

export function RunAsidePanel({
  team,
  activityCount,
  activity,
  children,
}: {
  team: ReactNode;
  activityCount: number;
  activity: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {team}
      <Tabs defaultValue="now" className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className="w-full justify-start border-b px-3">
          <TabsTrigger value="now" className="flex-none">
            Now
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-none">
            Activity
            <motion.span
              key={activityCount}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-muted px-1.5 font-mono font-semibold text-[10.5px] text-muted-foreground"
            >
              {activityCount}
            </motion.span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="now" className="min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-3.5 p-3.5">{children}</div>
        </TabsContent>
        <TabsContent value="activity" className="min-h-0 overflow-y-auto p-3.5">
          {activity}
        </TabsContent>
      </Tabs>
    </div>
  );
}
