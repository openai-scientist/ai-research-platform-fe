"use client";

import { useRef } from "react";

import { cn } from "cn";
import { AlertTriangle, CircleCheck, Flag, X } from "lucide-react";
import { motion } from "motion/react";

import type { Falsifier, RecordedResult, Verdict } from "@/lib/run-stream/contract";
import type { FeedItem, InterpretContent } from "@/lib/run-stream/run-state";
import { signed } from "@/lib/run-stream/selectors";

import { wrongSpans } from "../falsify-line";
import { DECISION_LABEL, ForkDiagram } from "../fork-diagram";
import { AgentCursor, VerdictBadge } from "../run-bits";
import { VERDICT } from "../run-meta";
import { useReveal } from "../workspace-context";
import { Pane, Placeholder, SceneNote } from "./scene-ui";

/** A point estimate with its 95% range on a shared scale from −4 to +9, over the zone that would prove it wrong. */
export function IntervalPlot({
  result,
  verdict,
  falsify,
}: {
  result: RecordedResult;
  verdict?: Verdict;
  falsify?: Falsifier;
}) {
  if (result.estimate === null || result.ci_low === null || result.ci_high === null)
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-rose-500/12 px-2 font-medium text-rose-700 text-xs dark:text-rose-300">
        <X className="size-3" />
        No result: the test crashed
      </span>
    );
  const x = (v: number) => 6 + ((v + 4) / 13) * 228;
  const stroke = verdict ? VERDICT[verdict].stroke : "stroke-blue-600";
  const fill = verdict ? VERDICT[verdict].fill : "fill-blue-600";
  const spans = falsify ? wrongSpans(falsify) : [];
  return (
    <div className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 240 34"
        className="h-[34px] w-[240px] shrink-0"
        role="img"
        aria-label={`${signed(result.estimate)}, range ${signed(result.ci_low)} to ${signed(result.ci_high)}`}
      >
        <line x1={6} x2={234} y1={26} y2={26} className="stroke-border" />
        {spans.map(([a, b]) =>
          a === b ? (
            <line key={a} x1={x(a)} x2={x(a)} y1={8} y2={24} className="stroke-rose-500/60" strokeWidth={3} />
          ) : (
            <rect
              key={`${a}-${b}`}
              x={x(a)}
              width={x(b) - x(a)}
              y={8}
              height={16}
              rx={2}
              className="fill-rose-500/12"
            />
          ),
        )}
        <line x1={x(0)} x2={x(0)} y1={4} y2={30} className="stroke-muted-foreground/60" strokeDasharray="2 2" />
        <text x={x(0)} y={33} textAnchor="middle" className="fill-muted-foreground font-mono text-[7px]">
          0
        </text>
        <motion.line
          key={verdict ?? "raw"}
          x1={x(result.ci_low)}
          x2={x(result.ci_high)}
          y1={15}
          y2={15}
          className={cn("transition-colors", stroke)}
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.circle
          cx={x(result.estimate)}
          cy={15}
          r={5}
          className={cn("stroke-card", fill)}
          strokeWidth={1.5}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 500, damping: 20 }}
          style={{ transformOrigin: `${x(result.estimate)}px 15px` }}
        />
      </svg>
      <span className="whitespace-nowrap font-mono text-xs tabular-nums">
        {signed(result.estimate)}{" "}
        <span className="text-muted-foreground">
          [{signed(result.ci_low)}, {signed(result.ci_high)}]
        </span>
      </span>
    </div>
  );
}

