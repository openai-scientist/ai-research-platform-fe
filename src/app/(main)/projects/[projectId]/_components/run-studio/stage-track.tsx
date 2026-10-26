"use client";

import { useEffect, useRef } from "react";

import { cn } from "cn";
import { CircleCheck, Flag, Lock, PenLine } from "lucide-react";
import { motion } from "motion/react";

import { SHOW_WRITING_PREVIEW } from "@/lib/run-stream/features";
import type { RunState } from "@/lib/run-stream/run-state";
import { liveStageKey } from "@/lib/run-stream/selectors";

import { LOCKED_HINT, LOCKED_PIPELINE, STAGE_SHORT } from "./run-meta";
import { HOST, useWritingRun, S as writing, writingProgress } from "./writing/engine";

/** The run's stages as tabs: a bar per stage that fills as its steps finish, with a flag where the run stops for you. */
export function StageTrack({
  state,
  viewKey,
  onView,
}: {
  state: RunState;
  viewKey: string | null;
  onView(key: string): void;
}) {
  const live = liveStageKey(state);
  const liveIndex = state.completed ? state.plan.length : state.plan.findIndex((s) => s.key === live);
  const items = [
    ...state.plan.map((p) => ({ ...p, done: false })),
    // Runs that stop at the hypotheses have no paper to end on.
    ...(state.plan.some((p) => p.stage === "write")
      ? [{ key: "done", stage: "done" as const, title: "Paper", has_gate: false, round: undefined, done: true }]
      : []),
  ];
  // Experiments and the paper come later: shown after the last stage, locked.
  const locked = state.plan.length ? LOCKED_PIPELINE.filter((p) => !state.plan.some((s) => s.stage === p.stage)) : [];
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-track="${live}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [live]);

  return (
    // Only sideways: anything that reaches below the bars must not bring up a vertical scrollbar.
    <div ref={scroller} className="overflow-x-auto overflow-y-hidden border-b px-4 pt-3 pb-3.5 md:px-5">
      <ol className="flex gap-1.5" style={{ minWidth: Math.max(620, (items.length + locked.length) * 104) }}>
        {items.map((item, i) => {
          const stage = item.key === "done" ? undefined : state.stages[item.key];
          const total = stage?.plan.steps.length ?? 1;
          const doneSteps = stage ? stage.doneStepIds.length : 0;
          const isPast = i < liveIndex || state.completed;
          const isLive = item.key === live && !state.completed && state.lifecycle !== "failed";
          const fill = isPast ? 100 : isLive ? Math.max(4, (doneSteps / total) * 100) : 0;
          const waiting = isLive && Boolean(state.gate);
          const available = Boolean(stage) || (item.key === "done" && state.completed);
          const viewing = item.key === viewKey;
          return (
            <motion.li
              key={item.key}
              layout
              data-track={item.key}
              initial={{ opacity: 0, flexGrow: 0.001 }}
              animate={{ opacity: 1, flexGrow: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative min-w-0 basis-0"
            >
              <button
                type="button"
                disabled={!available}
                onClick={() => onView(item.key)}
                className="flex w-full flex-col gap-1.5 rounded py-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "flex items-center gap-1.5 truncate pr-3 font-medium text-xs transition-colors",
                    isPast || isLive || viewing ? "text-foreground" : "text-muted-foreground",
                    viewing && "font-semibold",
                  )}
                >
                  {item.round && (
                    <em className="rounded bg-muted px-1 font-mono font-semibold text-[10px] text-muted-foreground not-italic">
                      R{item.round}
                    </em>
                  )}
                  {item.key === "done" && <CircleCheck className="size-3" />}
                  {STAGE_SHORT[item.stage]}
                </span>
                <span className="relative h-1 overflow-hidden rounded-full bg-muted">
                  <motion.i
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      waiting ? "bg-amber-500" : isLive ? "bg-sky-500" : "bg-foreground",
                    )}
                    initial={false}
                    animate={{ width: `${fill}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {isLive && !waiting && (
                    <motion.i
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sky-500/40 to-transparent"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    />
                  )}
                </span>
              </button>
              {item.has_gate && (
                <span
                  title="Stops for you here"
                  className={cn(
                    "absolute -right-2 bottom-[-5px] z-10 grid size-[18px] place-items-center rounded-full bg-background",
                    waiting ? "bg-amber-500 text-white" : isPast ? "text-muted-foreground" : "text-amber-500",
                  )}
                >
                  {/* Breathes in place: a ring that grew would spill out of the track and shake it. */}
                  {waiting && (
                    <motion.span
                      aria-hidden
                      className="absolute -inset-[3px] rounded-full border-2 border-amber-500"
                      animate={{ opacity: [0.15, 0.8, 0.15] }}
                      transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    />
                  )}
                  <Flag className={cn("size-3", !isPast && !waiting && "fill-amber-500/25")} />
                </span>
              )}
              {viewing && (
                <motion.span
                  layoutId="track-viewing"
                  className="absolute inset-x-0 right-3 -bottom-3.5 h-0.5 rounded-full bg-foreground"
                />
              )}
            </motion.li>
          );
        })}
        {locked.map((p) =>
          p.stage === "write" && SHOW_WRITING_PREVIEW ? (
            <WriteTile key="write" state={state} viewing={viewKey === "write"} onView={() => onView("write")} />
          ) : (
            <li key={`locked-${p.stage}`} title={LOCKED_HINT} className="min-w-0 flex-1 basis-0">
              <span aria-disabled="true" className="flex cursor-not-allowed flex-col gap-1.5 py-0.5">
                <span className="flex items-center gap-1.5 truncate pr-3 font-medium text-muted-foreground/70 text-xs">
                  <Lock className="size-3 shrink-0" />
                  {STAGE_SHORT[p.stage]}
                  <span className="sr-only">, locked</span>
                </span>
                <span className="mt-px h-0 border-foreground/15 border-t-2 border-dashed" />
              </span>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

/**
 * The Write stage, as a preview: locked until the run finishes, then it opens the writing run, played on an example
 * research record. Its bar fills as the writing run goes.
 */
function WriteTile({ state, viewing, onView }: { state: RunState; viewing: boolean; onView(): void }) {
  // It reads the writing run's module state, which the React Compiler cannot see change.
  "use no memo";
  useWritingRun();
  const open = state.completed;
  const mine = HOST.runId === state.runId;
  const fill = mine ? Math.max(4, writingProgress() * 100) : 0;
  const live = mine && !writing.done && writing.lifecycle !== "failed";
  const waiting = mine && (Boolean(writing.gate) || writing.lifecycle === "blocked");
  return (
    <li
      data-track="write"
      title={
        open
          ? "Preview: write the paper from an example research record"
          : "Opens when the run finishes, as a preview of the writing stage"
      }
      className="relative min-w-0 flex-1 basis-0"
    >
      <button
        type="button"
        disabled={!open}
        onClick={onView}
        className="flex w-full flex-col gap-1.5 rounded py-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
      >
        <span
          className={cn(
            "flex items-center gap-1.5 truncate pr-3 font-medium text-xs transition-colors",
            open ? "text-foreground" : "text-muted-foreground/70",
            viewing && "font-semibold",
          )}
        >
          {open ? <PenLine className="size-3 shrink-0" /> : <Lock className="size-3 shrink-0" />}
          {STAGE_SHORT.write}
          {open && (
            <em className="rounded bg-muted px-1 font-medium text-[10px] text-muted-foreground not-italic">Preview</em>
          )}
          {!open && <span className="sr-only">, locked</span>}
        </span>
        {open ? (
          <span className="relative h-1 overflow-hidden rounded-full bg-muted">
            <motion.i
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                waiting ? "bg-amber-500" : live ? "bg-sky-500" : "bg-foreground",
              )}
              initial={false}
              animate={{ width: `${fill}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </span>
        ) : (
          <span className="mt-px h-0 border-foreground/15 border-t-2 border-dashed" />
        )}
      </button>
      {viewing && <span className="absolute inset-x-0 right-3 -bottom-3.5 h-0.5 rounded-full bg-foreground" />}
    </li>
  );
}
