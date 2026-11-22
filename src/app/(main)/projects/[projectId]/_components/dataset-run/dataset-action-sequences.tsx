"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { Check, LockKeyhole, ScanLine } from "lucide-react";
import { motion } from "motion/react";

import { AnimatedNumber } from "../run-studio/animated-number";
import { AgentCursor, launchFlight } from "../run-studio/run-bits";
import { displayFieldName } from "./dataset-field-name";
import { DatasetReveal } from "./dataset-skeleton";

const scanBeats = [360, 980, 1600, 2220, 2840, 3440] as const;
const splitBeats = [240, 850, 1500, 2180, 3060] as const;

function useMotionBeats(times: readonly number[], playing: boolean, cue: string) {
  const [progress, setProgress] = useState<{ cue: string; beat: number }>();
  useEffect(() => {
    if (!playing) return;
    const timers = times.map((time, index) =>
      window.setTimeout(
        () =>
          setProgress((previous) => ({
            cue,
            beat: Math.max(previous?.cue === cue ? previous.beat : 0, index + 1),
          })),
        time,
      ),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [cue, playing, times]);
  return playing ? (progress?.cue === cue ? progress.beat : 0) : times.length;
}

function fly(host: HTMLElement | null, from: string, to: string, label: string, tone: string) {
  const source = host?.querySelector(`[data-cursor="${from}"]`);
  const target = host?.querySelector(`[data-cursor="${to}"]`);
  if (
    [source, target].every((node) => {
      const rect = node?.getBoundingClientRect();
      return rect && rect.top >= 0 && rect.bottom <= window.innerHeight;
    })
  )
    launchFlight(source, target, label, tone);
}

type Worker = "steward" | "reviewer" | null;

export type RecodePreview = { sample: readonly (number | null)[]; code: number };

export function RecodeSequence({
  field,
  preview,
  missingBefore,
  missingAfter,
  animate,
  agent,
}: {
  field: string;
  preview: RecodePreview;
  missingBefore: number;
  missingAfter: number;
  animate: boolean;
  agent: Worker;
}) {
  const host = useRef<HTMLDivElement>(null);
  const beat = useMotionBeats(scanBeats, animate, field);
  const { code, sample } = preview;
  const row = Math.min(beat, sample.length);
  const committed = beat > sample.length;
  const delta = missingAfter - missingBefore;

  useEffect(() => {
    if (!animate || !committed) return;
    fly(host.current, `recode:${sample.length - 1}`, "recode:count", `+${delta} missing`, "bg-emerald-800 text-white");
  }, [animate, committed, delta, sample.length]);

  return (
    <div ref={host} className="relative grid gap-2 border-y py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h5 className="flex items-center gap-1.5 font-medium text-sm">
          <ScanLine aria-hidden className="size-4 text-muted-foreground" /> Recode preview
        </h5>
        <span className="text-muted-foreground text-xs">Illustrative cells · {displayFieldName(field)}</span>
      </div>
      <ol className="grid grid-cols-5 gap-1.5">
        {sample.map((value, index) => {
          const matched = value === code;
          const applied = matched && index < row;
          const focused = animate && index === row && !committed;
          return (
            <li
              key={`${index}:${value}`}
              data-cursor={`recode:${index}`}
              className={cn(
                "grid min-h-14 place-content-center gap-0.5 rounded-sm border bg-muted/25 px-0.5 text-center font-mono text-xs transition-colors",
                matched && !applied && "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200",
                applied && "border-emerald-600/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
                focused && "ring-2 ring-sky-500",
              )}
            >
              {applied ? (
                <>
                  <s className="text-[10px] opacity-70">{value}</s>
                  <motion.span
                    initial={animate ? { scale: 0.7, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    missing
                  </motion.span>
                </>
              ) : (
                (value ?? "missing")
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {committed ? (
            <Check aria-hidden className="size-3.5 text-emerald-600" />
          ) : (
            <span className="size-2 rounded-full bg-sky-500" />
          )}
          {committed ? "Rule applied to the analysis view" : `Looking for ${code}`}
        </span>
        <span data-cursor="recode:count" className="font-medium">
          <AnimatedNumber value={committed ? missingAfter : missingBefore} duration={700} /> missing
        </span>
      </div>
      {animate && (
        <AgentCursor
          agent={agent}
          container={host}
          target={committed ? "recode:count" : `recode:${Math.min(row, sample.length - 1)}`}
          click
        />
      )}
    </div>
  );
}

export function PartitionSequence({
  animate,
  agent,
  unit,
  complete,
  exploration,
  confirmation,
}: {
  animate: boolean;
  agent: Worker;
  unit: string;
  complete: number;
  exploration: { rows: number; units: number };
  confirmation: { rows: number; units: number };
}) {
  const host = useRef<HTMLDivElement>(null);
  const beat = useMotionBeats(splitBeats, animate, unit);
  const target =
    beat >= 4 ? "group:confirmation" : beat >= 3 ? "group:exploration" : beat >= 1 ? "group:key" : "group:input";
  useEffect(() => {
    if (!animate) return;
    if (beat === 3)
      fly(host.current, "group:key", "group:exploration", `${exploration.units} riders`, "bg-sky-800 text-white");
    if (beat === 4)
      fly(host.current, "group:key", "group:confirmation", `${confirmation.units} riders`, "bg-violet-800 text-white");
  }, [animate, beat, confirmation.units, exploration.units]);
  return (
    <div ref={host} className="relative grid gap-3 border-y py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span data-cursor="group:input">
          <b className="tabular-nums">{complete.toLocaleString("en-US")}</b> complete trips
        </span>
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
        <code
          data-cursor="group:key"
          className={cn("rounded px-1.5 py-0.5 font-mono", beat > 0 && "bg-sky-500/12 text-sky-900 dark:text-sky-200")}
        >
          {displayFieldName(unit)}
        </code>
        <span className="text-muted-foreground">All trips by one rider travel together</span>
      </div>
      <div aria-hidden className="flex h-1.5 overflow-hidden rounded-sm bg-muted">
        {[
          { width: exploration.rows, time: 3, side: "bg-sky-600" },
          { width: confirmation.rows, time: 4, side: "bg-violet-600" },
        ].map(({ width, time, side }) => (
          <span key={side} className="overflow-hidden" style={{ flexBasis: `${(width / complete) * 100}%` }}>
            <motion.span
              className={cn("block h-full origin-left", side)}
              initial={animate ? { scaleX: 0 } : false}
              animate={{ scaleX: beat > time ? 1 : 0 }}
              transition={{ duration: animate ? 0.48 : 0 }}
            />
          </span>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {[
          { key: "exploration", label: "Exploration", counts: exploration, arrives: 3, tone: "bg-sky-600" },
          { key: "confirmation", label: "Confirmation", counts: confirmation, arrives: 4, tone: "bg-violet-600" },
        ].map(({ key, label, counts, arrives, tone }) => {
          const received = beat > arrives;
          return (
            <div key={key} data-cursor={`group:${key}`} className="grid min-w-0 gap-1 border-t pt-2">
              <dt className="flex items-center gap-1.5 text-xs font-medium">
                <span className={cn("size-2 shrink-0 rounded-full", tone)} />
                {label}
              </dt>
              <dd className="min-h-10">
                {received ? (
                  <DatasetReveal delay={animate ? 20 : undefined}>
                    <b className="font-mono text-lg tabular-nums">{counts.rows.toLocaleString("en-US")}</b>
                    <span className="ml-1 text-muted-foreground text-xs">trips · {counts.units} riders</span>
                  </DatasetReveal>
                ) : (
                  <span className="text-muted-foreground text-xs">Awaiting assignment</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {beat >= 5 && (
        <motion.p
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300"
          initial={animate ? { opacity: 0, x: -8 } : false}
          animate={{ opacity: 1, x: 0 }}
        >
          <LockKeyhole aria-hidden className="size-3.5" /> 0 riders appear in both groups
        </motion.p>
      )}
      {animate && beat < 5 && <AgentCursor agent={agent} container={host} target={target} click />}
    </div>
  );
}