export function InterpretScene({
  data,
  round,
  stageKey,
  decisions,
  live,
}: {
  data: InterpretContent;
  round: number;
  stageKey: string;
  decisions: FeedItem[];
  live: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const decideRef = useRef<HTMLDivElement>(null);
  useReveal(decideRef, Boolean(data.recommendation), live);
  const notes = decisions.filter((d) => d.stageKey === stageKey);
  const lastRow = data.rows[data.rows.length - 1];
  const checked = data.rows.filter((r) => r.checked).length;
  const verdicts = data.rows.filter((r) => r.verdict).length;

  let target: string | null = lastRow ? `row:${lastRow.hypothesis.id}` : null;
  let role: "code" | "interpreter" | "skeptic" | "pi" = "code";
  if (verdicts) {
    role = "interpreter";
    target = `verdict:${data.rows[verdicts - 1].hypothesis.id}`;
  }
  if (checked) {
    role = "skeptic";
    target = `check:${data.rows[checked - 1].hypothesis.id}`;
  }
  if (data.recommendation) {
    role = "pi";
    target = "recommendation";
  }
  const shownChoice = data.decision?.decision ?? data.recommendation?.recommendation;

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      <Pane title={`Evidence · round ${round}`} aside="copied by code from results.json">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs">
              <tr className="border-b">
                {["Hypothesis", "Wrong if", "Result over its red zone", "Verdict", "Checks"].map((h) => (
                  <th key={h} className="whitespace-nowrap pr-3 pb-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <motion.tr
                  key={row.hypothesis.id}
                  data-cursor={`row:${row.hypothesis.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="border-b last:border-0"
                >
                  <td className="whitespace-nowrap py-2.5 pr-3">
                    <span
                      data-tag={row.hypothesis.id}
                      className="mr-1.5 rounded-md bg-primary px-1.5 py-0.5 font-mono font-semibold text-primary-foreground text-xs"
                    >
                      {row.hypothesis.id}
                    </span>
                    {row.hypothesis.short}
                  </td>
                  <td className="max-w-52 py-2.5 pr-3 text-muted-foreground text-xs">{row.hypothesis.falsify.text}</td>
                  <td className="py-2.5 pr-3">
                    <IntervalPlot result={row.result} verdict={row.verdict} falsify={row.hypothesis.falsify} />
                  </td>
                  <td data-cursor={`verdict:${row.hypothesis.id}`} className="py-2.5 pr-3">
                    {row.verdict ? (
                      <div className="flex flex-col gap-1">
                        <VerdictBadge verdict={row.verdict} />
                        <span className="max-w-64 text-muted-foreground text-xs">{row.reason}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td data-cursor={`check:${row.hypothesis.id}`} className="py-2.5 text-xs">
                    {row.checked ? (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <CircleCheck className="size-3.5 text-emerald-600" />
                          Numbers match
                        </span>
                        {row.objection ? (
                          <span className="flex items-start gap-1.5">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-orange-600" />
                            <span>
                              <b className="font-semibold text-orange-700 dark:text-orange-300">Skeptic objects:</b>{" "}
                              {row.objection}
                            </span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <CircleCheck className="size-3.5 text-emerald-600" />
                            Skeptic agrees
                          </span>
                        )}
                      </motion.div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Pane>

      <div ref={decideRef}>
        {data.recommendation && shownChoice ? (
          <Pane
            title="What happens next"
            aside={
              <span className="inline-flex items-center gap-1.5" title="Going back is limited per run">
                {Array.from({ length: data.recommendation.goBacksAllowed }, (_, i) => (
                  <i
                    key={i}
                    className={cn(
                      "size-2.5 rounded-[3px] border",
                      i < (data.recommendation?.goBacksUsed ?? 0)
                        ? "border-foreground bg-foreground"
                        : "border-foreground/30",
                    )}
                  />
                ))}
                {data.recommendation.goBacksUsed} of {data.recommendation.goBacksAllowed} go-backs used
              </span>
            }
          >
            <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <ForkDiagram choice={shownChoice} round={round} />
              <div data-cursor="recommendation" className="flex flex-col gap-1.5">
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">PI recommends</span>
                <b className="font-semibold text-base">{DECISION_LABEL[data.recommendation.recommendation]}</b>
                <p className="text-sm leading-relaxed">{data.recommendation.rationale}</p>
              </div>
            </div>
          </Pane>
        ) : (
          <Placeholder icon={<Flag className="size-3.5" />}>The PI decides what happens next</Placeholder>
        )}
      </div>
      {notes.map((n) => (
        <SceneNote
          key={n.seq}
          actor={n.actor}
          title={n.actor === "you" ? "Your decision" : "PI decision"}
          text={n.text}
          note={n.note}
        />
      ))}
      <AgentCursor
        agent={live ? role : null}
        container={scene}
        target={target}
        version={`${data.rows.length}-${verdicts}-${checked}`}
      />
    </div>
  );
}
