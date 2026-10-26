"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.
import type { DecDef } from "./data/core";
import type { JDecDef } from "./data/jfe";
import { S } from "./engine";
import { AgentAvatar, cn, M } from "./lib";

/* ===== what both runs' shells share: how a run's state reads, and the Orchestrator's advice at a stop ===== */

export interface Tone {
  label: string;
  c: string;
  dot: string;
}
export const TONE: Record<string, Tone> = {
  running: { label: "Running", c: "bg-sky-500/12 text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  waiting: { label: "Waiting for you", c: "bg-amber-500/15 text-amber-800 dark:text-amber-300", dot: "bg-amber-500" },
  blocked: { label: "Needs you", c: "bg-rose-500/12 text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  paused: { label: "Paused", c: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  failed: { label: "Stopped", c: "bg-destructive/10 text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  done: { label: "Signed", c: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
};

/** The manuscript run's state, as one word for its pill. */
export const lifeOf = () => (S.done ? "done" : S.paused && S.lifecycle === "running" ? "paused" : S.lifecycle);

export const SUM_ICON: Record<string, [string, string]> = {
  ok: ["check", "text-emerald-600"],
  warn: ["alert", "text-amber-600"],
  bad: ["ban", "text-rose-600"],
};

export function Confidence({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums"
      title="How sure the Orchestrator is"
    >
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-foreground/10">
        <M
          as="span"
          in="grow"
          dur={700}
          className={cn(
            "absolute inset-y-0 left-0 origin-left rounded-full",
            value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-rose-500",
          )}
          style={{ width: `${value}%` }}
        />
      </span>
      {value}% sure
    </span>
  );
}

/** What the Orchestrator recommends at a stop, and how sure it is. */
export function Advice({ d }: { d: DecDef | JDecDef }) {
  const [head, conf, text] = d.rec;
  return (
    <M
      as="section"
      in="up6"
      aria-label="The Orchestrator's advice"
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-xl bg-muted/60 px-4 py-3.5 ring-1 ring-foreground/8 ring-inset"
    >
      <AgentAvatar a="or" size="lg" className="max-sm:size-7 sm:row-span-2" />
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <b className="font-semibold text-sm">{head}</b>
        <Confidence value={conf} />
      </div>
      <p className="col-span-2 text-pretty text-[13.5px] text-foreground/85 leading-relaxed sm:col-span-1 sm:col-start-2">
        {text}
      </p>
    </M>
  );
}
