"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { ArrowUpRight, Check, FileText, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DataCardVariable } from "@/lib/api/services/fetch-dataset-runs";

import { AgentCursor, launchFlight } from "../run-studio/run-bits";
import { displayFieldName } from "./dataset-field-name";
import { DatasetReveal, DatasetSkeleton } from "./dataset-skeleton";
import type { DatasetWorkFacts } from "./dataset-work-scene";

const count = (n: number) => n.toLocaleString("en-US");
const STAGGER = 1120;
const FIRST_FLIGHT = 420;
const LANDING = 770;

function coverageFor(field: DataCardVariable, local: boolean) {
  const { n_missing: missing, n_valid: valid } = field.summary;
  if (missing == null || valid == null) return "Missing count unavailable in the release";
  const total = missing + valid;
  if (total <= 0) return "No values reported in the release";
  const pct = ((100 * missing) / total).toLocaleString("en-US", { maximumFractionDigits: 1 });
  const approximate = local ? "≈" : "";
  return `${approximate}${pct}% missing · ${approximate}${count(missing)} of ${approximate}${count(total)} values`;
}

export function DatasetCardAssembly({
  variables,
  facts,
  animate,
  local,
  onInspect,
  agent,
  review,
}: {
  variables: DataCardVariable[];
  facts: DatasetWorkFacts;
  animate: boolean;
  local: boolean;
  onInspect: (step: string) => void;
  agent: "steward" | "reviewer" | null;
  review?: DatasetWorkFacts["cardReview"];
}) {
  const host = useRef<HTMLElement>(null);
  const [assembly, setAssembly] = useState<{ signature: string; placed: number }>();
  const defined = variables.filter(({ label }) => label?.trim()).length;
  const roles = variables.filter(({ role }) => role === "input" || role === "target" || role === "both");
  const supported = facts.claimDecisions?.find((decision) => decision.supported);
  const coverage = roles.map((field) => `${displayFieldName(field.name)} · ${coverageFor(field, local)}`);
  const supportingChecks = facts.checkEvidence?.filter(({ state }) => state === "done") ?? [];
  const byRider = supportingChecks.find(({ section }) => section === "split");
  const entries = [
    {
      key: "question_map",
      source: "Question map",
      title: "Research scope",
      chip: facts.unit ? facts.unit : "Research scope",
      lines: [
        ...(facts.population ? [`Population · ${facts.population}`] : []),
        ...(facts.unit ? [`Observation unit · ${facts.unit}`] : []),
      ],
    },
    {
      key: "dictionary",
      source: "Data dictionary",
      title: "Measurements",
      chip: `${count(defined)} field definitions`,
      lines: [
        ...(defined ? [`${count(defined)} field definitions`] : []),
        ...roles.map(
          ({ name, label, role }) =>
            `${role === "both" ? "Exposure and outcome" : role === "input" ? "Exposure" : "Outcome"} · ${label?.trim() || name}`,
        ),
      ],
    },
    {
      key: "profile_quality",
      source: "Column profile",
      title: facts.cleaningRule ? "Coverage after cleaning" : "Coverage",
      chip: coverage[0] || "Coverage",
      lines: coverage,
    },
    ...(facts.cleaningRule
      ? [
          {
            key: "cleaning_recipe",
            source: "Cleaning recipe",
            title: "Cleaning applied",
            chip:
              facts.cleaningRule.matched === undefined
                ? "Cleaning rule"
                : `${count(facts.cleaningRule.matched)} recoded`,
            lines: [
              `${displayFieldName(facts.cleaningRule.field)} · ${facts.cleaningRule.condition} → ${facts.cleaningRule.treatment}`,
            ],
          },
        ]
      : []),
    {
      key: "split",
      source: "Data partition",
      title: "Analysis groups",
      chip: facts.split ? `${count(facts.split.n_confirmation)} confirmation` : "Partition",
      lines: facts.split
        ? [
            `${count(facts.split.n_exploration)} exploration · ${count(facts.split.n_confirmation)} confirmation`,
            ...(facts.split.unit_column ? [`Grouped by ${displayFieldName(facts.split.unit_column)}`] : []),
            ...(byRider?.observed ? [byRider.observed] : []),
          ]
        : [],
    },
    {
      key: "fitness",
      source: "Fitness decision",
      title: "Limits on interpretation",
      chip: supported ? "Association within the observed sample" : "Claim limits",
      lines: [...(supported ? [`Can investigate · ${supported.claim}`] : []), ...(facts.caveats ?? [])],
    },
  ];
  const ready = entries.filter((entry) => entry.lines.length);
  const signature = JSON.stringify(ready.map(({ key, lines }) => [key, lines]));
  const assembling = animate && !review;
  const placed = !assembling ? ready.length : assembly?.signature === signature ? assembly.placed : 0;
  const currentKey = assembling ? ready[placed]?.key : undefined;

  useEffect(() => {
    if (!assembling) return;
    const sources = [...(host.current?.querySelectorAll<HTMLElement>("[data-assembly-flight]") ?? [])];
    const timers = sources.flatMap((from, index) => {
      const start = FIRST_FLIGHT + index * STAGGER;
      return [
        window.setTimeout(() => {
          const key = from.dataset.assemblySource;
          const target = host.current?.querySelector(`[data-assembly-target="${key}"]`);
          const visible = [from, target].every((node) => {
            const rect = node?.getBoundingClientRect();
            return rect && rect.top >= 0 && rect.bottom <= window.innerHeight;
          });
          if (visible) launchFlight(from, target, from.dataset.assemblyFlight ?? "", "bg-sky-800 text-white");
        }, start),
        window.setTimeout(
          () =>
            setAssembly((previous) => ({
              signature,
              placed: Math.max(previous?.signature === signature ? previous.placed : 0, index + 1),
            })),
          start + LANDING,
        ),
      ];
    });
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [assembling, signature]);

  const checkedCount = review?.checks.filter(({ checked }) => checked).length ?? 0;

  return (
    <article
      ref={host}
      aria-label={review ? "Independent Data card review" : "Data card assembly"}
      className="relative min-w-0"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
        <h4 className="flex items-center gap-2 font-semibold text-sm">
          {review ? (
            <ShieldCheck aria-hidden="true" className="size-4 text-muted-foreground" />
          ) : (
            <FileText aria-hidden="true" className="size-4 text-sky-700 dark:text-sky-300" />
          )}
          {review ? "Independent Data card review" : "Assemble the Data card"}
        </h4>
        <Badge variant="outline" className="tabular-nums" aria-live="polite">
          {review
            ? `${checkedCount} / ${review.checks.length} checks complete`
            : `${placed} / ${ready.length} sections added`}
        </Badge>
      </header>
      <div className="min-w-0 overflow-hidden rounded-lg border">
        <Table aria-label={review ? "Reviewed Data card" : "Data card draft"} className="table-fixed text-xs">
          <TableHeader className="bg-muted/45">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="h-9 w-[34%] px-2.5 @lg:w-1/4 @lg:px-3">
                Section
              </TableHead>
              <TableHead scope="col" className="h-9 px-2.5 @lg:px-3">
                {review ? "Evidence and review" : "Draft content"}
              </TableHead>
              <TableHead scope="col" className="h-9 w-16 px-2 text-right @lg:w-24 @lg:px-3">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(({ key, title, source, chip, lines }) => {
              const index = ready.findIndex((entry) => entry.key === key);
              const copied = index >= 0 && index < placed;
              const inFlight = key === currentKey;
              const reviewCheck = review?.checks.find(({ section }) => section === key);
              const underReview = review?.active === key;
              const uniqueLines = [...new Set(lines)];
              return (
                <TableRow
                  key={key}
                  className={cn(
                    inFlight && "bg-sky-500/8 hover:bg-sky-500/8",
                    underReview && "bg-violet-500/8 hover:bg-violet-500/8",
                  )}
                >
                  <th scope="row" className="wrap-anywhere px-2.5 py-2.5 text-left align-top @lg:px-3">
                    <span className="block font-semibold">{title}</span>
                    <button
                      type="button"
                      data-assembly-source={key}
                      data-cursor={`assembly:${key}`}
                      data-assembly-flight={lines.length ? chip : undefined}
                      onClick={() => onInspect(key)}
                      aria-label={`Open evidence from ${source}`}
                      className={cn(
                        "mt-1 inline-flex max-w-full cursor-pointer items-start gap-1 rounded-sm text-left font-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring",
                        inFlight && "text-sky-900 dark:text-sky-200",
                      )}
                    >
                      <span className="wrap-anywhere">{source}</span>
                      <ArrowUpRight aria-hidden="true" className="mt-0.5 size-2.5 shrink-0" />
                    </button>
                  </th>
                  <TableCell className="px-2.5 py-2.5 align-top whitespace-normal @lg:px-3">
                    <div
                      data-assembly-target={key}
                      data-cursor={`review:${key}`}
                      className="grid min-w-0 wrap-anywhere text-muted-foreground"
                    >
                      {index < 0 ? (
                        "Awaiting run record"
                      ) : (
                        <>
                          <ul className="invisible col-start-1 row-start-1 grid gap-0.5" aria-hidden>
                            {uniqueLines.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                          <div className="relative col-start-1 row-start-1">
                            <AnimatePresence initial={false} mode="popLayout">
                              {copied ? (
                                <motion.ul key="written" className="grid gap-0.5">
                                  {uniqueLines.map((line, lineIndex) => (
                                    <motion.li
                                      key={line}
                                      initial={
                                        assembling ? { opacity: 0, x: -7, clipPath: "inset(0 100% 0 0)" } : false
                                      }
                                      animate={{ opacity: 1, x: 0, clipPath: "inset(0 0% 0 0)" }}
                                      transition={{
                                        duration: 0.36,
                                        delay: assembling ? Math.min(lineIndex, 4) * 0.1 : 0,
                                      }}
                                    >
                                      {line}
                                    </motion.li>
                                  ))}
                                </motion.ul>
                              ) : (
                                <motion.div
                                  key="pending"
                                  exit={{ opacity: 0 }}
                                  className="grid max-w-52 gap-1.5 pt-0.5"
                                >
                                  <DatasetSkeleton scan={inFlight} className="h-2.5 w-full" />
                                  {lines.length > 1 && <DatasetSkeleton scan={inFlight} className="h-2.5 w-2/3" />}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </>
                      )}
                    </div>
                    {reviewCheck && (underReview || reviewCheck.checked) && (
                      <DatasetReveal
                        key={reviewCheck.checked ? "checked" : "checking"}
                        delay={animate ? 100 : undefined}
                      >
                        <p className="mt-2 flex items-start gap-1.5 text-foreground">
                          <ShieldCheck aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                          {reviewCheck.checked ? reviewCheck.note : reviewCheck.operation}
                        </p>
                      </DatasetReveal>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-right align-top @lg:px-3">
                    {review ? (
                      reviewCheck?.checked ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300">
                          <Check aria-hidden="true" className="hidden size-3 shrink-0 @lg:inline" /> Verified
                        </span>
                      ) : (
                        <span className={underReview ? "font-medium text-foreground" : "text-muted-foreground"}>
                          {underReview ? "Checking" : reviewCheck ? "Queued" : "—"}
                        </span>
                      )
                    ) : copied ? (
                      <motion.span
                        className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300"
                        initial={animate ? { opacity: 0, scale: 0.65 } : false}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <Check aria-hidden className="size-3 shrink-0" /> Added
                      </motion.span>
                    ) : inFlight ? (
                      <span className="font-medium text-sky-800 dark:text-sky-200">Writing</span>
                    ) : (
                      <span className="text-muted-foreground">{index >= 0 ? "Queued" : "—"}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {currentKey && <AgentCursor agent={agent} container={host} target={`assembly:${currentKey}`} click />}
      {animate && review?.active && (
        <AgentCursor agent={agent} container={host} target={`review:${review.active}`} click />
      )}
      {!review && (
        <footer className="flex items-start gap-2 pt-2.5 text-muted-foreground text-xs">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
          <p>
            <strong className="font-medium text-foreground">Next · Independent review.</strong> Once accepted, the Data
            card and brief are available to Hypothesis.
          </p>
        </footer>
      )}
    </article>
  );
}
