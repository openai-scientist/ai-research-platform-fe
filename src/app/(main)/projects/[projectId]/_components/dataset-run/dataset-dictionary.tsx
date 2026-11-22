"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { ArrowUpRight, BookOpen, Check, Circle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import type { DataCardVariable } from "@/lib/api/services/fetch-dataset-runs";

import { AgentCursor, launchFlight } from "../run-studio/run-bits";
import { RUN_EASE } from "../run-studio/run-track";
import styles from "./dataset-dictionary.module.css";
import { displayFieldName } from "./dataset-field-name";
import { DatasetSkeleton } from "./dataset-skeleton";

export function DatasetDictionary({
  columns,
  variables,
  active,
  written,
  notes,
  agent,
  live,
}: {
  columns: readonly string[];
  variables: DataCardVariable[];
  active?: string;
  written?: readonly string[];
  notes?: Record<string, { unit: string; timing: string }>;
  agent: "steward" | "reviewer" | null;
  live: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const destination = useRef<HTMLElement>(null);
  const [inspection, setInspection] = useState<{ name: string; beat?: string }>();
  const reduced = useReducedMotion();
  const fields = new Map(variables.map((entry) => [entry.name, entry]));
  const names = [...new Set([...columns, ...fields.keys()])];
  const recorded = new Set(written ?? variables.filter(({ label }) => label?.trim()).map(({ name }) => name));
  const following = active && names.includes(active) ? active : names[0];
  const focused =
    inspection && inspection.beat === following && names.includes(inspection.name) ? inspection.name : following;
  const field = focused ? fields.get(focused) : undefined;
  const fieldNotes = focused ? notes?.[focused] : undefined;
  const writing = Boolean(live && agent && active && focused === active && !recorded.has(active));
  const inspectingActive = live && agent && active && focused === active;
  const animate = !reduced && Boolean(inspectingActive && (writing || written === undefined));
  const showDefinition = focused && (recorded.has(focused) || writing);
  const label = showDefinition ? field?.label?.trim() : undefined;
  const count = names.filter((name) => recorded.has(name)).length;

  useEffect(() => {
    if (!animate || !focused) return;
    const timer = window.setTimeout(() => {
      const source = host.current?.querySelector(`[data-dictionary-source="${CSS.escape(focused)}"]`);
      const target = destination.current;
      const rect = target?.getBoundingClientRect();
      if (rect && rect.top >= 0 && rect.bottom <= window.innerHeight) {
        launchFlight(source, target, displayFieldName(focused).slice(0, 36), "bg-sky-800 text-white");
      }
    }, 405);
    return () => window.clearTimeout(timer);
  }, [animate, focused]);

  if (!focused) return <p className="text-muted-foreground text-sm">The source has not reported any fields yet.</p>;

  return (
    <div ref={host} className="@container relative min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-2.5">
        <h4 className="flex items-center gap-2 font-semibold text-sm">
          <BookOpen aria-hidden="true" className="size-4 text-muted-foreground" />
          Data dictionary
        </h4>
        <span className="text-muted-foreground text-xs tabular-nums">
          <span className="font-semibold text-foreground">
            {count} / {names.length}
          </span>{" "}
          defined
        </span>
      </header>
      <div className="grid @lg:grid-cols-[minmax(15rem,1fr)_minmax(0,1.4fr)]">
        <div className="min-w-0 border-b @lg:border-r @lg:border-b-0">
          <h5 className="pt-3 pb-2 font-medium text-muted-foreground text-xs @lg:pr-3">Source fields</h5>
          <ul className="grid min-w-0 gap-0.5 pb-2 @lg:mr-3">
            {names.map((name) => {
              const done = recorded.has(name);
              return (
                <li key={name} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={focused === name}
                    aria-label={`${name}, ${done ? "defined" : "definition pending"}`}
                    data-cursor={name}
                    onClick={() => setInspection({ name, beat: following })}
                    className={cn(
                      "flex min-h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      focused === name && "bg-sky-500/12 text-sky-900 dark:text-sky-200",
                    )}
                  >
                    {done ? (
                      <motion.span
                        key="defined"
                        data-dictionary-written={name}
                        initial={live && !reduced ? { opacity: 0, scale: 0.35, rotate: -25 } : false}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 0.36, ease: RUN_EASE }}
                        className="shrink-0 text-emerald-700 dark:text-emerald-300"
                      >
                        <Check aria-hidden="true" className="size-3.5" />
                      </motion.span>
                    ) : (
                      <Circle aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/70" />
                    )}
                    <code data-dictionary-source={name} className="min-w-0 wrap-anywhere font-mono text-xs">
                      {displayFieldName(name)}
                    </code>
                    {focused === name && <ArrowUpRight aria-hidden="true" className="ml-auto size-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid min-w-0 content-start gap-3 pt-4 @lg:min-h-52 @lg:pl-6 @lg:pt-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <code
              ref={destination}
              className="max-w-full wrap-anywhere rounded border bg-background px-2 py-1 font-medium font-mono text-xs"
            >
              {displayFieldName(focused)}
            </code>
            <span
              className={cn("text-muted-foreground text-xs", writing && "font-medium text-sky-800 dark:text-sky-200")}
            >
              {writing ? "Writing definition" : recorded.has(focused) ? "Defined" : "Awaiting definition"}
            </span>
          </div>

          <div key={focused} className="relative grid min-h-20 content-center border-y py-3 @lg:min-h-24">
            {(animate || (live && !label)) && (
              <div
                className={cn(
                  "pointer-events-none absolute right-0 left-0 grid gap-2 self-center",
                  label && styles.definitionPlaceholder,
                )}
              >
                <DatasetSkeleton className="h-4 w-3/4" />
                <DatasetSkeleton className="h-3 w-2/5" />
              </div>
            )}
            {label ? (
              <p className="flex flex-wrap items-baseline gap-x-[0.28em] gap-y-1 font-medium font-serif text-2xl leading-tight @lg:text-3xl">
                <span className="sr-only">{label}</span>
                {label.split(/\s+/).map((word, index) => (
                  <span
                    // The words have fixed positions in a definition and can repeat.
                    // biome-ignore lint/suspicious/noArrayIndexKey: a word can appear more than once.
                    key={index}
                    aria-hidden="true"
                    style={animate ? { animationDelay: `${0.52 + Math.min(index, 12) * 0.08}s` } : undefined}
                    className={cn("inline-block min-w-0 max-w-full wrap-anywhere", animate && styles.enteringWord)}
                  >
                    {word}
                  </span>
                ))}
              </p>
            ) : (
              <p className={cn("text-muted-foreground text-sm", live && "sr-only")}>Waiting for the field meaning.</p>
            )}
          </div>

          {field && showDefinition && (
            <motion.dl
              key={`${focused}-metadata`}
              initial={animate ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: animate ? 1.17 : 0, duration: reduced ? 0 : 0.3, ease: RUN_EASE }}
              className="flex flex-wrap gap-x-5 gap-y-1 text-xs"
            >
              <div className="flex flex-wrap items-baseline gap-1.5">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="wrap-anywhere font-medium">{field.type}</dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-1.5">
                <dt className="text-muted-foreground">Measure</dt>
                <dd className="wrap-anywhere font-medium">{field.measure}</dd>
              </div>
              {fieldNotes && (
                <>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <dt className="text-muted-foreground">Unit or scale</dt>
                    <dd className="font-medium">{fieldNotes.unit}</dd>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <dt className="text-muted-foreground">When recorded</dt>
                    <dd className="font-medium">{fieldNotes.timing}</dd>
                  </div>
                </>
              )}
            </motion.dl>
          )}
        </div>
      </div>
      {!reduced && <AgentCursor agent={agent} container={host} target={inspectingActive ? focused : null} click />}
    </div>
  );
}
