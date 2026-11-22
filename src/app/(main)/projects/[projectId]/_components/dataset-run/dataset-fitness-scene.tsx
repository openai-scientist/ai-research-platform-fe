"use client";

import { useEffect, useRef } from "react";

import { cn } from "cn";
import { ArrowRight, ArrowUpRight, CircleCheck, GitBranch, Rows3, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { AgentCursor, launchFlight } from "../run-studio/run-bits";
import { DatasetReveal } from "./dataset-skeleton";
import type { DatasetWorkFacts } from "./dataset-work-scene";

export interface DatasetFitnessTrace {
  complete: number;
  total: number;
  phase: "coverage" | "groups" | "design" | "verdict";
}

const phases = ["coverage", "groups", "design", "verdict"] as const;
const format = (count: number) => count.toLocaleString("en-US");

export function DatasetFitnessScene({
  trace,
  decisions,
  split,
  overlap,
  caveats,
  animate,
  agent,
  onInspect,
}: {
  trace: DatasetFitnessTrace;
  decisions: NonNullable<DatasetWorkFacts["claimDecisions"]>;
  split?: DatasetWorkFacts["split"];
  overlap?: string;
  caveats?: readonly string[];
  animate: boolean;
  agent: "steward" | "reviewer" | null;
  onInspect: (key: string) => void;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const { complete, total, phase } = trace;
  const current = phases.indexOf(phase);
  const completeLabel = `${format(complete)} complete trips`;
  const coverage = Math.round((complete / total) * 100);
  const active = animate && phase !== "verdict";
  const explorationShare = split ? (100 * split.n_exploration) / complete : 0;

  useEffect(() => {
    const host = scene.current;
    if (!active || !host || host.clientWidth < 768) return;
    const timer = window.setTimeout(() => {
      const source = host.querySelector(`[data-fitness-source="${phase}"]`);
      const target = host.querySelector(`[data-fitness-target="${phase === "design" ? "limit" : "eligible"}"]`);
      const label = source?.getAttribute("data-fitness-token");
      const visible = [source, target].every((element) => {
        const rect = element?.getBoundingClientRect();
        return rect && rect.top >= 0 && rect.bottom <= window.innerHeight;
      });
      if (visible && label) launchFlight(source, target, label);
    }, 440);
    return () => window.clearTimeout(timer);
  }, [active, phase]);

  const evidence = [
    {
      key: "coverage",
      icon: Rows3,
      title: "Both measures recorded",
      value: completeLabel,
      detail: `${coverage}% of ${format(total)} trips have wait time and a rating after cleaning.`,
      target: "split",
    },
    {
      key: "groups",
      icon: GitBranch,
      title: "Rider-level split",
      value: overlap,
      detail: "Each rider stays in one group. Repeated trips still need to be accounted for within groups.",
      target: overlap ? "data_checks" : undefined,
    },
    {
      key: "design",
      icon: ShieldAlert,
      title: "Study design",
      value: "Observational diary",
      detail: "Wait times were observed. Route and time of day could influence both waits and ratings.",
      target: undefined,
    },
  ] as const;

  return (
    <div ref={scene} className="relative grid gap-3">
      <h4 className="flex items-center gap-2 font-semibold text-sm">
        <CircleCheck aria-hidden="true" className="size-4 text-muted-foreground" />
        What this dataset supports
      </h4>
      <div className="grid min-w-0 overflow-hidden rounded-lg border @3xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section aria-label="Evidence" className="min-w-0 bg-muted/25 @3xl:border-r">
          <h5 className="border-b px-4 py-2.5 font-medium text-xs">Evidence from this dataset</h5>
          <ol className="divide-y">
            {evidence.map(({ key, icon: Icon, title, value, detail, target }, index) => (
              <li
                key={key}
                aria-current={phase === key ? "step" : undefined}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 px-4 py-3 transition-colors",
                  phase === key && "bg-sky-500/8",
                )}
              >
                <Icon aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium text-xs">{title}</p>
                  <div data-cursor={key} className="mt-1 min-w-0">
                    <strong
                      data-fitness-source={key}
                      data-fitness-token={value}
                      className="block text-pretty font-semibold text-base tabular-nums tracking-tight"
                    >
                      {value}
                    </strong>
                    {key === "coverage" && (
                      <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-sky-600 dark:bg-sky-400"
                          initial={animate ? { width: 0 } : false}
                          animate={{ width: `${coverage}%` }}
                          transition={{ duration: animate ? 0.55 : 0 }}
                        />
                      </div>
                    )}
                    {key === "groups" && split && (
                      <div className="mt-2 grid gap-1">
                        <div
                          aria-hidden="true"
                          className="flex h-1.5 overflow-hidden rounded-full bg-violet-600 dark:bg-violet-400"
                        >
                          <motion.div
                            className="h-full rounded-r-full border-r border-background bg-sky-600 dark:bg-sky-400"
                            initial={false}
                            animate={{ width: `${explorationShare}%` }}
                            transition={{ duration: animate ? 0.45 : 0 }}
                          />
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-2 text-muted-foreground text-xs tabular-nums">
                          <span>{format(split.n_exploration)} exploration</span>
                          <span>{format(split.n_confirmation)} confirmation</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-pretty text-muted-foreground text-xs leading-relaxed">{detail}</p>
                  {target && (
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      onClick={() => onInspect(target)}
                      className="mt-1 h-auto px-0"
                      aria-label={key === "groups" ? `Open data checks for ${value}` : "Open the data partition"}
                    >
                      {key === "groups" ? "Open data checks" : "Open partition"}
                      <ArrowUpRight data-icon="inline-end" />
                    </Button>
                  )}
                </div>
                {index < current && <span className="sr-only">Applied to the decision</span>}
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Research decision" className="min-w-0 border-t @3xl:border-t-0">
          <h5 className="border-b px-4 py-2.5 font-medium text-xs">Research decision</h5>
          <ul className="divide-y">
            {decisions.map(({ claim, evidence: reasoning, supported }) => {
              const settled = supported ? current >= 2 : phase === "verdict";
              const target = supported ? "eligible" : "limit";
              return (
                <li key={claim} className="grid min-w-0 gap-2 px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-1.5" data-fitness-target={target}>
                    <Badge
                      variant="secondary"
                      className={cn(
                        settled &&
                          (supported
                            ? "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300"
                            : "bg-amber-500/12 text-amber-900 dark:text-amber-200"),
                      )}
                    >
                      {settled ? (supported ? "Can investigate" : "Unsupported claim") : "Assessing evidence"}
                    </Badge>
                  </div>
                  <p className="max-w-prose text-pretty font-(family-name:--font-lora) font-medium text-lg leading-snug">
                    {claim}
                  </p>
                  <DatasetReveal key={String(settled)} delay={settled && animate ? 100 : undefined}>
                    <p className="min-h-10 max-w-prose text-pretty text-muted-foreground text-xs leading-relaxed">
                      {settled
                        ? reasoning
                        : supported
                          ? "Checking coverage and whether any riders cross groups."
                          : "Checking how wait times were assigned."}
                    </p>
                  </DatasetReveal>
                </li>
              );
            })}
          </ul>
          {phase === "verdict" && caveats?.length ? (
            <div className="flex items-start gap-2 border-t bg-muted/25 px-4 py-2.5 text-xs">
              <ArrowRight aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <p className="text-pretty text-muted-foreground">
                <b className="font-medium text-foreground">Carry into the Data card.</b> {caveats.join(" ")}
              </p>
            </div>
          ) : null}
        </section>
      </div>
      {active && <AgentCursor agent={agent} container={scene} target={phase} click />}
    </div>
  );
}
