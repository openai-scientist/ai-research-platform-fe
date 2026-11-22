"use client";

import { type ReactNode, useEffect, useSyncExternalStore } from "react";

import { cn } from "cn";
import { Check, ChevronRight, Flag } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AgentRole } from "@/lib/run-stream/contract";
import type { LiveSidePanel } from "@/lib/run-stream/live-views";

import { AGENTS } from "../run-meta";

/** What the right column shows for a stage while its live card is on screen. */
export interface LivePanelEntry {
  panel: LiveSidePanel;
  /** "Dataset stage", "Experiment design stage"... */
  stage: string;
  /** 1-based position of the live step in its stage, and how many steps the stage has. */
  position: number;
  count: number;
  actor: AgentRole;
}

const entries = new Map<string, LivePanelEntry>();
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

/** The live card of `stage` publishes its side-panel model here; the aside reads it. Returns the cleanup. */
export function publishLivePanel(stage: string, entry: LivePanelEntry) {
  entries.set(stage, entry);
  emit();
  return () => {
    if (entries.get(stage) === entry) {
      entries.delete(stage);
      emit();
    }
  };
}

/** The entry a stage's live card published, if its card is mounted. */
export const livePanelOf = (stage: string) => entries.get(stage);

export function useLivePanel(stage: string | null | undefined): LivePanelEntry | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (stage ? entries.get(stage) : undefined),
    () => undefined,
  );
}

/** Publishes while mounted. The entry must be memoised by the caller so it only changes with the model. */
export function usePublishLivePanel(stage: string, entry: LivePanelEntry | null) {
  useEffect(() => (entry ? publishLivePanel(stage, entry) : undefined), [stage, entry]);
}

/** "Now": the step's title and one line, who works on it, and where it is in its stage. */
export function LiveNow({ entry }: { entry: LivePanelEntry }) {
  const { panel, actor } = entry;
  const agent = AGENTS[actor];
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-card p-3.5 shadow-xs ring-1 ring-foreground/10">
      <div className="flex justify-between gap-2 text-muted-foreground text-xs">
        <b className="font-medium text-foreground">{entry.stage}</b>
        <span className="whitespace-nowrap">
          Step {entry.position} of {entry.count}
        </span>
      </div>
      <motion.h3
        key={panel.now.title}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="font-semibold text-[15px] tracking-tight"
      >
        {panel.now.title}
      </motion.h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{panel.now.explanation}</p>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", agent.solid)} />
        <span className={cn("font-medium", agent.text)}>{actor === "code" ? "Code check · no AI" : agent.name}</span>
      </p>
    </div>
  );
}

/** The live step's own sub-steps. */
export function LiveSubsteps({ panel }: { panel: LiveSidePanel }) {
  const reduced = useReducedMotion();
  if (!panel.substeps.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-muted-foreground text-xs">In this step</p>
      <ol className="flex flex-col gap-1.5">
        {panel.substeps.map(({ label, state }) => (
          <li key={label} className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2.5 text-[13px]">
            <span
              className={cn(
                "mt-0.5 grid size-[18px] place-items-center rounded-full border bg-card",
                state === "recorded" && "border-foreground bg-foreground text-background",
                state === "current" && "border-2 border-sky-500",
                state === "waiting" && "border-amber-500 bg-amber-500 text-white",
              )}
            >
              {state === "recorded" && <Check aria-hidden className="size-2.5" strokeWidth={3.5} />}
              {state === "waiting" && <Flag aria-hidden className="size-2.5" />}
              {state === "current" && (
                <motion.span
                  className="size-1.5 rounded-full bg-sky-500"
                  animate={reduced ? undefined : { scale: [1, 0.6, 1] }}
                  transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
                />
              )}
            </span>
            <span className={cn(state === "upcoming" && "text-muted-foreground")}>{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The next step in the stage, or the stop that is open now. */
export function LiveNextStop({ panel, waiting }: { panel: LiveSidePanel; waiting?: ReactNode }) {
  if (waiting) return <>{waiting}</>;
  if (!panel.nextStop) return null;
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-dashed p-3 text-xs">
      <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
        <ChevronRight aria-hidden className="size-3.5" />
      </span>
      <span>
        <b className="block font-semibold text-[13px]">Next: {panel.nextStop}</b>
        <span className="text-muted-foreground">Starts when this step is recorded.</span>
      </span>
    </div>
  );
}

export function LiveRules({ panel, title }: { panel: LiveSidePanel; title: string }) {
  return (
    <Collapsible className="border-t">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 py-2.5 text-left font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1.5 pb-3 text-muted-foreground text-xs">
          {panel.rules.map((rule) => (
            <li key={rule} className="grid grid-cols-[14px_1fr] gap-2 px-1">
              <span className="mt-1 size-2 rounded-full border-[1.5px] border-foreground/30" />
              {rule}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
