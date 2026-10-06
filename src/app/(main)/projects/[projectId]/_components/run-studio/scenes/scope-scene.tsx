"use client";

import { Fragment, useRef } from "react";

import { cn } from "cn";
import { AlertTriangle, ArrowDown, CircleCheck, CircleHelp, Cpu, Database, GitFork, Target, X } from "lucide-react";
import { motion } from "motion/react";

import type { GoalField, Risk } from "@/lib/run-stream/contract";
import type { RunState, ScopeContent } from "@/lib/run-stream/run-state";

import { AnimatedNumber } from "../animated-number";
import { AgentAvatar, AgentCursor } from "../run-bits";
import { useReveal } from "../workspace-context";
import { Pane, PendingLines, Placeholder, Strike, TypeText } from "./scene-ui";

const FIELDS: { field: GoalField; label: string }[] = [
  { field: "title", label: "Working title" },
  { field: "problem", label: "Problem" },
  { field: "objective", label: "Objective" },
  { field: "scope", label: "Scope" },
  { field: "success", label: "Success criteria" },
];

const RISK_TONE: Record<Risk, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  high: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
};

/** Numbers recalled from memory, with what the literature later said about them. Rule 6. */
export function EstimateList({ estimates, live }: { estimates: RunState["estimates"]; live: boolean }) {
  if (!estimates.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {estimates.map(({ estimate, check }) => (
        <motion.li
          key={estimate.id}
          layout
          data-cursor={`estimate:${estimate.id}`}
          initial={live ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-500",
            !check && "border-amber-500/50 border-dashed",
            check?.status === "verified" && "border-emerald-500/40 bg-emerald-500/5",
            check?.status === "unsupported" && "border-rose-500/30 bg-rose-500/5",
          )}
        >
          <span className="flex items-start gap-2">
            <b className="mt-px inline-flex h-5 shrink-0 items-center rounded bg-muted px-1.5 font-mono font-semibold text-[11px]">
              {estimate.id}
            </b>
            <span
              className={cn(
                "decoration-1 transition-[text-decoration-color,color] duration-700",
                check?.status === "unsupported"
                  ? "text-muted-foreground line-through decoration-rose-500"
                  : "decoration-transparent",
              )}
            >
              {estimate.text}
            </span>
          </span>
          {check ? (
            <motion.span
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-start gap-1.5 text-xs",
                check.status === "verified"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-rose-700 dark:text-rose-300",
              )}
            >
              {check.status === "verified" ? (
                <CircleCheck className="mt-px size-3.5 shrink-0" />
              ) : (
                <X className="mt-px size-3.5 shrink-0" />
              )}
              <span>
                <b className="font-semibold">
                  {check.status === "verified" ? `Backed by ${check.source}` : "Not backed, dropped"}
                </b>
                <span className="text-muted-foreground"> · {check.note}</span>
              </span>
            </motion.span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-800 text-xs dark:text-amber-300">
              <CircleHelp className="size-3.5" />
              Unverified · checked against the papers in Read
            </span>
          )}
        </motion.li>
      ))}
    </ul>
  );
}

function questionParts(question: string, phrases: string[]) {
  const parts: { text: string; phrase?: string }[] = [];
  let rest = question;
  while (rest) {
    const hits = phrases.map((p) => ({ p, at: rest.indexOf(p) })).filter((h) => h.at >= 0);
    if (!hits.length) {
      parts.push({ text: rest });
      break;
    }
    const first = hits.reduce((a, b) => (b.at < a.at ? b : a));
    if (first.at > 0) parts.push({ text: rest.slice(0, first.at) });
    parts.push({ text: first.p, phrase: first.p });
    rest = rest.slice(first.at + first.p.length);
  }
  return parts;
}

