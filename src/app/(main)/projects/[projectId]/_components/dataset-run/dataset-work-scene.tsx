"use client";

import { useEffect, useRef } from "react";

import { cn } from "cn";
import {
  ArrowDown,
  ArrowUpRight,
  CircleCheck,
  Filter,
  Flag,
  GitBranch,
  Link2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DataCardBody, DataCardVariable } from "@/lib/api/services/fetch-dataset-runs";
import type { StepView } from "@/lib/run-stream/dataset-run-model";

import { AgentCursor, launchFlight } from "../run-studio/run-bits";
import { RUN_EASE } from "../run-studio/run-track";
import { PartitionSequence, type RecodePreview, RecodeSequence } from "./dataset-action-sequences";
import { DatasetCardAssembly } from "./dataset-card-assembly";
import { DatasetDictionary } from "./dataset-dictionary";
import { displayFieldName } from "./dataset-field-name";
import { DatasetFitnessScene, type DatasetFitnessTrace } from "./dataset-fitness-scene";
import { PartitionBasis, type PartitionMethodEvidence, type SourceMethodEvidence } from "./dataset-method-evidence";
import { DatasetReveal, DatasetSkeleton } from "./dataset-skeleton";

const number = (amount: number) => amount.toLocaleString("en-US");
const checkLabels: Record<StepView["state"], string> = {
  todo: "Pending",
  now: "Checking",
  asking: "Needs review",
  done: "Checked",
};
const sceneKeys: ReadonlySet<string> = new Set([
  "dictionary",
  "cleaning_recipe",
  "question_map",
  "split",
  "data_checks",
  "fitness",
  "disclosure",
]);

export function hasDatasetWorkScene(key?: string) {
  return key !== undefined && sceneKeys.has(key);
}

export interface DatasetWorkFacts {
  question?: string;
  unit?: string | null;
  population?: string;
  split?: DataCardBody["split"];
  caveats?: string[];
  dictionaryWritten?: readonly string[];
  sourceEvidence?: SourceMethodEvidence;
  partitionBasis?: PartitionMethodEvidence;
  fieldNotes?: Record<string, { unit: string; timing: string }>;
  cleaningRule?: {
    field: string;
    condition: string;
    treatment: string;
    authority?: string;
    matched?: number;
    missingBefore?: number;
    missingAfter?: number;
    preview?: RecodePreview;
  };
  claimDecisions?: readonly { claim: string; evidence: string; supported: boolean }[];
  fitnessTrace?: DatasetFitnessTrace;
  checkEvidence?: readonly {
    title: string;
    section?: string;
    proof: string;
    state: "now" | "done" | "todo";
    rule?: string;
    method?: string;
    observed?: string;
  }[];
  cardReview?: {
    active?: string;
    checks: readonly { section: string; operation: string; note: string; checked: boolean }[];
  };
}