function ScoreBar({ label, hint, value, delay }: { label: string; hint: string; value: number; delay: number }) {
  const tone = value >= 7 ? "bg-emerald-500" : value >= 5 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)_36px] items-center gap-2.5 text-xs">
      <span className="flex flex-col leading-tight">
        <span className="font-medium">{label}</span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <span className="relative h-2 rounded-full bg-muted">
        <motion.i
          className={cn("absolute inset-y-0 left-0 rounded-full", tone)}
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        <span className="absolute -inset-y-1 left-1/2 w-px bg-foreground/40" title="The bar: 5 of 10" />
      </span>
      <span className="text-right font-mono font-semibold tabular-nums">{value}/10</span>
    </div>
  );
}

function Gauge({ value, threshold }: { value: number; threshold: number }) {
  const r = 46;
  const arc = Math.PI * r;
  const tick = Math.PI * (1 - threshold / 10);
  return (
    <svg viewBox="0 0 120 70" className="h-auto w-40" aria-hidden="true">
      <path d={`M14 62 A${r} ${r} 0 0 1 106 62`} className="fill-none stroke-muted" strokeWidth={10} />
      <motion.path
        d={`M14 62 A${r} ${r} 0 0 1 106 62`}
        className="fill-none stroke-emerald-500"
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={arc}
        initial={{ strokeDashoffset: arc }}
        animate={{ strokeDashoffset: arc * (1 - value / 10) }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
      <line
        x1={60 + Math.cos(tick) * (r - 9)}
        y1={62 - Math.sin(tick) * (r - 9)}
        x2={60 + Math.cos(tick) * (r + 9)}
        y2={62 - Math.sin(tick) * (r + 9)}
        className="stroke-foreground"
        strokeWidth={1.5}
      />
    </svg>
  );
}

export function ScopeScene({
  data,
  topic,
  domains,
  estimates,
  dataLabel,
  live,
}: {
  data: ScopeContent;
  topic: string;
  domains: string[];
  estimates: RunState["estimates"];
  dataLabel: string;
  live: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  useReveal(treeRef, data.subQuestions.length + data.risks.length, live);
  useReveal(scoreRef, Boolean(data.evaluation), live);

  const goal = new Map(data.goal.map((g) => [g.field, g]));
  const adjusted = data.adjusted[data.adjusted.length - 1];
  const covered = data.subQuestions.flatMap((sq) => sq.covers);
  const allCovered = Boolean(data.evaluation);
  const objective = goal.get("objective")?.value;

  let target: string | null = null;
  let agent: "strategist" | "pi" = "strategist";
  const lastGoal = data.goal[data.goal.length - 1];
  if (lastGoal) target = `goal:${lastGoal.field}`;
  if (estimates.length && data.goal.length === 2) target = `estimate:${estimates[estimates.length - 1].estimate.id}`;
  if (adjusted) target = "goal:scope";
  if (data.approved) {
    target = "approved";
    agent = "pi";
  }
  if (data.subQuestions.length) {
    target = `sq:${data.subQuestions[data.subQuestions.length - 1].id}`;
    agent = "strategist";
  }
  if (data.evaluation) {
    target = "score";
    agent = "pi";
  }

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-r-xl border-foreground border-l-[3px] bg-muted/50 px-4 py-3">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Your topic</span>
        <p className="font-(family-name:--font-lora) text-[19px] leading-snug">{topic}</p>
        <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
          {domains.map((d) => (
            <span
              key={d}
              className="inline-flex h-6 items-center rounded-md bg-pink-500/10 px-2 font-medium text-pink-700 ring-1 ring-pink-500/25 dark:text-pink-300"
            >
              {d}
            </span>
          ))}
          <span className="ml-1">Everything below is written from this. You didn't list the sub-questions.</span>
        </span>
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
        <Pane
          title={
            <span className="inline-flex items-center gap-1.5">
              <Target className="size-3.5 text-muted-foreground" />
              Research goal
            </span>
          }
          aside={`${data.goal.length} of 5 parts · specific, measurable, doable`}
        >
          <dl className="flex flex-col">
            {FIELDS.map(({ field, label }) => {
              const g = goal.get(field);
              const isTitle = field === "title";
              const wasAdjusted = field === "scope" && adjusted;
              return (
                <div
                  key={field}
                  data-cursor={`goal:${field}`}
                  className="grid gap-x-4 gap-y-1 border-t py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[128px_minmax(0,1fr)]"
                >
                  <dt className="flex items-center gap-1.5 self-start pt-0.5 text-muted-foreground text-xs">
                    <span
                      className={cn(
                        "size-1.5 rounded-full transition-colors duration-500",
                        g ? "bg-emerald-500" : "bg-foreground/15",
                      )}
                    />
                    {label}
                  </dt>
                  <dd className="min-w-0">
                    {g ? (
                      wasAdjusted ? (
                        <div className="flex flex-col gap-1.5 text-sm">
                          <Strike live={live} className="w-fit text-muted-foreground">
                            {adjusted.from}
                          </Strike>
                          <motion.span
                            initial={live ? { opacity: 0, y: -4 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 }}
                            className="flex items-start gap-1.5 text-muted-foreground text-xs"
                          >
                            <ArrowDown className="mt-px size-3 shrink-0" />
                            Narrowed: {adjusted.reason}
                          </motion.span>
                          <motion.span
                            initial={live ? { opacity: 0 } : false}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="w-fit rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-medium"
                          >
                            <TypeText text={g.value} live={live} />
                          </motion.span>
                        </div>
                      ) : (
                        <TypeText
                          text={g.value}
                          live={live}
                          className={cn(
                            "block",
                            isTitle
                              ? "font-(family-name:--font-lora) text-[19px] leading-snug"
                              : "text-sm leading-relaxed",
                          )}
                        />
                      )
                    ) : (
                      <PendingLines lines={isTitle ? 1 : 2} />
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {data.approved && (
            <motion.div
              data-cursor="approved"
              initial={live ? { opacity: 0, scale: 1.15, rotate: -4 } : false}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border border-emerald-500/40 border-dashed bg-emerald-500/6 px-3 py-2 text-xs"
            >
              <AgentAvatar agent="pi" size="sm" />
              <b className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                <CircleCheck className="size-3.5" />
                Approved by the PI
              </b>
              <span className="text-muted-foreground">{data.approved.note}</span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                Saved {data.approved.at.slice(0, 10)} · {data.approved.at.slice(11, 16)} UTC
              </span>
            </motion.div>
          )}
        </Pane>

        <div className="flex min-w-0 flex-col gap-4">
          <Pane title="What the run works with" aside="detected, not assumed">
            {data.compute ? (
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground text-xs">Fields matched to your topic</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {data.domains.map((d, i) => (
                      <motion.span
                        key={d}
                        initial={live ? { opacity: 0, scale: 0.8 } : false}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.12, type: "spring", stiffness: 420, damping: 22 }}
                        className="inline-flex h-6 items-center rounded-md bg-pink-500/10 px-2 font-medium text-pink-700 text-xs ring-1 ring-pink-500/25 dark:text-pink-300"
                      >
                        {d}
                      </motion.span>
                    ))}
                  </dd>
                </div>
                <div className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-2.5">
                  <dt className="grid size-7 place-items-center rounded-md bg-muted">
                    <Cpu className="size-4 text-muted-foreground" />
                    <span className="sr-only">Compute</span>
                  </dt>
                  <dd className="min-w-0">
                    <b className="font-medium text-[13px]">{data.compute.label}</b>
                    <span className="block text-muted-foreground text-xs">{data.compute.detail}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      Saved as the compute profile. Every hypothesis is checked against it in stage 8.
                    </span>
                  </dd>
                </div>
                {dataLabel && (
                  <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2.5">
                    <dt className="grid size-7 place-items-center rounded-md bg-muted">
                      <Database className="size-4 text-muted-foreground" />
                      <span className="sr-only">Data</span>
                    </dt>
                    <dd className="text-[13px]">{dataLabel}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <PendingLines lines={3} />
            )}
          </Pane>
          <Pane title="Numbers from memory" aside="unverified until a paper backs them" className="flex-1">
            {estimates.length ? (
              <EstimateList estimates={estimates} live={live} />
            ) : (
              <p className="text-muted-foreground text-xs">
                Any figure the agents recall before reading appears here, marked unverified.
              </p>
            )}
          </Pane>
        </div>
      </div>

      <div ref={treeRef}>
        {data.subQuestions.length ? (
          <Pane
            title={
              <span className="inline-flex items-center gap-1.5">
                <GitFork className="size-3.5 rotate-180 text-muted-foreground" />
                Sub-question tree
              </span>
            }
            aside="Stage 02 · no overlap, nothing left out"
          >
            <p className="font-(family-name:--font-lora) text-[17px] leading-relaxed">
              {questionParts(topic, covered).map((part, i) =>
                part.phrase ? (
                  <mark
                    key={`${part.text}-${i}`}
                    className="relative rounded-sm border-pink-500 border-b-2 bg-pink-500/12 px-px text-inherit"
                  >
                    {live && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-sm bg-pink-500/35"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1.2 }}
                      />
                    )}
                    <span className="relative">{part.text}</span>
                  </mark>
                ) : (
                  <Fragment key={`${part.text}-${i}`}>{part.text}</Fragment>
                ),
              )}
            </p>
            {allCovered && (
              <motion.p
                initial={live ? { opacity: 0, y: 4 } : false}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 flex items-center gap-1.5 text-emerald-700 text-xs dark:text-emerald-300"
              >
                <CircleCheck className="size-3.5" />
                Every part of your topic is covered, and no two sub-questions overlap.
              </motion.p>
            )}
            <div className="mt-4 flex flex-col items-center">
              <div className="w-full max-w-2xl rounded-lg bg-foreground px-3.5 py-2.5 text-center text-background text-xs leading-snug">
                <span className="block font-semibold text-[10.5px] uppercase tracking-wide opacity-70">Objective</span>
                {objective}
              </div>
              <motion.span
                aria-hidden
                className="h-4 w-px origin-top bg-border"
                initial={live ? { scaleY: 0 } : false}
                animate={{ scaleY: 1 }}
              />
              <ol className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-4">
                {data.subQuestions.map((sq, i) => {
                  const risks = data.risks.filter((r) => r.sq_id === sq.id);
                  const count = data.subQuestions.length;
                  return (
                    <li key={sq.id} className="relative flex flex-col pt-4">
                      {/* The bus: each branch draws its share of the line, then drops to its card. */}
                      <motion.span
                        aria-hidden
                        className={cn(
                          "absolute top-0 hidden h-px origin-left bg-border xl:block",
                          i === 0 ? "left-1/2" : "-left-1.5",
                          i === count - 1 ? "right-1/2" : "-right-1.5",
                        )}
                        initial={live ? { scaleX: 0 } : false}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                      <motion.span
                        aria-hidden
                        className="absolute top-0 left-1/2 h-4 w-px origin-top bg-border"
                        initial={live ? { scaleY: 0 } : false}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.25, duration: 0.25 }}
                      />
                      <motion.article
                        data-cursor={`sq:${sq.id}`}
                        initial={live ? { opacity: 0, y: -8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex h-full flex-col gap-2 rounded-xl bg-card px-3.5 py-3 text-sm ring-1 ring-foreground/10"
                      >
                        <span className="flex items-center gap-2">
                          <b className="inline-flex h-5 items-center rounded-md bg-pink-500/12 px-1.5 font-mono font-semibold text-[11px] text-pink-700 dark:text-pink-300">
                            {sq.id}
                          </b>
                          <span
                            className={cn(
                              "inline-flex h-5 items-center rounded-full px-2 text-[11px]",
                              sq.priority === 1
                                ? "bg-foreground font-medium text-background"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {sq.priority === 1 ? "Answered first" : `Priority ${sq.priority}`}
                          </span>
                        </span>
                        <p className="font-medium leading-snug">{sq.text}</p>
                        <p className="text-muted-foreground text-xs leading-snug">
                          <span className="font-medium text-foreground/70">How: </span>
                          {sq.tests}
                        </p>
                        <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
                          {risks.map((risk) => (
                            <motion.span
                              key={risk.id}
                              initial={live ? { opacity: 0, scale: 0.85 } : false}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: "spring", stiffness: 420, damping: 22 }}
                              className={cn(
                                "inline-flex items-start gap-1 rounded-md px-1.5 py-1 text-[11.5px] leading-tight",
                                RISK_TONE[risk.level],
                              )}
                            >
                              <AlertTriangle className="mt-px size-3 shrink-0" />
                              <span>
                                <b className="font-semibold">
                                  {risk.level.charAt(0).toUpperCase() + risk.level.slice(1)} risk ·{" "}
                                </b>
                                {risk.text}
                              </span>
                            </motion.span>
                          ))}
                          {!risks.length && <PendingLines lines={1} />}
                        </span>
                      </motion.article>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Pane>
        ) : (
          <Placeholder>Your topic is split into sub-questions next</Placeholder>
        )}
      </div>

      <div ref={scoreRef}>
        {data.evaluation ? (
          <Pane title="Topic score" aside="rated like a conference area chair · below 5 the run stops">
            <div className="grid items-center gap-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Gauge value={data.evaluation.overall} threshold={data.evaluation.threshold} />
                  <span className="absolute inset-x-0 bottom-0 text-center">
                    <AnimatedNumber
                      value={data.evaluation.overall}
                      decimals={1}
                      duration={1100}
                      className="font-semibold text-3xl tabular-nums tracking-tight"
                    />
                    <span className="text-muted-foreground text-sm"> /10</span>
                  </span>
                </div>
                <motion.span
                  initial={live ? { opacity: 0, scale: 0.7 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, type: "spring", stiffness: 400, damping: 18 }}
                  className={cn(
                    "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-medium text-xs",
                    data.evaluation.overall >= data.evaluation.threshold
                      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/12 text-rose-700 dark:text-rose-300",
                  )}
                >
                  <CircleCheck className="size-3" />
                  {data.evaluation.overall >= data.evaluation.threshold
                    ? `Clears the bar of ${data.evaluation.threshold}`
                    : "Below the bar: rethink"}
                </motion.span>
              </div>
              <div data-cursor="score" className="flex flex-col gap-2.5">
                <ScoreBar
                  label="Novelty"
                  hint="not already answered"
                  value={data.evaluation.scores.novelty}
                  delay={0.2}
                />
                <ScoreBar
                  label="Specificity"
                  hint="can be measured"
                  value={data.evaluation.scores.specificity}
                  delay={0.35}
                />
                <ScoreBar
                  label="Feasibility"
                  hint="doable with this compute"
                  value={data.evaluation.scores.feasibility}
                  delay={0.5}
                />
              </div>
              <motion.p
                initial={live ? { opacity: 0, y: 4 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm"
              >
                <AgentAvatar agent="pi" />
                <span>
                  <b className="block font-semibold text-xs">The PI's advice</b>
                  {data.evaluation.advice}
                </span>
              </motion.p>
            </div>
          </Pane>
        ) : (
          <Placeholder>The PI rates the topic once the tree is done</Placeholder>
        )}
      </div>
      <AgentCursor
        agent={live ? agent : null}
        container={scene}
        target={target}
        version={`${data.goal.length}-${data.subQuestions.length}-${data.risks.length}-${estimates.length}`}
      />
    </div>
  );
}