function QuestionMap({
  facts,
  variables,
  waiting,
  animate,
}: {
  facts: DatasetWorkFacts;
  variables: DataCardVariable[];
  waiting: boolean;
  animate: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const roles = [
    { key: "input", label: "Exposure", fields: variables.filter(({ role }) => role === "input" || role === "both") },
    { key: "outcome", label: "Outcome", fields: variables.filter(({ role }) => role === "target" || role === "both") },
  ];
  const mappedInput = roles[0].fields[0]?.name;
  const mappedOutcome = roles[1].fields[0]?.name;
  useEffect(() => {
    if (!animate || reduced) return;
    const mapped = [
      { key: "input", name: mappedInput },
      { key: "outcome", name: mappedOutcome },
    ];
    const timers = mapped.flatMap(({ key, name }, index) => {
      if (!name) return [];
      return [
        window.setTimeout(
          () => {
            const root = host.current;
            const target = root?.querySelector(`[data-map-destination="${key}"]`);
            const rect = target?.getBoundingClientRect();
            if (rect && rect.top >= 0 && rect.bottom <= window.innerHeight) {
              launchFlight(
                root?.querySelector(`[data-map-source="${key}"]`),
                target,
                displayFieldName(name).slice(0, 36),
                key === "input" ? "bg-sky-800 text-white" : "bg-violet-800 text-white",
              );
            }
          },
          180 + index * 470,
        ),
      ];
    });
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [animate, mappedInput, mappedOutcome, reduced]);

  return (
    <div ref={host} className="@container grid gap-3">
      <div className="min-w-0">
        {facts.question && (
          <blockquote className="border-b pb-4 text-pretty font-serif text-xl leading-tight @lg:text-2xl">
            {facts.question}
          </blockquote>
        )}
        <div className="flex flex-wrap items-center gap-2 border-b py-2.5">
          <span className="mr-1 font-medium text-muted-foreground text-xs">From the dictionary</span>
          {roles.map(
            ({ key, fields }) =>
              fields[0] && (
                <code
                  key={key}
                  data-map-source={key}
                  className="max-w-full wrap-anywhere rounded border bg-background px-1.5 py-0.5 font-mono text-xs"
                >
                  {displayFieldName(fields[0].name)}
                </code>
              ),
          )}
        </div>
        <dl className="grid py-3 @lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)]">
          {roles.map(({ key, label, fields }, index) => (
            <div key={key} className={cn("relative min-w-0", index === 1 && "mt-2 @lg:col-start-3 @lg:mt-0")}>
              <div className={cn("relative h-full min-w-0 py-2.5 @lg:px-3", index === 1 && "border-t @lg:border-t-0")}>
                <dt
                  className={cn(
                    "mb-2 flex items-center gap-1.5 font-semibold text-xs",
                    index === 0 ? "text-sky-900 dark:text-sky-200" : "text-violet-900 dark:text-violet-200",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn("size-2 rounded-full", index === 0 ? "bg-sky-600" : "bg-violet-600")}
                  />
                  {label}
                </dt>
                <dd className="grid min-h-11 min-w-0 gap-2">
                  {fields.length ? (
                    fields.map(({ name, label: meaning }, position) => (
                      <DatasetReveal key={name} delay={animate && !reduced ? 960 + index * 470 : undefined}>
                        <code
                          data-map-destination={position === 0 ? key : undefined}
                          className="inline-block max-w-full wrap-anywhere rounded border bg-background px-1.5 py-0.5 font-medium font-mono text-xs"
                        >
                          {displayFieldName(name)}
                        </code>
                        {meaning && <p className="mt-1 wrap-anywhere text-muted-foreground text-xs">{meaning}</p>}
                      </DatasetReveal>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs">Awaiting field mapping</span>
                  )}
                </dd>
                {animate && !reduced && fields.length > 0 && (
                  <motion.span
                    key={displayFieldName(fields[0].name)}
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left",
                      index === 0 ? "bg-sky-500" : "bg-violet-500",
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.75, 0], scaleX: [0.25, 1, 1] }}
                    transition={{ delay: 0.92 + index * 0.47, duration: 0.52, ease: RUN_EASE }}
                  />
                )}
              </div>
              {index === 0 && (
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-full hidden w-10 items-center justify-center @lg:flex"
                >
                  <span className="absolute inset-x-0 border-t border-dashed border-muted-foreground/45" />
                  <Link2 className="relative size-5 rounded-sm bg-background p-0.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </dl>
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-2 gap-y-1 border-t py-2.5 text-xs",
            waiting && "border-amber-500/40",
          )}
        >
          <UsersRound aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium">
            {facts.population ? "Population" : facts.unit ? "Observation unit" : "Population"}
          </span>
          <span className="text-muted-foreground">
            {facts.population ? facts.population : facts.unit ? facts.unit : "Awaiting the run record"}
          </span>
          {waiting && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200">
              <Flag aria-hidden="true" className="size-3" /> Needs your confirmation
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CleaningRule({
  rule,
  notes,
  animate,
  agent,
}: {
  rule: DatasetWorkFacts["cleaningRule"];
  notes?: string;
  animate: boolean;
  agent: "steward" | "reviewer" | null;
}) {
  return (
    <div className="grid gap-3">
      <h4 className="flex items-center gap-2 font-semibold text-sm">
        <Filter aria-hidden="true" className="size-4 text-muted-foreground" /> Cleaning recipe
      </h4>
      {rule && (
        <dl className="grid gap-1 border-y py-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
          {[
            { title: "Field", value: rule.field, mono: true },
            { title: "When", value: rule.condition },
            { title: "Treatment", value: rule.treatment },
          ].map(({ title, value, mono }, index) => (
            <div key={title} className="contents">
              {index > 0 && <ArrowDown aria-hidden="true" className="size-3.5 text-muted-foreground sm:-rotate-90" />}
              <div className="min-w-0 py-2 sm:px-2">
                <dt className="text-muted-foreground text-xs">{title}</dt>
                <dd className={cn("mt-1 wrap-anywhere font-medium text-sm", mono && "font-mono")}>
                  <DatasetReveal delay={animate ? 230 + index * 320 : undefined}>{value}</DatasetReveal>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
      {rule?.authority && <p className="text-muted-foreground text-xs">{rule.authority}</p>}
      {rule?.preview && rule.missingBefore !== undefined && rule.missingAfter !== undefined && (
        <RecodeSequence
          field={rule.field}
          preview={rule.preview}
          missingBefore={rule.missingBefore}
          missingAfter={rule.missingAfter}
          animate={animate}
          agent={agent}
        />
      )}
      {rule?.matched !== undefined && rule.missingBefore !== undefined && rule.missingAfter !== undefined && (
        <DatasetReveal delay={animate ? (rule.preview ? 3900 : 1250) : undefined}>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-y py-2.5 text-xs">
            <strong>{number(rule.matched)} values match</strong>
            <span className="text-muted-foreground">· Missing in the analysis view</span>
            <span className="font-mono tabular-nums">
              {number(rule.missingBefore)} → {number(rule.missingAfter)}
            </span>
          </p>
        </DatasetReveal>
      )}
      {notes && !rule?.preview && <p className="text-muted-foreground text-sm">{notes}</p>}
      <p className="text-muted-foreground text-xs">The original version retains its source values.</p>
    </div>
  );
}

function Partition({
  split,
  basis,
  animate,
  working,
  agent,
}: {
  split: DatasetWorkFacts["split"];
  basis?: PartitionMethodEvidence;
  animate: boolean;
  working: boolean;
  agent: "steward" | "reviewer" | null;
}) {
  const total = split ? split.n_exploration + split.n_confirmation : 0;
  const exploration = split && total > 0 ? split.n_exploration / total : 0;
  return (
    <div className="grid gap-3">
      <h4 className="flex items-center gap-2 font-semibold text-sm">
        <GitBranch aria-hidden="true" className="size-4 text-muted-foreground" /> Exploration and confirmation
      </h4>
      {basis && split && <PartitionBasis basis={basis} animate={animate} />}
      {basis && split?.unit_column ? (
        <PartitionSequence
          animate={animate}
          agent={agent}
          unit={split.unit_column}
          complete={basis.completeRows}
          exploration={{ rows: split.n_exploration, units: basis.explorationUnits }}
          confirmation={{ rows: split.n_confirmation, units: basis.confirmationUnits }}
        />
      ) : split && total > 0 ? (
        <div className="grid gap-2 border-y py-3">
          <p className="text-muted-foreground text-xs">
            <strong className="font-semibold text-foreground tabular-nums">{number(total)}</strong> observations
            {split.unit_column ? ` · grouped by ${displayFieldName(split.unit_column)}` : ""}
          </p>
          <div aria-hidden="true" className="flex h-4 overflow-hidden rounded-sm bg-muted">
            <div className="overflow-hidden" style={{ flexBasis: `${exploration * 100}%` }}>
              <motion.div
                initial={animate ? { scaleX: 0.7, x: "24%", opacity: 0.25 } : false}
                animate={{ scaleX: 1, x: 0, opacity: 1 }}
                transition={{ duration: 0.62, ease: RUN_EASE }}
                className="h-full origin-right rounded-l-sm bg-sky-700 dark:bg-sky-500"
              />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden border-l border-background">
              <motion.div
                initial={animate ? { scaleX: 0.55, x: "-30%", opacity: 0.25 } : false}
                animate={{ scaleX: 1, x: 0, opacity: 1 }}
                transition={{ duration: 0.72, ease: RUN_EASE }}
                className="h-full origin-left rounded-r-sm bg-violet-700 dark:bg-violet-500"
              />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            {[
              { label: "Exploration", count: split.n_exploration, tone: "text-sky-800 dark:text-sky-300" },
              { label: "Confirmation", count: split.n_confirmation, tone: "text-violet-800 dark:text-violet-300" },
            ].map(({ label, count, tone }, index) => (
              <motion.div
                key={label}
                initial={animate ? { opacity: 0, y: -7 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: animate ? 0.32 + index * 0.1 : 0, duration: 0.34, ease: RUN_EASE }}
              >
                <dt className={cn("wrap-anywhere font-medium text-xs", tone)}>{label}</dt>
                <dd className="font-mono text-lg tabular-nums">{number(count)}</dd>
              </motion.div>
            ))}
          </dl>
        </div>
      ) : working && !split ? (
        <div className="grid gap-2 border-y py-3">
          <p className="text-muted-foreground text-xs">Assigning observations to groups</p>
          <DatasetSkeleton className="h-6 w-full" />
          <dl className="grid grid-cols-2 gap-2">
            {["Exploration", "Confirmation"].map((label) => (
              <div key={label} className="grid gap-1">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd>
                  <DatasetSkeleton className="h-6 w-14 max-w-full" />
                  <span className="sr-only">Count pending</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          {split ? "No observations in the partition." : "Counts appear when the partition is recorded."}
        </p>
      )}
    </div>
  );
}

export function DatasetWorkScene({
  step,
  steps,
  columns,
  variables = [],
  facts,
  active,
  agent,
  notes,
  card,
  live,
  local,
  onInspect,
}: {
  step: StepView;
  steps: StepView[];
  columns: readonly string[];
  variables?: DataCardVariable[];
  facts: DatasetWorkFacts;
  active?: string;
  agent: "steward" | "reviewer" | null;
  notes?: string;
  card?: React.ReactNode;
  live: boolean;
  local: boolean;
  onInspect: (key: string) => void;
}) {
  const reduce = useReducedMotion();
  const checkHost = useRef<HTMLDivElement>(null);
  const activeCheck =
    facts.checkEvidence?.find((check) => check.state === "now") ??
    facts.checkEvidence?.findLast((check) => check.state === "done");
  const working = live && step.state === "now";
  const animate = working && !reduce;
  let body: React.ReactNode;
  switch (step.key) {
    case "dictionary":
      body = (
        <DatasetDictionary
          columns={columns}
          variables={variables}
          active={active}
          written={facts.dictionaryWritten}
          notes={facts.fieldNotes}
          agent={agent}
          live={live && step.state === "now"}
        />
      );
      break;
    case "cleaning_recipe":
      body = <CleaningRule rule={facts.cleaningRule} notes={notes} animate={animate} agent={agent} />;
      break;
    case "question_map":
      body = (
        <QuestionMap
          facts={facts}
          variables={variables}
          waiting={step.state === "asking"}
          animate={live && step.state === "now"}
        />
      );
      break;
    case "split":
      body = (
        <Partition split={facts.split} basis={facts.partitionBasis} animate={animate} working={working} agent={agent} />
      );
      break;
    case "data_checks":
      body = (
        <div ref={checkHost} className="relative grid gap-3">
          <h4 className="flex items-center gap-2 font-semibold text-sm">
            <ShieldCheck className="size-4 text-muted-foreground" /> Checks feeding the decision
          </h4>
          <div className="min-w-0 overflow-hidden rounded-lg border">
            <Table aria-label="Data check results" className="table-fixed text-xs">
              <TableHeader className="bg-muted/45">
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col" className="h-9 w-[32%] px-3 @lg:w-1/5">
                    Check
                  </TableHead>
                  <TableHead scope="col" className="hidden h-9 w-[23%] px-3 @lg:table-cell">
                    Rule
                  </TableHead>
                  <TableHead scope="col" className="h-9 px-3">
                    Observed result
                  </TableHead>
                  <TableHead scope="col" className="h-9 w-[4.75rem] px-2 text-right @lg:w-24 @lg:px-3">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  facts.checkEvidence ??
                  steps
                    .filter(({ key }) => ["profile_quality", "question_map", "split", "data_checks"].includes(key))
                    .map(({ title, state }) => ({
                      title,
                      state,
                      proof: "",
                      rule: undefined,
                      method: undefined,
                      observed: undefined,
                    }))
                ).map((check) => {
                  const checking = check.state === "now";
                  return (
                    <TableRow key={check.title} className={cn(checking && "bg-sky-500/8 hover:bg-sky-500/8")}>
                      <th scope="row" className="wrap-anywhere px-3 py-3 text-left align-top font-medium">
                        <span>{check.title}</span>
                        {check.rule && (
                          <p className="mt-1 text-muted-foreground font-normal @lg:hidden">{check.rule}</p>
                        )}
                      </th>
                      <TableCell className="hidden whitespace-normal wrap-anywhere px-3 py-3 align-top text-muted-foreground @lg:table-cell">
                        {check.rule || "—"}
                      </TableCell>
                      <TableCell
                        data-cursor={check.title}
                        className="whitespace-normal wrap-anywhere px-3 py-3 align-top"
                      >
                        {checking ? (
                          <div className="grid gap-1.5 text-muted-foreground">
                            <DatasetSkeleton scan={working} className="h-2.5 w-24 max-w-full" />
                            <span>{check.method ?? "Evaluating rule"}</span>
                          </div>
                        ) : check.state === "done" && (check.observed || check.proof) ? (
                          <DatasetReveal key={check.state} delay={animate ? 100 : undefined}>
                            {check.observed && <p className="font-medium">{check.observed}</p>}
                            {check.proof && <p className="mt-0.5 text-muted-foreground">{check.proof}</p>}
                          </DatasetReveal>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-right align-top @lg:px-3">
                        <motion.div
                          key={check.state}
                          initial={animate ? { opacity: 0, scale: 0.72 } : false}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.31, ease: RUN_EASE }}
                        >
                          <Badge
                            variant="secondary"
                            className={cn(
                              check.state === "done" && "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
                              check.state === "now" && "bg-sky-500/12 text-sky-800 dark:text-sky-300",
                            )}
                          >
                            {checkLabels[check.state]}
                          </Badge>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {animate && activeCheck && (
            <AgentCursor agent={agent} container={checkHost} target={activeCheck.title} click />
          )}
          {notes && !facts.checkEvidence && <p className="text-muted-foreground text-xs">{notes}</p>}
        </div>
      );
      break;
    case "fitness":
      if (facts.fitnessTrace && facts.claimDecisions?.length) {
        body = (
          <DatasetFitnessScene
            trace={facts.fitnessTrace}
            decisions={facts.claimDecisions}
            split={facts.split}
            overlap={
              facts.checkEvidence?.find(({ section, state }) => section === "split" && state === "done")?.observed
            }
            caveats={facts.caveats}
            animate={animate}
            agent={agent}
            onInspect={onInspect}
          />
        );
        break;
      }
      body = (
        <div className="grid gap-3">
          <h4 className="flex items-center gap-2 font-semibold text-sm">
            <CircleCheck className="size-4 text-muted-foreground" /> What this dataset supports
          </h4>
          {notes ? (
            <motion.blockquote
              key={notes}
              initial={animate ? { opacity: 0, y: 6, clipPath: "inset(0 100% 0 0)" } : false}
              animate={{ opacity: 1, y: 0, clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 0.58, ease: RUN_EASE }}
              className="max-w-prose text-pretty font-medium font-serif text-xl leading-snug sm:text-2xl"
            >
              {notes}
            </motion.blockquote>
          ) : working ? (
            <DatasetSkeleton className="h-5 w-64 max-w-full" />
          ) : null}
          {facts.caveats?.length ? (
            <div className="border-t pt-3">
              <h5 className="font-medium text-xs">Limits to carry forward</h5>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground text-xs">
                {facts.caveats.map((note) => (
                  <motion.li
                    key={note}
                    initial={animate ? { opacity: 0, x: -8 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.28, delay: animate ? 0.43 : 0, ease: RUN_EASE }}
                  >
                    {note}
                  </motion.li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">The Data card records the verdict and any limits.</p>
          )}
        </div>
      );
      break;
    case "disclosure":
    case "review":
      body = (
        <div className="grid gap-3">
          <DatasetCardAssembly
            variables={variables}
            facts={facts}
            animate={animate}
            agent={agent}
            review={step.key === "review" ? facts.cardReview : undefined}
            local={local}
            onInspect={onInspect}
          />
          {card && (
            <details className="border-t">
              <summary className="cursor-pointer py-2.5 font-medium text-xs">View the published Data card</summary>
              <div className="border-t pt-3">{card}</div>
            </details>
          )}
        </div>
      );
      break;
    default:
      return null;
  }
  return (
    <motion.div
      key={step.key === "review" && facts.cardReview ? "disclosure" : step.key}
      initial={reduce ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.25, ease: RUN_EASE }}
      className="@container border-t px-4 py-4 sm:px-5"
    >
      {body}
    </motion.div>
  );
}
