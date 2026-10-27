"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.

import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";

import type { Node, NodeProps } from "@xyflow/react";
import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock3,
  Info,
  Layers,
  Lock,
  type LucideIcon,
  TriangleAlert,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { Caret, PulseDot } from "../run-bits";
import { Placeholder, useTyping } from "../scenes/scene-ui";
import {
  BADDOI,
  CLAIMS,
  CONF_K,
  FIT,
  MN,
  OUTSIDE,
  PLACEMENT,
  PLACEMENT_RULES_ONLY,
  SECTIONS,
  SENTENCE_RULES,
  SP,
  SP_LINKS,
  TOU,
  TOUMAP,
  VARIANTS,
} from "./data/core";
import {
  BAD_REF,
  CONTRACT,
  COVER_CELLS,
  COVER_COLS,
  COVER_ROWS,
  JOURNAL_DIFF,
  LEDGER,
  LEDGER_COL,
  type LedgerRow,
  MAP_AIF,
  MAP_COLS,
  MAP_H,
  MAP_LIFE,
  MAP_ROUTE,
  MAP_SCH,
  MAP_W,
  NUM_ROWS,
  REFS_TOTAL,
  RESULT_ROWS_TOTAL,
  SCHEME_INFO,
  TOU_SRC,
} from "./data/gather";
import {
  ANALYSES,
  type CheckTone,
  DEVIATION,
  ENV_ROWS,
  FIGURES,
  GAINS,
  INTAKE,
  INTAKE_CHECKS,
  INTAKE_LIMITS,
  type IntakeCheck,
  type IntakeSection,
  PLAN_EXPERIMENTS,
  PLAN_FACTS,
  PLAN_HYPOTHESES,
  PLAN_TIMELINE,
  RESULT_ROWS,
  RUN_FACTS,
  RUN_SEEDS,
  RUN_SYSTEMS,
  SOURCE_FACTS,
} from "./data/intake";
import { ENTITY, STATUS_CHIP } from "./data/meta";
import {
  aspWhy,
  LABEL_ORDER,
  laneOf,
  MAP_EVID,
  MAP_NODES,
  S,
  setTrack,
  TOU_CHECKS,
  TOU_ORDER,
  TYPE_CPS,
  typing,
} from "./engine";
import { BOX_TYPES, type Box, type BoxNode, Diagram, Handles, type LinkEdge, sides, useFresh } from "./flow";
import { COVER_KIND, CoverageMatrix, type CoverCell, coverState, RecheckBand } from "./gather-hero";
import { AgentCursor, afterPaint, canEnter, cn, Icon, M, Pane, RM, RollNumber, Strike, useMedia, WorkOrb } from "./lib";
import { RailSection } from "./paper";

/* ===== Gather: hand-off, evidence ledger, journal, statements, reasoning, argument map ===== */
export const DOSS_TONE: Record<string, { chip: string; bar: string; ring: string }> = {
  rs: {
    chip: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
    ring: "ring-violet-500/60",
  },
  ma: { chip: "bg-teal-500/12 text-teal-700 dark:text-teal-300", bar: "bg-teal-500", ring: "ring-teal-500/60" },
  ea: { chip: "bg-amber-500/12 text-amber-800 dark:text-amber-300", bar: "bg-amber-500", ring: "ring-amber-500/60" },
  wt: { chip: "bg-pink-500/12 text-pink-700 dark:text-pink-300", bar: "bg-pink-500", ring: "ring-pink-500/60" },
  gv: { chip: "bg-slate-500/12 text-slate-700 dark:text-slate-300", bar: "bg-slate-500", ring: "ring-slate-500/60" },
};
/* A thin labelled header for a column of a scene. */
export function ColHead({ title, aside, icon }: { title: ReactNode; aside?: ReactNode; icon?: string }) {
  return (
    <header className="flex items-center gap-2 border-b bg-muted/50 px-3.5 py-2.5 text-sm">
      {icon && <Icon n={icon} className="size-3.5 text-muted-foreground" />}
      <b className="font-semibold">{title}</b>
      {aside != null && <span className="ml-auto text-muted-foreground text-xs tabular-nums">{aside}</span>}
    </header>
  );
}
export const Card = ({
  children,
  className,
  ...rest
}: { children?: ReactNode; className?: string } & Record<`data-${string}`, unknown>) => (
  <M
    as="section"
    in="up"
    className={cn(
      "min-w-0 overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10",
      className,
    )}
    {...rest}
  >
    {children}
  </M>
);

/* The system's status badge: a tinted badge with its icon, as in the workspace's own tables. */
const STATUS_BADGE: Record<string, { icon: LucideIcon; c: string }> = {
  ok: { icon: CircleCheck, c: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  warn: { icon: TriangleAlert, c: "bg-amber-500/10 text-amber-800 dark:text-amber-300" },
  bad: { icon: CircleX, c: "bg-destructive/10 text-destructive" },
  na: { icon: CircleDashed, c: "bg-muted text-muted-foreground" },
  now: { icon: Clock3, c: "bg-primary/10 text-primary" },
  info: { icon: Info, c: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
};
export function StatusBadge({ k, children }: { k: string; children: ReactNode }) {
  const { icon: I, c } = STATUS_BADGE[k];
  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", c)}>
      <I />
      {children}
    </Badge>
  );
}
/* Table cells as the workspace's tables have them; columns keep fixed shares (table-fixed), so rows line up. */
export const TABLE_PAD = "py-3 align-top whitespace-normal first:pl-4 last:pr-4";

/**
 * Text an agent writes into a scene. While its item is being written (`on`) it is typed out with the research run's
 * `useTyping`, `after` characters behind the fields of the same item written before it; otherwise it shows whole. The
 * whole text keeps its room underneath, so a row never grows while it is typed.
 */
export function Typed({ text, on, after = 0 }: { text: string; on: boolean; after?: number }) {
  return on ? <Typing key={text} text={text} after={after} /> : text;
}
function Typing({ text, after }: { text: string; after: number }) {
  const n = Math.max(0, useTyping(text, after + text.length, true, TYPE_CPS * S.speed) - after);
  if (n >= text.length) return text;
  return (
    <span className="grid">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {text}
      </span>
      <span className="col-start-1 row-start-1">
        {text.slice(0, n)}
        {n > 0 && <Caret />}
      </span>
    </span>
  );
}

/* ---------- S00 · the run's output, part by part, checked against the locked plan ---------- */
export const LOG_TONE: Record<string, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-rose-600 dark:text-rose-400",
  na: "text-muted-foreground",
};
const CHECK_ICON: Record<string, string> = { ok: "check", warn: "alert", bad: "x" };
type CheckState = "pending" | "now" | "held" | CheckTone;

function checkState(id: string): CheckState {
  const u = S.up;
  if (u.bad === id) return "held";
  const n = INTAKE_CHECKS.findIndex((c) => c.id === id);
  if (n < u.done) return INTAKE_CHECKS[n].s;
  if (u.at === id && S.st.S00.status === "running") return "now";
  return "pending";
}
function sectionState(sec: IntakeSection): { k: string; label: string; icon?: string } {
  const states = sec.checks.map((c) => checkState(c.id));
  if (states.includes("held")) return { k: "bad", label: "Held", icon: "x" };
  if (states.includes("now")) return { k: "now", label: "Checking" };
  if (states.includes("pending"))
    return { k: "wait", label: states.every((x) => x === "pending") ? "Waiting" : "Checking" };
  if (states.includes("bad")) return { k: "bad", label: "Failed", icon: "x" };
  const notes = states.filter((x) => x === "warn").length;
  if (notes) return { k: "warn", label: `Done · ${notes} ${notes === 1 ? "note" : "notes"}`, icon: "alert" };
  return { k: "ok", label: "Done", icon: "check" };
}
export const STATE_TEXT: Record<string, string> = {
  ok: "text-emerald-700 dark:text-emerald-400",
  warn: "text-amber-700 dark:text-amber-400",
  bad: "text-rose-700 dark:text-rose-300",
  now: "text-sky-700 dark:text-sky-300",
  wait: "text-muted-foreground",
};
/* The overview tiles take the colour of what their part came to. */
export const STATE_TILE: Record<string, string> = {
  ok: "bg-emerald-500/[0.06] ring-emerald-500/25",
  warn: "bg-amber-500/[0.07] ring-amber-500/35",
  bad: "bg-rose-500/[0.07] ring-rose-500/40",
  now: "bg-sky-500/[0.06] ring-sky-500/50",
  wait: "bg-muted/40 ring-foreground/10",
};
const STATE_RING: Record<string, string> = {
  ok: "ring-foreground/10",
  warn: "ring-amber-500/35",
  bad: "ring-rose-500/45",
  now: "ring-sky-500/50",
  wait: "ring-foreground/10",
};
/* A part's mark: done, a note, failed, not applicable, being checked, or not reached. */
export function StateMark({ k, size = "size-4" }: { k: string; size?: string }) {
  const icon = k === "ok" ? "circleCheck" : k === "warn" ? "alert" : k === "na" ? "minus" : "ban";
  // One box for every mark, so a mark that changes never changes the height of its row.
  return (
    <span className="grid size-4 shrink-0 place-items-center">
      {k === "now" ? (
        <WorkOrb state="working" size={16} />
      ) : k === "wait" ? (
        <span className="size-3.5 rounded-full border border-foreground/25 border-dashed" />
      ) : (
        <M as="span" key={k} in="pop8" dur={260} className="grid place-items-center">
          <Icon n={icon} className={cn(size, LOG_TONE[k])} />
        </M>
      )}
    </span>
  );
}

/* One line that says what the intake is doing right now, in words an author can follow. */
function intakeNow() {
  const u = S.up;
  const st = S.st.S00;
  if (st.status !== "running") return null;
  if (st.cur === "a0") return `Opening the output of RUN-25CD · ${INTAKE[Math.max(0, u.open - 1)].n}`;
  if (st.cur === "a4") {
    const l = INTAKE_LIMITS[Math.min(u.named, INTAKE_LIMITS.length - 1)];
    return `Naming what the paper cannot use · ${l.head}`;
  }
  const c = INTAKE_CHECKS.find((x) => x.id === u.at);
  if (!c) return null;
  return `${INTAKE.find((x) => x.k === c.sec)?.n} · ${c.t}`;
}

/* A label and its value. */
function Fact({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-1.5 text-[13px] leading-snug first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
function SubHead({ children }: { children: ReactNode }) {
  return <h4 className="mt-4 mb-1.5 font-medium text-muted-foreground text-xs first:mt-0">{children}</h4>;
}

const EVENT_DOT: Record<string, string> = {
  plan: "bg-foreground",
  run: "bg-sky-500",
  dev: "bg-amber-500",
  ana: "bg-emerald-500",
};
/* The plan's events in order: locked before the first run, the deviation before the analyses. */
function PlanTimeline() {
  return (
    <ol className="relative grid gap-2.5 sm:grid-cols-5 sm:gap-2">
      <span aria-hidden="true" className="absolute top-[6px] right-[10%] left-[10%] h-px bg-border max-sm:hidden" />
      {PLAN_TIMELINE.map((e, i) => (
        <M
          as="li"
          key={e.x}
          in="fade"
          delay={canEnter() ? i * 0.08 : 0}
          className="relative flex items-start gap-2.5 sm:flex-col sm:items-center sm:gap-1.5 sm:text-center"
        >
          <span className={cn("relative mt-0.5 size-3 shrink-0 rounded-full ring-4 ring-card", EVENT_DOT[e.k])} />
          <span className="min-w-0">
            <b className="block font-medium text-[12.5px] leading-tight">{e.x}</b>
            <span className="font-mono text-[11px] text-muted-foreground">{e.t}</span>
          </span>
        </M>
      ))}
    </ol>
  );
}
const fmtGain = (v: number) => (v < 0 ? `−${Math.abs(v).toFixed(3)}` : v.toFixed(3));
/* Each gain with its interval, against 0: concluded only if the interval stays above 0. */
function GainPlot() {
  // The axis spans every interval, in steps of 0.05.
  const lo = Math.floor(Math.min(0, ...GAINS.map((g) => g.lo)) / 0.05) * 0.05;
  const hi = Math.ceil(Math.max(...GAINS.map((g) => g.hi)) / 0.05) * 0.05;
  const ticks = Array.from({ length: Math.round((hi - lo) / 0.05) + 1 }, (_, i) => lo + i * 0.05);
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_5rem] items-center gap-x-3 gap-y-3 text-[13px] sm:grid-cols-[9rem_minmax(0,1fr)_5.5rem]">
        {GAINS.map((g, i) => {
          const crosses = g.lo <= 0;
          return (
            <Fragment key={g.row}>
              <span className="min-w-0 leading-tight">
                {g.what}
                <span className="block font-mono text-[11px] text-muted-foreground">
                  row {g.row} · {g.h}
                </span>
              </span>
              <span
                className="relative h-7"
                role="img"
                aria-label={`${g.what}: ${fmtGain(g.v)}, interval ${fmtGain(g.lo)} to ${fmtGain(g.hi)}`}
              >
                <span className="absolute inset-y-0 w-px bg-foreground/30" style={{ left: `${x(0)}%` }} />
                <M
                  as="span"
                  in="grow"
                  delay={canEnter() ? i * 0.12 : 0}
                  className={cn(
                    "absolute top-[calc(50%-2px)] h-1 origin-left rounded-full",
                    crosses ? "bg-amber-500/60" : "bg-emerald-500/60",
                  )}
                  style={{ left: `${x(g.lo)}%`, width: `${x(g.hi) - x(g.lo)}%` }}
                />
                <span
                  className={cn(
                    "absolute top-[calc(50%-6px)] size-3 rounded-full ring-2 ring-card",
                    crosses ? "bg-amber-500" : "bg-emerald-600",
                  )}
                  style={{ left: `calc(${x(g.v)}% - 6px)` }}
                />
              </span>
              <span className="text-right font-mono tabular-nums leading-tight">
                {fmtGain(g.v)}
                <span className="block text-[11px] text-muted-foreground">
                  {fmtGain(g.lo)}–{fmtGain(g.hi)}
                </span>
              </span>
            </Fragment>
          );
        })}
        <span />
        <span className="relative h-4 font-mono text-[10.5px] text-muted-foreground">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${x(t)}%` }}>
              {Math.abs(t) < 1e-9 ? "0" : fmtGain(t).slice(0, -1)}
            </span>
          ))}
        </span>
        <span />
      </div>
      <p className="text-muted-foreground text-xs">
        Gain in recall at 20% flagged, with its 95% interval. The intervals in rows 22 and 23 reach below 0, so H2 and
        H4 are not shown.
      </p>
    </div>
  );
}

/* What each part holds, as the run handed it over. */
function SectionDetail({ k }: { k: string }) {
  switch (k) {
    case "plan":
      return (
        <>
          <dl className="divide-y">
            {PLAN_FACTS.map(([f, v]) => (
              <Fact key={f} k={f}>
                {v}
              </Fact>
            ))}
          </dl>
          <SubHead>Order of events</SubHead>
          <PlanTimeline />
          <SubHead>Experiments in the index</SubHead>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {PLAN_EXPERIMENTS.map((e) => (
              <li key={e.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
                <span className="font-mono text-muted-foreground">{e.id}</span>
                <span className="min-w-0">
                  {e.what}
                  <span className="block text-muted-foreground text-xs">
                    {e.kind} · tests {e.hs}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <SubHead>Hypotheses</SubHead>
          <ul className="grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
            {PLAN_HYPOTHESES.map((h) => (
              <li key={h.id} className={cn("flex gap-2", !h.primary && "text-muted-foreground")}>
                <span className="font-mono">{h.id}</span>
                <span className="min-w-0">
                  {h.t}
                  {!h.primary && <span className="text-xs"> · deferred</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      );
    case "env":
      return (
        <dl className="divide-y">
          {ENV_ROWS.map(([f, v, sub]) => (
            <Fact key={f} k={f}>
              {v}
              <span className="block text-muted-foreground text-xs">{sub}</span>
            </Fact>
          ))}
        </dl>
      );
    case "runs": {
      const lit = checkState("traces") !== "pending";
      return (
        <>
          <div
            role="img"
            aria-label={`${RUN_SYSTEMS.length * RUN_SEEDS.length} runs: ${RUN_SYSTEMS.length} models by ${RUN_SEEDS.length} seeds, each with a trace`}
            className="grid grid-cols-[4.5rem_repeat(5,minmax(0,1fr))] items-center gap-1.5 text-xs"
          >
            <span />
            {RUN_SEEDS.map((seed) => (
              <span key={seed} className="text-center text-muted-foreground">
                Seed {seed}
              </span>
            ))}
            {RUN_SYSTEMS.map((sys, r) => (
              <Fragment key={sys}>
                <span className="text-muted-foreground">{sys}</span>
                {RUN_SEEDS.map((seed, c) => {
                  const n = r * 5 + c + 1;
                  return (
                    <span
                      key={seed}
                      className={cn(
                        "flex h-7 items-center justify-center gap-1 rounded-md font-mono text-[11px] transition-colors duration-300",
                        lit
                          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground",
                      )}
                      style={{ transitionDelay: lit && canEnter() ? `${(n - 1) * 45}ms` : "0ms" }}
                    >
                      t{String(n).padStart(2, "0")}
                    </span>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <dl className="mt-4 divide-y">
            {RUN_FACTS.map(([f, v]) => (
              <Fact key={f} k={f}>
                {v}
              </Fact>
            ))}
          </dl>
        </>
      );
    }
    case "results":
      return (
        <>
          <GainPlot />
          <SubHead>Other rows</SubHead>
          <dl className="divide-y">
            {RESULT_ROWS.filter((r) => !GAINS.some((g) => g.row === r.row)).map((r) => (
              <Fact key={r.row} k={`Row ${r.row}`}>
                {r.what}
                <span className="block font-mono text-muted-foreground text-xs">
                  {r.v}
                  {r.ci && ` · ${r.ci}`}
                </span>
              </Fact>
            ))}
          </dl>
          <p className="mt-2 text-muted-foreground text-xs">
            30 more rows: the other runs, the course-level bootstrap, A4 by course and the two gains A2 compares.
          </p>
        </>
      );
    case "analyses":
      return (
        <div className="grid grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] gap-x-3 text-[13px]">
          {ANALYSES.map((a) => (
            <Fragment key={a.id}>
              <span className="border-t py-2 font-mono first:border-t-0">{a.id}</span>
              <span className="border-t py-2 font-mono text-muted-foreground">{a.h}</span>
              <span className="min-w-0 border-t py-2">
                {a.kind}
                <span className="block font-mono text-muted-foreground text-xs">{a.est}</span>
              </span>
              <span className={cn("border-t py-2 text-right", STATE_TEXT[a.tone])}>{a.verdict}</span>
            </Fragment>
          ))}
        </div>
      );
    case "dev":
      return (
        <dl className="divide-y">
          <Fact k={DEVIATION.id}>{DEVIATION.when}</Fact>
          <Fact k="Encoding">
            <span className="text-muted-foreground line-through">{DEVIATION.plan}</span> → {DEVIATION.ran}
          </Fact>
          <Fact k="Why">{DEVIATION.why}</Fact>
          <Fact k="Affects">{DEVIATION.affects}</Fact>
        </dl>
      );
    case "figs":
      return (
        <ul className="grid grid-cols-2 gap-2">
          {FIGURES.map((f) => (
            <li
              key={f.n}
              className={cn(
                "flex min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2.5 text-[13px]",
                f.data ? "bg-muted/60" : "border border-amber-500/50 border-dashed",
              )}
            >
              <b className="font-medium">Figure {f.n}</b>
              <span className="text-muted-foreground text-xs leading-snug">{f.t}</span>
              <span className={cn("mt-1 font-mono text-[11px]", f.data ? "text-muted-foreground" : STATE_TEXT.warn)}>
                {f.data ?? "No data behind it"}
              </span>
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <dl className="divide-y">
          {SOURCE_FACTS.map(([f, v]) => (
            <Fact key={f} k={f}>
              {v}
            </Fact>
          ))}
        </dl>
      );
  }
}

/* One check: what it asks, its mark once made, and the evidence it read. */
function CheckRow({ c }: { c: IntakeCheck }) {
  const st = checkState(c.id);
  const made = st === "ok" || st === "warn" || st === "bad";
  return (
    <li data-cursor={`chk:${c.id}`} className="grid grid-cols-[1.125rem_minmax(0,1fr)] gap-2.5">
      <span className="grid h-5 place-items-center">
        {st === "now" ? (
          <WorkOrb state="working" size={16} />
        ) : made || st === "held" ? (
          <M as="span" key={st} in="pop8" dur={260} className="grid place-items-center">
            <Icon
              n={CHECK_ICON[st === "held" ? "bad" : st]}
              className={cn("size-4", LOG_TONE[st === "held" ? "bad" : st])}
            />
          </M>
        ) : (
          <span className="size-3 rounded-full border border-foreground/25 border-dashed" />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[13px] leading-5 transition-colors duration-300",
            st === "pending" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {c.t}
        </span>
        {(made || st === "held") && (
          <M as="span" in="fade" dur={300} className="block text-muted-foreground text-xs leading-snug">
            {st === "held" ? (
              "Fails here · the stage is held until it is fixed"
            ) : (
              <Typed text={c.ev} on={typing("up.done", c.id)} />
            )}
          </M>
        )}
      </span>
    </li>
  );
}

/* The parts the run handed over, at a glance: one tile each, coloured by what it came to. */
function PartTiles({ onPick }: { onPick(k: string): void }) {
  const u = S.up;
  const st = S.st.S00;
  const shown = st.status === "done" ? INTAKE.length : u.open;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      {INTAKE.map((sec, i) => {
        const state = i < shown ? sectionState(sec) : { k: "wait", label: "Not handed over yet" };
        const made = sec.checks.filter((c) => !["pending", "now"].includes(checkState(c.id))).length;
        return (
          <li key={sec.k}>
            <button
              type="button"
              disabled={i >= shown}
              onClick={() => onPick(sec.k)}
              aria-label={`${sec.n}: ${state.label}`}
              className={cn(
                "flex h-full w-full min-w-0 flex-col gap-2 rounded-lg p-2.5 text-left ring-1 ring-inset outline-none transition-[background-color,box-shadow] duration-500 hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 dark:hover:brightness-125",
                STATE_TILE[state.k],
              )}
            >
              <span className="flex items-center justify-between">
                <Icon n={sec.icon} className="size-4 text-muted-foreground" />
                <StateMark k={state.k} />
              </span>
              <span className="min-w-0">
                <b className="block truncate font-medium text-[12.5px]">{sec.n}</b>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {made}/{sec.checks.length} checks
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* The summary: where the intake is, what it found, and every part at a glance. */
function IntakeSummary({ live, onPick }: { live: boolean; onPick(k: string): void }) {
  const u = S.up;
  const st = S.st.S00;
  const done = st.status === "done";
  const failed = S.lifecycle === "failed" && st.status !== "done";
  const held = u.bad != null && !done;
  const now = live ? intakeNow() : null;
  const made = INTAKE_CHECKS.slice(0, u.done);
  const count = (k: CheckTone) => made.filter((c) => c.s === k).length;
  const heldCheck = INTAKE_CHECKS.find((c) => c.id === u.bad);
  let title = "Checking the output of RUN-25CD";
  if (done) title = `Output accepted, with ${INTAKE_LIMITS.length} limits on the paper`;
  else if (failed) title = "The intake stopped";
  else if (held && heldCheck) title = `Intake held: ${heldCheck.t.toLowerCase()} fails`;
  let line: ReactNode = "The experiment run has not handed anything over yet.";
  if (held && !failed)
    line = "Nothing after this check runs until it is fixed. Choose a way out in the bar above the stage.";
  else if (done)
    line = `${INTAKE_CHECKS.length} checks on ${INTAKE.length} parts, all against the locked plan. Nothing missing is filled in.`;
  else if (failed) line = S.failure;
  else if (live && st.status === "running") line = now ?? "Opening the output of RUN-25CD";
  // While it runs the line changes with every check; one line keeps the card the same height.
  const oneLine = live && st.status === "running" && !held;
  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span className="grid size-10 shrink-0 place-items-center">
          {done ? (
            <Icon n="circleCheck" className="size-7 text-emerald-600 dark:text-emerald-400" />
          ) : failed || held ? (
            <Icon n="ban" className="size-7 text-rose-600 dark:text-rose-400" />
          ) : (
            <WorkOrb state="working" size={32} />
          )}
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <h3 className="text-balance font-semibold text-[17px] tracking-tight">{title}</h3>
          <M
            as="p"
            key={typeof line === "string" ? line : "line"}
            in="fade"
            dur={200}
            className={cn(
              "mt-0.5 text-[13px]",
              oneLine ? "truncate text-foreground" : "text-pretty text-muted-foreground",
            )}
          >
            {line}
          </M>
        </div>
        <dl className="flex gap-5">
          {(
            [
              ["ok", "Passed"],
              ["warn", "Notes"],
              ["bad", "Failed"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd
                className={cn(
                  "font-semibold text-[22px] tabular-nums leading-tight",
                  count(k) ? LOG_TONE[k] : "text-muted-foreground/50",
                )}
              >
                {count(k)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <PartTiles onPick={onPick} />
    </Card>
  );
}

/* What the output cannot support, named once each, with the part it comes from. */
function PaperLimits({ live, onPick }: { live: boolean; onPick(k: string): void }) {
  const u = S.up;
  const naming = live && S.st.S00.cur === "a4" && S.st.S00.status === "running";
  const named = INTAKE_LIMITS.slice(0, u.named);
  return (
    <Card data-limits>
      <ColHead icon="alert" title="What the paper cannot use" aside={`${u.named} of ${INTAKE_LIMITS.length} named`} />
      <ul className="divide-y">
        {INTAKE_LIMITS.map((l, n) => {
          const shown = n < named.length;
          const bad = l.tone === "bad";
          const sec = INTAKE.find((x) => x.k === l.sec);
          const check = sec?.checks.find((c) => c.id === l.check);
          const on = typing("up.named", l.sec);
          // A row not named yet keeps its full height with its text hidden, so naming it never moves the page.
          const hide = cn("transition-opacity duration-300", !shown && "opacity-0");
          return (
            <li
              key={l.sec}
              aria-hidden={shown ? undefined : true}
              data-cursor={`limit:${l.sec}`}
              className="relative grid gap-x-6 gap-y-2 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg transition-colors duration-300",
                    !shown && "bg-muted",
                    shown &&
                      (bad
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"),
                  )}
                >
                  {shown ? (
                    <M as="span" in="pop8" dur={280} className="grid place-items-center">
                      <Icon n={bad ? "ban" : "alert"} className="size-4.5" />
                    </M>
                  ) : (
                    naming && n === named.length && <WorkOrb state="working" size={16} />
                  )}
                </span>
                <span className={cn("min-w-0", hide)}>
                  <b className="block text-balance font-semibold text-[14px] leading-snug">
                    <Typed text={l.head} on={on} />
                  </b>
                  <button
                    type="button"
                    tabIndex={shown ? undefined : -1}
                    onClick={() => onPick(l.sec)}
                    className="mt-0.5 text-left text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {sec?.n} · {check?.t}
                  </button>
                </span>
              </div>
              <div className={cn("min-w-0 text-[13px] leading-snug max-md:pl-12", hide)}>
                <span className="block text-muted-foreground text-xs">In the paper</span>
                <Typed text={l.paper} on={on} after={l.head.length} />
              </div>
              <div className={cn("min-w-0 text-[13px] leading-snug max-md:pl-12", hide)}>
                <span className="block text-muted-foreground text-xs">You can</span>
                <Typed text={l.you} on={on} after={l.head.length + l.paper.length} />
              </div>
              {!shown && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-2 py-4 pr-5 pl-16 sm:pl-[4.25rem]"
                >
                  <Skeleton className="h-2.5 w-2/5 animate-none rounded-full" />
                  <Skeleton className="h-2 w-3/5 animate-none rounded-full" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* One part's header in the list: what it is, where it came from, and its mark. */
function SectionHead({ sec, index }: { sec: IntakeSection; index: number }) {
  const state = sectionState(sec);
  const made = sec.checks.filter((c) => !["pending", "now"].includes(checkState(c.id))).length;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon n={sec.icon} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="flex items-baseline gap-2 font-semibold text-[14px]">
          <span className="font-mono font-normal text-muted-foreground text-xs">{index + 1}</span>
          {sec.n}
        </b>
        <span className="block truncate font-mono font-normal text-[11px] text-muted-foreground">{sec.src}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 font-normal">
        <M
          as="span"
          key={state.label}
          in="fade"
          dur={240}
          className={cn("inline-flex items-center gap-1.5 text-[13px]", STATE_TEXT[state.k])}
        >
          <StateMark k={state.k} size="size-3.5" />
          {state.label}
        </M>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {made}/{sec.checks.length} checks
        </span>
      </span>
    </span>
  );
}

export function HandoffScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const u = S.up;
  const st = S.st.S00;
  // The parts a person opened or closed; the rest follow the run.
  const [touched, setTouched] = useState<{ run: unknown; open: Record<string, boolean> }>({ run: S, open: {} });
  const manual = touched.run === S ? touched.open : {};
  const shown = INTAKE.slice(0, st.status === "pending" ? 0 : st.status === "done" ? INTAKE.length : u.open);
  // While the run is checking, a part opens when its checks begin and stays open, so nothing above the part being
  // checked moves. Once the stage is done, a part that passed folds away.
  const auto = (sec: IntakeSection) =>
    st.status === "done"
      ? ["warn", "bad"].includes(sectionState(sec).k)
      : sec.checks.some((c) => checkState(c.id) !== "pending");
  const isOpen = (sec: IntakeSection) => manual[sec.k] ?? auto(sec);
  const open = shown.filter(isOpen).map((sec) => sec.k);
  const setOpen = (next: string[]) => {
    const m = { ...manual };
    for (const sec of shown) if (next.includes(sec.k) !== isOpen(sec)) m[sec.k] = next.includes(sec.k);
    setTouched({ run: S, open: m });
  };
  const pick = (k: string) => {
    setTouched({ run: S, open: { ...manual, [k]: true } });
    afterPaint(() =>
      document
        .querySelector(`[data-sec="${k}"]`)
        ?.scrollIntoView({ behavior: RM() ? "auto" : "smooth", block: "start" }),
    );
  };
  let target: string | null = null;
  if (st.cur === "a0" && u.open) target = `sec:${INTAKE[u.open - 1].k}`;
  if (u.at) target = `chk:${u.at}`;
  if (st.cur === "a4" && u.named) target = `limit:${INTAKE_LIMITS[u.named - 1].sec}`;
  return (
    <div ref={host} className="relative flex flex-col gap-3">
      <IntakeSummary live={live} onPick={pick} />
      <PaperLimits live={live} onPick={pick} />
      <Accordion type="multiple" value={open} onValueChange={setOpen} className="gap-2.5">
        {shown.map((sec, i) => {
          const state = sectionState(sec);
          return (
            <M key={sec.k} in="up4" dur={300}>
              <AccordionItem
                value={sec.k}
                data-sec={sec.k}
                data-cursor={`sec:${sec.k}`}
                className={cn(
                  "scroll-mt-4 overflow-hidden rounded-xl bg-card ring-1 transition-shadow duration-500 not-last:border-b-0",
                  STATE_RING[state.k],
                )}
              >
                <AccordionTrigger className="items-center gap-3 rounded-none px-4 py-3 hover:bg-muted/40 hover:no-underline sm:px-5">
                  <SectionHead sec={sec} index={i} />
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="grid border-t lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <div className="min-w-0 px-4 py-3.5 sm:px-5">
                      <SectionDetail k={sec.k} />
                    </div>
                    <ol
                      aria-label={`Checks on ${sec.n}`}
                      className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3.5 sm:px-5 lg:border-t-0 lg:border-l"
                    >
                      {sec.checks.map((c) => (
                        <CheckRow key={c.id} c={c} />
                      ))}
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </M>
          );
        })}
      </Accordion>
      <AgentCursor
        agent={live && st.status === "running" ? (st.cur === "a1" || st.cur === "a2" ? "code" : "or") : null}
        host={host}
        target={target}
        version={`${u.open}-${u.done}-${u.at}-${u.named}-${open.join()}`}
      />
    </div>
  );
}

/* ---------- S01 · the evidence ledger ---------- */
/** What the check found for one span, as the workspace's status badge; the value itself is already in the row. */
export function LedgerCheck({ r }: { r: LedgerRow }) {
  const e = S.ev;
  if (r.k === "num") {
    if (NUM_ROWS.indexOf(r.id) >= e.recomp)
      return S.st.S02.done.includes("b2") ? (
        <StatusBadge k="na">Not re-checked</StatusBadge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    if (r.id === "EV-05" && (e.mis === "found" || e.mis === "held")) return <StatusBadge k="bad">Mismatch</StatusBadge>;
    if (r.id === "EV-05" && e.mis === "fixed") return <StatusBadge k="info">Trace value used</StatusBadge>;
    return <StatusBadge k="ok">Matches</StatusBadge>;
  }
  if (r.k === "quote") return <StatusBadge k="ok">Verbatim</StatusBadge>;
  if (r.k === "cite") return <StatusBadge k="warn">Cite only</StatusBadge>;
  return <StatusBadge k="bad">Blocks 4.4</StatusBadge>;
}
export function EvidenceScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const e = S.ev;
  const st = S.st.S02;
  const [filter, setFilter] = useState("all");
  const [cell, setCell] = useState<CoverCell | null>(null);
  const rows = LEDGER.slice(0, e.rows);
  const inCell = (r: LedgerRow) => cell && LEDGER_COL[r.id] === cell.col && r.src === COVER_ROWS[cell.ri].src;
  const followed = live
    ? st.cur === "b3" && e.recomp
      ? NUM_ROWS[e.recomp - 1]
      : st.cur === "b2" && e.rows
        ? LEDGER[e.rows - 1].id
        : st.cur === "b4"
          ? "EV-14"
          : null
    : null;
  const resolved = e.refs - (e.refs > BAD_REF ? 1 : 0);
  const keep = (r: LedgerRow) =>
    cell
      ? inCell(r)
      : filter === "all" ||
        (filter === "num" && r.k === "num") ||
        (filter === "quote" && (r.k === "quote" || r.k === "cite")) ||
        (filter === "gap" && r.k === "gap");
  const pickCell = (c: CoverCell | null) => setCell(c);
  const cs = coverState();
  const ready = COVER_COLS.filter((c, ci) => cs.decided(ci) && c.k !== "r4").length;
  let target: string | null = null;
  if (st.cur === "b1") target = "refs";
  if (st.cur === "b2" && cs.shown) {
    const last = COVER_CELLS[Math.min(cs.shown, COVER_CELLS.length) - 1];
    target = `cell:${last.ri}:${last.col}`;
  }
  if (st.cur === "b3") target = "recheck";
  if (st.cur === "b4" && e.ready) target = `foot:${COVER_COLS[Math.min(e.ready, COVER_COLS.length) - 1].k}`;
  const shownRows = rows.filter(keep);
  return (
    <div ref={host} className="relative flex min-w-0 flex-col gap-4">
      <Card>
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/50 px-3.5 py-2.5 text-sm">
          <Icon n="layers" className="size-3.5 text-muted-foreground" />
          <b className="font-semibold">Evidence coverage</b>
          <span className="text-muted-foreground text-xs">
            {e.rows
              ? "Every source against every section of the paper. Each cell counts its evidence spans."
              : "Filled in as the curator indexes the spans."}
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {["num", "quote", "cite", "gap"].map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-[3px]", COVER_KIND[k].swatch)} />
                {COVER_KIND[k].label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-teal-600 dark:bg-teal-500" />
              Re-checked
            </span>
          </span>
        </header>
        <div className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-4">
          {(
            [
              [
                "References",
                e.refs ? `${resolved}/${REFS_TOTAL}` : "—",
                e.refs > BAD_REF ? "1 quarantined" : "resolving",
                e.refs > BAD_REF ? "text-rose-700 dark:text-rose-300" : "",
              ],
              [
                "Evidence spans",
                cs.shown
                  ? String(
                      COVER_COLS.reduce(
                        (s, c) =>
                          s +
                          COVER_ROWS.reduce((t, r, ri) => t + (cs.vis.has(`${ri}:${c.k}`) ? (r.c[c.k] ?? 0) : 0), 0),
                        0,
                      ),
                    )
                  : "—",
                "from 21 sources",
                "",
              ],
              [
                "Numbers re-checked",
                `${Math.round((RESULT_ROWS_TOTAL * e.recomp) / NUM_ROWS.length)}/${RESULT_ROWS_TOTAL}`,
                e.recomp === NUM_ROWS.length ? "0 drift" : "against raw rows",
                e.recomp === NUM_ROWS.length ? "text-emerald-700 dark:text-emerald-300" : "",
              ],
              [
                "Sections writable",
                e.ready ? `${ready}/8` : "—",
                cs.blocked ? "4.4 blocked" : "decided last",
                cs.blocked ? "text-rose-700 dark:text-rose-300" : "",
              ],
            ] as [string, string, string, string][]
          ).map(([k, v, sub, tone]) => (
            <div
              key={k}
              data-cursor={k === "References" ? "refs" : undefined}
              title={k === "References" && e.refs > BAD_REF ? `Quarantined: ${BADDOI} does not exist` : undefined}
              className="flex flex-col gap-0.5 bg-card px-3.5 py-2.5"
            >
              <span className="text-[11px] text-muted-foreground">{k}</span>
              <span className="font-mono font-semibold text-[18px] tabular-nums leading-tight">{v}</span>
              <span className={cn("text-[11px] text-muted-foreground", tone)}>{sub}</span>
            </div>
          ))}
        </div>
        <div className="px-2 pt-2 pb-1 sm:px-3.5">
          <CoverageMatrix live={live} cell={cell} onCell={pickCell} />
        </div>
        <RecheckBand live={live} />
      </Card>
      <Card className="@container">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/50 px-3.5 py-2.5 text-sm">
          <Icon n="table" className="size-3.5 text-muted-foreground" />
          <b className="font-semibold">Ledger</b>
          {cell ? (
            <Badge variant="secondary" className="h-6 gap-1.5 pr-1">
              {COVER_ROWS[cell.ri].src} × {COVER_COLS.find((c) => c.k === cell.col)?.full}
              <button
                type="button"
                aria-label="Show every span"
                onClick={() => setCell(null)}
                className="grid size-4 place-items-center rounded-full hover:bg-foreground/10"
              >
                <Icon n="x" className="size-2.5" sw={3} />
              </button>
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">
              {e.rows
                ? "A sample of the 91 spans · click a cell above to narrow it"
                : "Indexed after the references resolve"}
            </span>
          )}
          {!cell && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={filter}
              onValueChange={(v) => v && setFilter(v)}
              aria-label="Show"
              className="ml-auto"
            >
              {[
                ["all", "All"],
                ["num", "Numbers"],
                ["quote", "Quotes"],
                ["gap", "Gaps"],
              ].map(([k, label]) => (
                <ToggleGroupItem key={k} value={k} className="h-6 px-2 text-[11.5px]">
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </header>
        {rows.length ? (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20 pl-4">Span</TableHead>
                <TableHead className="w-28 @max-3xl:hidden">Kind</TableHead>
                <TableHead>Holds</TableHead>
                <TableHead className="w-36 @max-4xl:hidden">Section</TableHead>
                <TableHead className="w-44 @max-3xl:hidden">Source</TableHead>
                <TableHead className="w-40 pr-4 @max-xl:hidden">Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shownRows.map((r) => (
                <M
                  as={TableRow}
                  key={r.id}
                  in="fade"
                  dur={300}
                  data-ledger={r.id}
                  data-cursor={`led:${r.id}`}
                  data-state={r.id === followed ? "selected" : undefined}
                >
                  <TableCell className={cn(TABLE_PAD, "font-mono text-muted-foreground text-xs leading-5")}>
                    {r.id}
                  </TableCell>
                  <TableCell className={cn(TABLE_PAD, "@max-3xl:hidden")}>
                    <Badge variant="outline">{COVER_KIND[r.k].label}</Badge>
                  </TableCell>
                  <TableCell className={TABLE_PAD}>
                    <span
                      className={cn(
                        "block leading-5",
                        r.k === "cite" && "text-muted-foreground",
                        r.k === "gap" && "text-destructive",
                      )}
                    >
                      <Typed text={r.v} on={typing("ev.rows", r.id)} />
                    </span>
                    <span className="mt-1 block text-muted-foreground text-xs @3xl:hidden">
                      {COVER_KIND[r.k].label} · {r.src}, {r.at}
                    </span>
                    <span className="mt-1.5 block @xl:hidden">
                      <LedgerCheck r={r} />
                    </span>
                  </TableCell>
                  <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 @max-4xl:hidden")}>
                    {COVER_COLS.find((c) => c.k === LEDGER_COL[r.id])?.full}
                  </TableCell>
                  <TableCell className={cn(TABLE_PAD, "leading-5 @max-3xl:hidden")}>
                    {r.src}
                    <span className="block text-muted-foreground text-xs">{r.at}</span>
                  </TableCell>
                  <TableCell className={cn(TABLE_PAD, "@max-xl:hidden")}>
                    <LedgerCheck r={r} />
                  </TableCell>
                </M>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col gap-3 p-3.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[52px_78px_minmax(0,1fr)] gap-3">
                <Skeleton aria-hidden="true" className="h-2.5 w-10 animate-none rounded-full" />
                <Skeleton aria-hidden="true" className="h-2.5 w-14 animate-none rounded-full" />
                <Skeleton
                  aria-hidden="true"
                  className={cn("h-2.5 animate-none rounded-full", i % 2 ? "w-2/3" : "w-full")}
                />
              </div>
            ))}
          </div>
        )}
        {cell && !shownRows.length && (
          <p className="border-t px-3.5 py-3 text-muted-foreground text-xs">
            The{" "}
            {cell.col === "r4"
              ? "gap is shown in the Results 4.4 row"
              : `${COVER_ROWS[cell.ri].c[cell.col]} spans in this cell are not in the sample shown here`}
            .
          </p>
        )}
        {e.rows === LEDGER.length && !cell && (
          <p className="border-t px-3.5 py-2 text-[11px] text-muted-foreground">
            {LEDGER.length} of 91 spans shown. The rest follow the same pattern: every number points to a row, every
            quote to a page and line.
          </p>
        )}
      </Card>
      <AgentCursor
        agent={live && st.status === "running" ? "cu" : null}
        host={host}
        target={target}
        version={`${e.refs > BAD_REF}-${e.rows}-${e.recomp}-${e.ready}`}
      />
    </div>
  );
}

/* ---------- S08 · the journal merge: the frozen claims meet the profile ---------- */
/* A cell that keeps its text's place: a skeleton line until the agent fills it, so rows never change height. */
export function Slot({ on, w = "w-3/4", children }: { on: boolean; w?: string; children: ReactNode }) {
  return (
    <span className="relative block">
      <span
        aria-hidden={on ? undefined : true}
        className={cn("block transition-opacity duration-300", !on && "opacity-0")}
      >
        {children}
      </span>
      {!on && (
        <Skeleton aria-hidden="true" className={cn("absolute top-1 left-0 h-2.5 animate-none rounded-full", w)} />
      )}
    </span>
  );
}
/* Where a line of the contract comes from: a publisher rule, a habit of the journal's papers, or the fourth axis; and
 * what the profile forbids outright. */
const SOURCE_BADGE: Record<string, { label: string; icon: LucideIcon; c: string }> = {
  rule: { label: "Rule", icon: Lock, c: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  habit: { label: "Habit", icon: Users, c: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  axis: { label: "Axis 4", icon: Layers, c: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  ban: { label: "Prohibited", icon: Ban, c: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};
export function SourceBadge({ k }: { k: string }) {
  const { label, icon: I, c } = SOURCE_BADGE[k];
  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", c)}>
      <I />
      {label}
    </Badge>
  );
}
/* How a rule and a habit on the same topic settle. */
const OUTCOME: Record<string, [string, string]> = {
  agree: ["ok", "Agree"],
  conflict: ["warn", "Rule wins"],
  rule: ["info", "Rule only"],
  habit: ["na", "Guidance"],
};
export function HabitStrip({ fit }: { fit: number }) {
  const [, unit, lo, hi, q1, q3, med] = FIT[fit];
  const pos = (x: number) => `${((x - lo) / (hi - lo)) * 100}%`;
  return (
    <span className="mt-2 flex max-w-72 items-center gap-2" title={`Middle half of the 212 papers · ${unit}`}>
      <i className="relative h-1.5 flex-1 rounded-full bg-muted">
        <M
          as="span"
          in="grow"
          className="absolute inset-y-0 origin-left rounded-full bg-sky-500/35"
          style={{ left: pos(q1), width: `calc(${pos(q3)} - ${pos(q1)})` }}
        />
        <span
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-sky-700 dark:bg-sky-300"
          style={{ left: pos(med) }}
        />
      </i>
      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
        {q1}–{q3}
      </span>
    </span>
  );
}
/*
 * Where the two streams meet: the profile is published, or could not be built. While it is still being built the bar
 * above the stage says so and offers the ways on, so nothing shows here.
 */
export function ProfileSource() {
  const j = S.jr;
  if (j.waiting) return null;
  if (j.rulesOnly)
    return (
      <M
        as="section"
        in="card"
        className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl bg-amber-500/[0.06] p-4 ring-1 ring-amber-500/35"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-amber-500 text-amber-950">
          <Icon n="alert" className="size-4" />
        </span>
        <div className="min-w-0">
          <b className="block font-semibold text-[14px]">
            No profile: the contract comes from the publisher’s rules alone
          </b>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            JFE-EDJ-v2 stopped at J1 with too few papers. Every rule binds; there are no habits, no move order and no
            fit bands.
          </p>
          <button
            type="button"
            onClick={() => setTrack("jfe")}
            className="mt-1.5 inline-flex items-center gap-1 font-medium text-[12px] text-amber-800 hover:underline dark:text-amber-300"
          >
            Open the stopped profile run
            <Icon n="arrow" className="size-3" />
          </button>
        </div>
      </M>
    );
  if (!j.loaded) return null;
  return (
    <M
      as="section"
      in="up4"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-pink-500/12 text-pink-700 dark:text-pink-300">
        <Icon n="book" className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block font-semibold text-sm">JFE-EDJ-v2 · published, frozen</b>
        <span className="text-muted-foreground text-xs">
          212 research articles of 2021–2026: rules, habits, move order, recipes and fit bands
        </span>
      </span>
      <Button variant="outline" size="sm" onClick={() => setTrack("jfe")}>
        Open the profile
        <Icon n="arrow" />
      </Button>
    </M>
  );
}

/* c1–c2 · each topic with what the publisher demands and what the journal's papers do, and how the two settle */
function RulesAndHabits({ live }: { live: boolean }) {
  const j = S.jr;
  const st = S.st.S08;
  const conflicts = JOURNAL_DIFF.filter((r) => r.rel === "conflict").length;
  const aside = j.conflict
    ? j.rulesOnly
      ? "Rules only · no profile"
      : `${conflicts} conflict, settled by the rule`
    : st.cur === "c2"
      ? "Reading the journal’s habits"
      : "Rules must hold · habits are typical";
  return (
    <Card className="@container">
      <ColHead icon="compare" title="Publisher rules and journal habits" aside={aside} />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-36 pl-4 @max-xl:w-28">Topic</TableHead>
            <TableHead>Publisher rule</TableHead>
            <TableHead className="@max-2xl:hidden">Journal habit · 212 papers</TableHead>
            <TableHead className="w-36 pr-4 @max-lg:hidden">Outcome</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {JOURNAL_DIFF.map((r, i) => {
            const ruleOn = i < j.rules;
            const habitOn = j.rulesOnly ? ruleOn : i < j.habits;
            const conflict = r.rel === "conflict" && j.conflict && !j.rulesOnly;
            const [tone, label] = j.rulesOnly ? (r.rule ? OUTCOME.rule : ["na", "No rule"]) : OUTCOME[r.rel];
            const working =
              live &&
              ((st.cur === "c1" && i === j.rules - 1) || (st.cur === "c2" && !j.conflict && i === j.habits - 1));
            const habit = j.rulesOnly ? (
              <span className="text-muted-foreground italic">No profile</span>
            ) : (
              <>
                <span className={cn("block leading-5", conflict && "text-muted-foreground")}>
                  {conflict ? <Strike>{r.habit}</Strike> : <Typed text={r.habit} on={typing("jr.habits", i)} />}
                </span>
                {r.fit != null && <HabitStrip fit={r.fit} />}
              </>
            );
            const outcome = <StatusBadge k={tone}>{label}</StatusBadge>;
            return (
              <TableRow key={r.t} data-state={working ? "selected" : undefined} className="duration-300">
                <TableCell className={cn(TABLE_PAD, "font-medium leading-5")}>{r.t}</TableCell>
                <TableCell className={TABLE_PAD} data-cursor={`jr:rule:${i}`}>
                  <Slot on={ruleOn} w="w-3/5">
                    {r.rule ? (
                      <span className="block leading-5">
                        <Typed text={r.rule} on={typing("jr.rules", i)} />
                      </span>
                    ) : (
                      <span className="block text-muted-foreground leading-5">No rule</span>
                    )}
                  </Slot>
                  <span className="mt-2 block @2xl:hidden">
                    <span className="block text-muted-foreground text-xs">Journal habit</span>
                    <Slot on={habitOn} w="w-2/3">
                      {habit}
                    </Slot>
                  </span>
                  <span className="mt-2 block @lg:hidden">
                    <Slot on={j.conflict} w="w-20">
                      {outcome}
                    </Slot>
                  </span>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-2xl:hidden")} data-cursor={`jr:habit:${i}`}>
                  <Slot on={habitOn} w="w-2/3">
                    {habit}
                  </Slot>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-lg:hidden")} data-cursor={`jr:out:${i}`}>
                  <Slot on={j.conflict} w="w-20">
                    {outcome}
                  </Slot>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {j.conflict && !j.rulesOnly && (
        <p className="border-t px-4 py-2.5 text-muted-foreground text-xs">
          Bars show the middle half of the journal’s papers; the tick is the median. Where a habit and a rule differ,
          the rule is written.
        </p>
      )}
    </Card>
  );
}

/* c3 · each statement type: its default place, where this journal puts it, and where it goes in this paper */
function Placement({ live }: { live: boolean }) {
  const j = S.jr;
  const st = S.st.S08;
  return (
    <Card data-place className="@container">
      <ColHead
        icon="layers"
        title="Where each statement goes"
        aside={j.place ? `${j.place} of ${PLACEMENT.length} types placed` : "Fourth axis → IMRaD"}
      />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-40 pl-4 @max-xl:w-32">Statement</TableHead>
            <TableHead className="@max-3xl:hidden">Default place</TableHead>
            <TableHead>In this journal</TableHead>
            <TableHead className="w-48 pr-4 @max-xl:hidden">In this paper</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PLACEMENT.map(([ty, def, jfe, here], i) => {
            const on = i < j.place;
            const ent = ENTITY[ty];
            const [sec, note] = here.split(" · ");
            const writing = typing("jr.place", i);
            const paper = (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge variant="outline" className="font-mono">
                  § {sec}
                </Badge>
                {note && <span className="text-muted-foreground text-xs">{note}</span>}
              </span>
            );
            return (
              <TableRow
                key={ty}
                data-cursor={`place:${i}`}
                data-state={live && st.cur === "c3" && i === j.place - 1 ? "selected" : undefined}
                className="duration-300"
              >
                <TableCell className={TABLE_PAD}>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge className={cn("font-mono", ent.chip)}>{ent.tag}</Badge>
                    <span className="leading-5">{ent.name}</span>
                  </span>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 @max-3xl:hidden")}>
                  <Slot on={on} w="w-1/2">
                    <Typed text={def} on={writing} />
                  </Slot>
                </TableCell>
                <TableCell className={TABLE_PAD}>
                  <Slot on={on} w="w-3/5">
                    <span className="block leading-5">
                      {j.rulesOnly ? (
                        <span className="text-muted-foreground italic">No profile</span>
                      ) : (
                        <Typed text={jfe} on={writing} after={def.length} />
                      )}
                    </span>
                    <span className="mt-1 block text-muted-foreground text-xs @3xl:hidden">Default: {def}</span>
                    <span className="mt-2 block @xl:hidden">{paper}</span>
                  </Slot>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-xl:hidden")}>
                  <Slot on={on} w="w-16">
                    {paper}
                  </Slot>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {j.place === PLACEMENT.length && (
        <p className="border-t px-4 py-2.5 text-muted-foreground text-xs">
          {j.rulesOnly
            ? PLACEMENT_RULES_ONLY
            : "Questions and objectives frame the paper and never enter the graph. Hypotheses are named in Method, never written as results."}
        </p>
      )}
    </Card>
  );
}

/* c4 · each Toulmin part, the habit of the journal it meets, and the line of the contract it becomes */
function ToulminMap({ live }: { live: boolean }) {
  const j = S.jr;
  const st = S.st.S08;
  return (
    <Card data-tmap className="@container">
      <ColHead
        icon="quote"
        title="The argument meets the journal’s habits"
        aside={j.tmap ? `${j.tmap} of ${TOUMAP.length} parts` : "One line per Toulmin part"}
      />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-32 pl-4 @max-xl:w-24">Part</TableHead>
            <TableHead className="@max-2xl:hidden">Journal habit</TableHead>
            <TableHead className="pr-4">In the contract</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TOUMAP.map(([part, habit, line], i) => {
            const on = i < j.tmap;
            const writing = typing("jr.tmap", i);
            const seen = j.rulesOnly ? <span className="italic">No profile</span> : <Typed text={habit} on={writing} />;
            return (
              <TableRow
                key={part}
                data-cursor={`tmap:${i}`}
                data-state={live && st.cur === "c4" && i === j.tmap - 1 ? "selected" : undefined}
                className="duration-300"
              >
                <TableCell className={cn(TABLE_PAD, "font-medium leading-5")}>{part}</TableCell>
                <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 @max-2xl:hidden")}>
                  <Slot on={on} w="w-3/5">
                    {seen}
                  </Slot>
                </TableCell>
                <TableCell className={TABLE_PAD}>
                  <Slot on={on} w="w-2/3">
                    <span className="block leading-5">
                      <Typed text={line} on={writing} after={j.rulesOnly ? 0 : habit.length} />
                    </span>
                    <span className="mt-1 block text-muted-foreground text-xs @2xl:hidden">Journal: {seen}</span>
                  </Slot>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/* c5 · the chosen structure and its word budget, side by side */
function StructureAndBudget() {
  const j = S.jr;
  const total = 9000;
  const budget = SECTIONS.slice(1).map(([k, t, , b]): [string, string, number] => [
    k,
    t,
    Number(b.replace(/[^0-9]/g, "")),
  ]);
  const used = budget.reduce((n, [, , w]) => n + w, 0);
  const bar = (pct: number, tone: string, delay: number) => (
    <i className="block h-1.5 overflow-hidden rounded-full bg-muted">
      <M
        as="b"
        in="grow"
        delay={delay}
        className={cn("block h-full origin-left rounded-full", tone)}
        style={{ width: `${pct}%` }}
      />
    </i>
  );
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <Pane title="Structure" aside={j.rulesOnly ? "Rules only" : "Share of the 212 papers"}>
        {j.variants ? (
          j.rulesOnly ? (
            <p className="text-sm">
              IMRaD with a Related work section, as the author guidelines allow. No share to compare with.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {VARIANTS.map(([k, pct, pick], i) => (
                <M as="li" key={k} in="fade" delay={i * 0.08} className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn("min-w-0 truncate", pick ? "font-medium" : "text-muted-foreground")}>{k}</span>
                    {pick ? <StatusBadge k="ok">Chosen</StatusBadge> : null}
                    <span className="ml-auto font-mono text-xs tabular-nums">{pct}%</span>
                  </span>
                  {bar(pct, pick ? "bg-pink-600" : "bg-pink-500/35", i * 0.12)}
                </M>
              ))}
            </ul>
          )
        ) : (
          <Placeholder>Chosen once rules and habits are apart</Placeholder>
        )}
      </Pane>
      <Pane
        title="Word budget"
        aside={j.budgets ? "9,000 words at most · a rule" : ""}
        data-budget
        data-cursor="budget"
      >
        {j.budgets ? (
          <div className="flex flex-col gap-3">
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {budget.map(([k, t, w], i) => (
                <M as="li" key={k} in="fade" delay={i * 0.06} className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 truncate">{t}</span>
                    <span className="ml-auto font-mono text-xs tabular-nums">{w.toLocaleString("en-US")}</span>
                  </span>
                  {bar((w / total) * 100, "bg-sky-600", i * 0.08)}
                </M>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              {used.toLocaleString("en-US")} of {total.toLocaleString("en-US")} words planned;{" "}
              {(total - used).toLocaleString("en-US")} left for the abstract (at most 250) and slack.
            </p>
          </div>
        ) : (
          <Placeholder>Set from the rules and the chosen structure</Placeholder>
        )}
      </Pane>
    </div>
  );
}

/* c5 · the sentence-level contract, each line with where it comes from */
function Sentences({ live }: { live: boolean }) {
  const j = S.jr;
  const st = S.st.S08;
  const rows = SENTENCE_RULES.filter(([, , k]) => !j.rulesOnly || k === "rule");
  const set = rows.filter(([k]) => SENTENCE_RULES.findIndex(([x]) => x === k) < j.sent).length;
  return (
    <Card data-cursor="sent" className="@container">
      <ColHead icon="pen" title="Sentences" aside={j.sent ? `${set} of ${rows.length} set` : "Tense, voice, terms"} />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-40 pl-4 @max-xl:w-32">Measure</TableHead>
            <TableHead>In the contract</TableHead>
            <TableHead className="w-28 pr-4 @max-lg:hidden">From</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([k, v, kind]) => {
            const i = SENTENCE_RULES.findIndex(([x]) => x === k);
            const on = i < j.sent;
            return (
              <TableRow
                key={k}
                data-state={live && st.cur === "c5" && i === j.sent - 1 ? "selected" : undefined}
                className="duration-300"
              >
                <TableCell className={cn(TABLE_PAD, "font-medium leading-5")}>{k}</TableCell>
                <TableCell className={TABLE_PAD}>
                  <Slot on={on} w="w-1/2">
                    <span className="block leading-5">
                      <Typed text={v} on={typing("jr.sent", i)} />
                    </span>
                    <span className="mt-1.5 block @lg:hidden">
                      <SourceBadge k={kind} />
                    </span>
                  </Slot>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-lg:hidden")}>
                  <Slot on={on} w="w-14">
                    <SourceBadge k={kind} />
                  </Slot>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {j.rulesOnly && (
        <p className="border-t px-4 py-2.5 text-muted-foreground text-xs">
          Habits for tense, voice and length need a profile.
        </p>
      )}
    </Card>
  );
}

/* c6 · the contract every writer works inside */
function ContractCard() {
  const j = S.jr;
  return (
    <Card data-contract data-cursor="contract" className="@container">
      <ColHead
        icon="fileCheck"
        title={`Journal writing contract · ${j.rulesOnly ? "rules only" : "JFE-EDJ-v2"}`}
        aside={<StatusBadge k="ok">Approved at K08</StatusBadge>}
      />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-14 pl-4">Line</TableHead>
            <TableHead>The paper will</TableHead>
            <TableHead className="w-28 pr-4 @max-lg:hidden">From</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {CONTRACT.filter(([, , kind]) => !j.rulesOnly || kind === "rule").map(([n, text, kind], i) => (
            <TableRow key={n} data-state={typing("jr.lines", n) ? "selected" : undefined} className="duration-300">
              <TableCell className={cn(TABLE_PAD, "font-mono text-muted-foreground text-xs leading-5")}>{n}</TableCell>
              <TableCell className={TABLE_PAD}>
                <Slot on={i < j.lines} w="w-3/4">
                  <span className="block leading-5">
                    <Typed text={text} on={typing("jr.lines", n)} />
                  </span>
                  <span className="mt-1.5 block @lg:hidden">
                    <SourceBadge k={kind} />
                  </span>
                </Slot>
              </TableCell>
              <TableCell className={cn(TABLE_PAD, "@max-lg:hidden")}>
                <Slot on={i < j.lines} w="w-14">
                  <SourceBadge k={kind} />
                </Slot>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5 text-xs">
        {["JournalWritingContract.json", "PlacementMap.json"].map((f) => (
          <Badge key={f} variant="outline" className="font-mono">
            <Icon n="file" />
            {f}
          </Badge>
        ))}
        <span className="ml-auto text-muted-foreground">Every writer works inside it.</span>
      </p>
    </Card>
  );
}

export function JournalScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const j = S.jr;
  const st = S.st.S08;
  let target: string | null = null;
  if (st.cur === "c1") target = `jr:rule:${Math.max(0, j.rules - 1)}`;
  if (st.cur === "c2") target = j.conflict ? "jr:out:1" : `jr:habit:${Math.max(0, j.habits - 1)}`;
  if (st.cur === "K08") target = "jr:out:1";
  if (st.cur === "c3") target = `place:${Math.max(0, j.place - 1)}`;
  if (st.cur === "c4") target = `tmap:${Math.max(0, j.tmap - 1)}`;
  if (st.cur === "c5") target = j.sent ? "sent" : "budget";
  if (st.cur === "c6") target = "contract";
  return (
    <div ref={host} className="relative flex flex-col gap-4">
      <ProfileSource />
      <RulesAndHabits live={live} />
      <Placement live={live} />
      <ToulminMap live={live} />
      <StructureAndBudget />
      <Sentences live={live} />
      {j.shaped && <ContractCard />}
      <AgentCursor
        agent={live && st.status === "running" && !j.waiting ? "js" : null}
        host={host}
        target={target}
        version={`${j.rules}-${j.habits}-${j.conflict}-${j.place}-${j.tmap}-${j.sent}-${j.shaped}`}
      />
    </div>
  );
}

/* ---------- S03 · statements, sorted, with their lifecycle drawn ---------- */
export const LANE_T = [
  "Gap · question",
  "Hypothesis · assumption",
  "Finding",
  "Conclusion · implication",
  "Limitation",
];
export const STATUS_ALLOWS: Record<string, string> = {
  ESTABLISHED: "Stated as background, with its citations.",
  APPROVED: "Stated as the paper's question or aim.",
  TESTED: "Named as a hypothesis; never written as a result.",
  ASSUMED: "Written as an assumption, with its scope.",
  SUPPORTED: "May be stated as a finding, with its numbers.",
  INCONCLUSIVE: "Reported with its interval; no claim of a difference.",
  BOUNDED: "Stated only together with its qualifier.",
  PROPOSED: "Offered as a suggestion, never as a result.",
  BLOCKED: "Never written. No evidence, and beyond the scope.",
  BOUNDS: "Must appear wherever the claim it bounds appears.",
  EXPLORATORY: "Reported as exploratory, at most “suggest”; never as a confirmed finding.",
};
export const allowOf = (status: string) => STATUS_ALLOWS[status.startsWith("BOUNDS") ? "BOUNDS" : status];
export function chainOf(id: string) {
  const out = new Set([id]);
  const walk = (cur: string, dir: number) => {
    for (const [a, b, k] of SP_LINKS) {
      const [from, to] = dir > 0 ? [a, b] : [b, a];
      if (from === cur && !out.has(to)) {
        out.add(to);
        if (k !== "lim") walk(to, dir);
      }
    }
  };
  walk(id, 1);
  walk(id, -1);
  return out;
}
/* The statements board as a diagram: five lanes side by side, cards a fixed height so the links can be laid out. */
const SP_LANE = 236;
const SP_CARD = 124;
const SP_GAP = 12;
export function StatementsScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const m = S.stm;
  const st = S.st.S03;
  const wide = useMedia("(min-width: 768px)");
  const [hov, setHov] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const sorted = SP.slice(0, m.sorted);
  const pile = SP.slice(m.sorted, m.arrived);
  const focus = hov ?? pin;
  const chain = focus && m.links ? chainOf(focus) : null;
  const selId = pin ?? (m.blocked ? (live && st.cur === "K03" ? "SP-10" : "SP-13") : m.status ? "SP-08" : null);
  const sel = SP.find((s) => s[0] === selId);
  let target: string | null = null;
  if (st.cur === "d1") target = "pile";
  if (st.cur === "d2" && m.sorted) target = `sp:${SP[m.sorted - 1][0]}`;
  if (st.cur === "d3") target = "sp:SP-08";
  if (st.cur === "d4") target = "sp:SP-02";
  if (st.cur === "d5") target = "sp:SP-13";
  if (st.cur === "K03") target = "sp:SP-10";
  const card = (sp: (typeof SP)[number]) => {
    const [id, type, , text, status, tone] = sp;
    const isF3 = id === "SP-10" && m.f3 === "limitation";
    const ent = ENTITY[isF3 ? "LIMITATION" : type];
    const blocked = id === "SP-13" && m.blocked;
    const expl = S.ceil.expl && type === "FINDING";
    const ctx = OUTSIDE.has(id);
    const dim = chain && !chain.has(id);
    const on = id === selId;
    return (
      <M
        as="button"
        type="button"
        key={id}
        in="card"
        data-wire={id}
        data-cursor={`sp:${id}`}
        onMouseEnter={() => setHov(id)}
        onMouseLeave={() => setHov(null)}
        onFocus={() => setHov(id)}
        onBlur={() => setHov(null)}
        onClick={() => setPin(pin === id ? null : id)}
        aria-pressed={on ? "true" : "false"}
        className={cn(
          "flex w-full flex-col gap-1.5 rounded-lg bg-card px-2.5 py-2 text-left text-xs ring-1 transition-[opacity,box-shadow] duration-300 hover:shadow-sm",
          wide && "h-[124px] overflow-hidden",
          on ? "ring-2 ring-foreground" : blocked ? "ring-rose-500/40" : "ring-foreground/10",
          dim && "opacity-30",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Badge className={cn("h-4 px-1.5 font-mono text-[10px]", ent.chip)}>{ent.tag}</Badge>
          <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-muted-foreground">{id}</span>
          {m.status && (
            <M
              as="span"
              in="pop8"
              delay={(SP.indexOf(sp) % 6) * 0.05}
              className={cn(
                "ml-auto min-w-0 truncate rounded px-1 py-px font-medium text-[9.5px] tracking-wide",
                STATUS_CHIP[blocked ? "bad" : isF3 ? "vio" : expl ? "warn" : tone],
              )}
            >
              {blocked ? "BLOCKED" : isF3 ? "BOUNDS F1–F2" : expl ? "EXPLORATORY" : status}
            </M>
          )}
        </span>
        <span className={cn("leading-snug", wide && "line-clamp-3")}>
          {blocked ? <Strike>{text}</Strike> : <Typed text={text} on={typing("stm.sorted", id)} />}
        </span>
        {ctx && m.status && (
          <M as="span" in="up4" className="mt-auto flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <Icon n="minus" className="size-3 shrink-0" />
            Context · stays outside the graph
          </M>
        )}
      </M>
    );
  };
  const { fresh, seen } = useFresh(live);
  const lanes = LANE_T.map((title, li) => ({ title, li, cards: sorted.filter((sp) => laneOf(sp) === li) }));
  const tallest = Math.max(1, ...lanes.map((l) => l.cards.length));
  const laneH = 44 + tallest * (SP_CARD + SP_GAP) + 4;
  const at = new Map<string, Box>();
  for (const l of lanes)
    for (const [j, sp] of l.cards.entries())
      at.set(sp[0], { x: l.li * SP_LANE + 10, y: 44 + j * (SP_CARD + SP_GAP), w: SP_LANE - 36, h: SP_CARD });
  const boardNodes: BoxNode[] = [
    ...lanes.map(
      (l): BoxNode => ({
        id: `lane-${l.li}`,
        type: "box",
        position: { x: l.li * SP_LANE, y: 0 },
        width: SP_LANE - 16,
        zIndex: -1,
        selectable: false,
        data: {
          w: SP_LANE - 16,
          content: (
            <section
              data-lane={l.li}
              style={{ height: laneH }}
              className="pointer-events-none flex flex-col rounded-xl bg-foreground/[0.03] px-3 pt-2.5 ring-1 ring-foreground/10"
            >
              <header className="flex items-center gap-2 font-semibold text-xs">
                {l.title}
                <span className="ml-auto font-mono font-normal text-[11px] text-muted-foreground">
                  {l.cards.length}
                </span>
              </header>
              {!l.cards.length && (
                <span className="mt-3 rounded-lg border border-dashed px-2 py-3 text-center text-[11px] text-muted-foreground">
                  —
                </span>
              )}
            </section>
          ),
        },
      }),
    ),
    ...lanes.flatMap((l) =>
      l.cards.map((sp): BoxNode => {
        const p = at.get(sp[0]) as Box;
        return {
          id: sp[0],
          type: "box",
          position: { x: p.x, y: p.y },
          width: p.w,
          data: { w: p.w, content: card(sp) },
        };
      }),
    ),
  ];
  const boardEdges: LinkEdge[] = m.links
    ? SP_LINKS.filter(([a, b]) => at.has(a) && at.has(b)).map(([a, b, k]) => {
        const on = Boolean(chain?.has(a) && chain.has(b));
        const id = `${a}-${b}`;
        let opacity = 0.6;
        if (on) opacity = 1;
        else if (chain) opacity = 0.2;
        return {
          id,
          type: "link",
          source: a,
          target: b,
          ...sides(at.get(a) as Box, at.get(b) as Box),
          data: {
            stroke: k === "lim" ? "stroke-rose-500" : on ? "stroke-foreground" : "stroke-slate-400",
            fill: k === "lim" ? "fill-rose-500" : on ? "fill-foreground" : "fill-slate-400",
            dash: k === "lim" ? "4 4" : undefined,
            width: on ? 2 : 1.4,
            opacity: k === "lim" && !chain ? 0.7 : opacity,
            fresh: fresh(id),
          },
        };
      })
    : [];
  useEffect(() => seen(boardEdges.map((e) => e.id)));
  const blockedSel = sel && sel[0] === "SP-13" && m.blocked;
  return (
    <div ref={host} className="relative flex flex-col gap-4">
      <Pane
        title="Incoming statements"
        aside={`${m.arrived} of ${SP.length} · from the data report`}
        data-cursor="pile"
      >
        {pile.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {pile.map((sp) => (
              <M
                as="li"
                key={sp[0]}
                in="pop8"
                data-pile={sp[0]}
                title={sp[3]}
                className="inline-flex h-6 items-center rounded-md bg-muted px-2 font-mono font-semibold text-[11px]"
              >
                {sp[0]}
              </M>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">
            {m.sorted
              ? m.links
                ? "Every statement has a type and a status. Hover one to follow its chain; click to read what it allows."
                : "Every statement has a type."
              : "Statements arrive from the research files."}
          </p>
        )}
      </Pane>
      {wide ? (
        <Diagram
          label="Statements by type, with their lifecycle links"
          nodes={boardNodes}
          edges={boardEdges}
          nodeTypes={BOX_TYPES}
          fitKey={`${tallest}-${m.links}`}
          controls={false}
          className="bg-transparent ring-0"
          style={{ height: Math.min(720, laneH * 0.82 + 40) }}
        />
      ) : (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {lanes.map((l) => (
            <section
              key={l.title}
              data-lane={l.li}
              className="flex min-w-0 flex-col gap-2 rounded-xl bg-foreground/[0.03] p-2.5 ring-1 ring-foreground/10"
            >
              <header className="flex items-center gap-2 px-1 pt-0.5 font-semibold text-xs">
                {l.title}
                <span className="ml-auto font-mono font-normal text-[11px] text-muted-foreground">
                  {l.cards.length}
                </span>
              </header>
              {l.cards.map(card)}
              {!l.cards.length && (
                <span className="rounded-lg border border-dashed px-2 py-3 text-center text-[11px] text-muted-foreground">
                  —
                </span>
              )}
            </section>
          ))}
        </div>
      )}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Pane title="Selected statement" aside={sel ? sel[0] : ""}>
          {sel && m.status ? (
            <M key={sel[0]} in="fade" dur={200} className="flex flex-col gap-2.5 text-[13px]">
              <p className="flex flex-wrap items-center gap-1.5">
                <Badge className={cn("h-4 px-1.5 font-mono text-[10px]", ENTITY[sel[1]].chip)}>
                  {ENTITY[sel[1]].tag}
                </Badge>
                <span className="text-muted-foreground text-xs">{ENTITY[sel[1]].name}</span>
                <span
                  className={cn(
                    "rounded px-1 py-px font-medium text-[9.5px] tracking-wide",
                    STATUS_CHIP[blockedSel ? "bad" : sel[5]],
                  )}
                >
                  {blockedSel ? "BLOCKED" : sel[4]}
                </span>
              </p>
              <p className="font-medium leading-snug">{sel[3]}</p>
              <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
                <span className="text-muted-foreground">The paper may</span>
                <span>{allowOf(blockedSel ? "BLOCKED" : sel[4])}</span>
                <span className="text-muted-foreground">From the report</span>
                <span className="font-mono text-[11.5px]">{sel[6]}</span>
                <span className="text-muted-foreground">In the graph</span>
                <span>
                  {OUTSIDE.has(sel[0])
                    ? "No: context for the claims"
                    : sel[0] === "SP-13"
                      ? "No: blocked"
                      : "Yes, as an I-node at S06"}
                </span>
                <span className="text-muted-foreground">Comes from</span>
                <span className="flex flex-wrap gap-1">
                  {SP_LINKS.filter((l) => l[1] === sel[0]).map((l) => (
                    <button
                      key={l[0]}
                      type="button"
                      onClick={() => setPin(l[0])}
                      className="rounded bg-muted px-1.5 py-px font-mono text-[10.5px] hover:bg-muted/70"
                    >
                      {l[0]}
                    </button>
                  ))}
                  {!SP_LINKS.some((l) => l[1] === sel[0]) && "—"}
                </span>
                <span className="text-muted-foreground">Leads to</span>
                <span className="flex flex-wrap gap-1">
                  {SP_LINKS.filter((l) => l[0] === sel[0]).map((l) => (
                    <button
                      key={l[1]}
                      type="button"
                      onClick={() => setPin(l[1])}
                      className={cn(
                        "rounded px-1.5 py-px font-mono text-[10.5px]",
                        l[2] === "lim"
                          ? "bg-rose-500/12 text-rose-700 dark:text-rose-300"
                          : "bg-muted hover:bg-muted/70",
                      )}
                    >
                      {l[2] === "lim" ? "bounds " : ""}
                      {l[1]}
                    </button>
                  ))}
                  {!SP_LINKS.some((l) => l[0] === sel[0]) && "—"}
                </span>
              </div>
            </M>
          ) : (
            <p className="text-muted-foreground text-xs">Shown once statements have a status.</p>
          )}
        </Pane>
        <Pane title="What each status allows" aside="the writers are held to it">
          {m.status ? (
            <ul className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
              {[
                ["SUPPORTED", "ok"],
                ["INCONCLUSIVE", "warn"],
                ["TESTED", "info"],
                ["ASSUMED", "vio"],
                ["BOUNDED", "vio"],
                ["PROPOSED", "info"],
                ["BLOCKED", "bad"],
                ["BOUNDS", "vio"],
              ].map(([s, tone], i) => (
                <M
                  as="li"
                  key={s}
                  in="up4"
                  delay={i * 0.04}
                  className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-2"
                >
                  <span
                    className={cn("w-fit rounded px-1 py-px font-medium text-[9.5px] tracking-wide", STATUS_CHIP[tone])}
                  >
                    {s}
                  </span>
                  <span className="text-muted-foreground leading-snug">{STATUS_ALLOWS[s]}</span>
                </M>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-xs">
              Each statement gets a status that sets how strongly it may be written.
            </p>
          )}
        </Pane>
      </div>
      <AgentCursor
        agent={live && st.status === "running" ? "ss" : null}
        host={host}
        target={target}
        version={`${m.arrived}-${m.sorted}-${m.status}-${m.links}-${m.blocked}`}
      />
    </div>
  );
}

/* ---------- S04 · Toulmin, drawn ---------- */
export const TOU_KEYS = ["F1", "F2", "F3", "C"];
export function ToulminBox({
  part,
  k,
  shown,
  active,
  children,
  tag,
  tone,
  src,
  extra,
  className: c,
}: {
  part: string;
  k: string;
  shown: boolean;
  active: boolean;
  children: ReactNode;
  tag: string;
  tone: string;
  src?: string | null;
  extra?: ReactNode;
  className?: string;
}) {
  if (!shown)
    return (
      <div
        data-wire={`${k}-${part}`}
        className={cn("flex h-full flex-col gap-2 rounded-xl border border-dashed bg-card px-3 py-2.5", c)}
      >
        <span className="font-mono font-semibold text-[10px] text-muted-foreground/70 uppercase tracking-wider">
          {tag}
        </span>
        <Skeleton aria-hidden="true" className={cn("h-2.5 rounded-full", !active && "animate-none", "w-4/5")} />
        <Skeleton aria-hidden="true" className={cn("h-2.5 rounded-full", !active && "animate-none", "w-1/2")} />
      </div>
    );
  return (
    <M
      key={`${k}-${part}`}
      in="up4"
      data-wire={`${k}-${part}`}
      data-cursor={`tou:${part}`}
      className={cn(
        "relative flex h-full flex-col gap-1.5 overflow-hidden rounded-xl px-3 py-2.5 text-[13px] leading-snug",
        tone,
        c,
      )}
    >
      <span className="font-mono font-semibold text-[10px] uppercase tracking-wider opacity-80">{tag}</span>
      <span>{children}</span>
      {extra}
      {src && S.tou.tied && (
        <M as="span" in="up4" className="mt-auto flex items-center gap-1 pt-0.5 font-mono text-[10px] opacity-75">
          <Icon n="gavel" className="size-3" />
          {src}
        </M>
      )}
    </M>
  );
}
/* Where each part sits: the claim to the right of its data, warrant and backing under the qualifier, the rebuttal
 * under the claim; on a phone, one column read from the top. */
const TOU_WIDE: Record<string, Box> = {
  data: { x: 0, y: 0, w: 250, h: 120 },
  qual: { x: 310, y: 24, w: 210, h: 70 },
  claim: { x: 580, y: 0, w: 250, h: 120 },
  war: { x: 300, y: 210, w: 230, h: 140 },
  reb: { x: 580, y: 210, w: 250, h: 120 },
  back: { x: 300, y: 420, w: 230, h: 130 },
};
const TOU_NARROW: Record<string, Box> = {
  data: { x: 0, y: 0, w: 300, h: 110 },
  qual: { x: 30, y: 150, w: 240, h: 70 },
  claim: { x: 0, y: 260, w: 300, h: 110 },
  war: { x: 0, y: 420, w: 300, h: 130 },
  back: { x: 0, y: 600, w: 300, h: 120 },
  reb: { x: 0, y: 770, w: 300, h: 110 },
};
/** How many parts are drawn before each part appears: read left to right, data, so, claim; then what holds it up
 * below, and what would undo it. */
const PART_AT: Record<string, number> = Object.fromEntries(TOU_ORDER.map((p, i) => [p, i + 1]));
export function ToulminScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const t = S.tou;
  const st = S.st.S05;
  const wide = useMedia("(min-width: 768px)");
  const [pin, setPin] = useState<string | null>(null);
  const { fresh, seen } = useFresh(live);
  const k = pin ?? (live && t.focus ? t.focus : t.cards ? (t.cards < 4 ? TOU_KEYS[t.cards - 1] : "C") : "F1");
  const c = TOU[k];
  const src = TOU_SRC[k];
  const parts = t.parts[k] ?? (TOU_KEYS.indexOf(k) < t.cards ? 6 : 0);
  const building = live && st.cur === "e1" && t.focus === k;
  const recon = Boolean(c.recon && t.recon);
  const scope = Boolean(c.scope && t.scope);
  const moved = k === "F3" && S.stm.f3 === "limitation";
  const claimText =
    k === "C" && S.c.restated
      ? CLAIMS[3].t3
      : k === "C" && t.narrowed
        ? S.db.k04 === "r"
          ? "In this record, first-semester results are the better basis for dropout early warning"
          : CLAIMS[3].t2
        : c.claim;
  const has = (n: number) => parts >= n;
  let target: string | null = null;
  if (st.cur === "e1") target = `tou:${TOU_ORDER[Math.max(0, parts - 1)]}`;
  if (st.cur === "e2") target = "tou:war";
  if (st.cur === "e3") target = "tou:qual";
  const typed = (part: string, text: string) => <Typed text={text} on={typing("tou.parts", `${k}:${part}`)} />;
  const qual = has(PART_AT.qual) ? (
    <M
      key={`${k}-qual`}
      in="fade"
      data-cursor="tou:qual"
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 text-center text-xs ring-1",
        scope && !t.narrowed
          ? "bg-amber-500/12 ring-amber-500/50"
          : scope && t.narrowed
            ? "bg-emerald-500/10 ring-emerald-500/40"
            : "bg-card ring-foreground/15",
      )}
    >
      <span className="font-mono font-semibold text-[9.5px] text-muted-foreground uppercase tracking-wider">
        So, qualifier
      </span>
      <span className="font-medium">
        {scope && t.narrowed ? (
          <>
            <Strike className="text-muted-foreground">{c.qual}</Strike>{" "}
            <M as="ins" in="x" className="bg-emerald-500/12 text-emerald-800 no-underline dark:text-emerald-200">
              {c.qual2}
            </M>
          </>
        ) : (
          typed("qual", c.qual)
        )}
      </span>
      {scope && !t.narrowed && (
        <M as="span" in="up4" className="text-[10.5px] text-amber-800 dark:text-amber-300">
          Scope jump: one benchmark, all long papers
        </M>
      )}
      {t.tied && src.qual && (
        <span className="flex items-center gap-1 font-mono text-[9.5px] text-muted-foreground">
          <Icon n="gavel" className="size-2.5" />
          {src.qual}
        </span>
      )}
    </M>
  ) : (
    <div
      data-wire={`${k}-qual`}
      className="flex h-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed bg-card px-3"
    >
      <span className="font-mono font-semibold text-[9.5px] text-muted-foreground/70 uppercase tracking-wider">
        So, qualifier
      </span>
      <Skeleton aria-hidden="true" className={cn("h-2 w-2/3 rounded-full", !building && "animate-none")} />
    </div>
  );
  const box = (part: string, tag: string, tone: string, body: ReactNode, from?: string | null, extra?: ReactNode) => (
    <ToulminBox
      part={part}
      k={k}
      shown={has(PART_AT[part])}
      active={building}
      tag={tag}
      tone={tone}
      src={from}
      extra={extra}
    >
      {body}
    </ToulminBox>
  );
  const content: Record<string, ReactNode> = {
    data: box("data", "Data", "bg-teal-500/8 ring-1 ring-teal-500/30", typed("data", c.data), src.data),
    qual,
    claim: box(
      "claim",
      k === "C" ? "Claim · conclusion" : "Claim · finding",
      cn("text-white shadow-sm ring-1", ENTITY[k === "C" ? "CONCLUSION" : "FINDING"].box),
      typed("claim", claimText ?? c.claim),
      null,
      moved && (
        <span className="w-fit rounded bg-white/20 px-1.5 py-px text-[10.5px]">Moved to the limitations at K03</span>
      ),
    ),
    war: box(
      "war",
      "Warrant · since",
      recon ? "border border-violet-500/60 border-dashed bg-violet-500/8" : "bg-slate-500/8 ring-1 ring-slate-500/25",
      typed("war", c.war),
      recon ? null : src.war,
      recon && (
        <M
          as="span"
          in="pop8"
          className="mt-auto w-fit rounded bg-violet-600 px-1.5 py-px font-semibold text-[10px] text-white"
        >
          Reconstructed by the AI · in no source
        </M>
      ),
    ),
    reb: box(
      "reb",
      "Rebuttal · unless",
      "bg-rose-500/6 ring-1 ring-rose-500/25",
      typed("reb", c.reb.replace(/^Unless /, "")),
      src.reb,
    ),
    back: box("back", "Backing · on account of", "bg-card ring-1 ring-foreground/10", typed("back", c.back), src.back),
  };
  const at = wide ? TOU_WIDE : TOU_NARROW;
  const nodes: BoxNode[] = Object.entries(at).map(([part, p]) => ({
    id: `${k}-${part}`,
    type: "box",
    position: { x: p.x, y: p.y },
    width: p.w,
    height: p.h,
    data: { w: p.w, h: p.h, content: content[part] },
  }));
  /* Each line leaves and enters by the sides that face each other, so it runs straight between two cards. In one
     column, a line from below the claim to above it goes round the right-hand side, each at its own distance. */
  const ROUTE: Record<string, [string, string, number?]> = wide
    ? {
        "data-qual": ["rs", "lt"],
        "qual-claim": ["rs", "lt"],
        "war-qual": ["ts", "bt"],
        "back-war": ["ts", "bt"],
        "reb-claim": ["ts", "bt"],
      }
    : {
        "data-qual": ["b", "t"],
        "qual-claim": ["b", "t"],
        "war-qual": ["rs", "rt", 18],
        "back-war": ["ts", "bt"],
        "reb-claim": ["rs", "rt", 36],
      };
  const link = (from: string, to: string, stroke: string, fill: string, dash?: string): LinkEdge => {
    const id = `${k}-${from}-${to}`;
    const [sh, th, offset] = ROUTE[`${from}-${to}`];
    return {
      id,
      type: "link",
      source: `${k}-${from}`,
      target: `${k}-${to}`,
      sourceHandle: sh,
      targetHandle: th,
      data: { stroke, fill, dash, step: true, offset, fresh: fresh(id) },
    };
  };
  // A line is drawn once both cards it joins are on the page.
  const joined = (a: string, b: string) => has(PART_AT[a]) && has(PART_AT[b]);
  const edges = (
    [
      joined("data", "qual") && link("data", "qual", "stroke-foreground/45", "fill-foreground/45"),
      joined("qual", "claim") && link("qual", "claim", "stroke-foreground/45", "fill-foreground/45"),
      joined("war", "qual") &&
        link(
          "war",
          "qual",
          recon ? "stroke-violet-500" : "stroke-slate-400",
          recon ? "fill-violet-500" : "fill-slate-400",
          recon ? "4 4" : undefined,
        ),
      joined("back", "war") && link("back", "war", "stroke-slate-400", "fill-slate-400"),
      joined("reb", "claim") && link("reb", "claim", "stroke-rose-500/70", "fill-rose-500/70", "3 3"),
    ] as (LinkEdge | false)[]
  ).filter((e): e is LinkEdge => e !== false);
  useEffect(() => seen(edges.map((e) => e.id)));
  return (
    <div ref={host} className="relative grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <Card>
        <div className="flex items-center gap-1 overflow-x-auto border-b px-2 pt-1.5">
          <Tabs value={k} onValueChange={setPin}>
            <TabsList variant="line" aria-label="Claims">
              {TOU_KEYS.map((key, i) => {
                const ready = i < t.cards;
                const warn = (TOU[key].recon && t.recon) || (TOU[key].scope && t.scope && !t.narrowed);
                return (
                  <TabsTrigger key={key} value={key} disabled={!ready} className="flex-none gap-2 px-2.5">
                    <Badge
                      className={cn(
                        "h-4 px-1.5 font-mono text-[10px]",
                        ENTITY[key === "C" ? "CONCLUSION" : "FINDING"].chip,
                      )}
                    >
                      {key}
                    </Badge>
                    {TOU[key].name}
                    {warn && (
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          TOU[key].scope && !t.narrowed ? "bg-amber-500" : "bg-violet-500",
                        )}
                      />
                    )}
                    {live && st.cur === "e1" && t.focus === key && <PulseDot className="bg-sky-500" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          {pin && (
            <Button variant="ghost" size="xs" className="ml-auto text-muted-foreground" onClick={() => setPin(null)}>
              Follow the Graph Builder
            </Button>
          )}
        </div>
        <Diagram
          label={`${TOU[k].name} in six parts`}
          nodes={nodes}
          edges={edges}
          nodeTypes={BOX_TYPES}
          fitKey={`${k}-${wide}`}
          controls={false}
          className={cn("rounded-none bg-foreground/[0.015] ring-0", wide ? "h-[520px]" : "h-[880px]")}
        />
      </Card>
      <aside className="flex min-w-0 flex-col gap-2.5 xl:sticky xl:top-3">
        <RailSection title="Checks on this claim" aside={TOU[k].name}>
          <ul className="flex flex-col gap-1.5 text-[12.5px]">
            {TOU_CHECKS.map(([label, ok], i) => {
              // Each check is known once the part it reads is drawn: data, warrant, backing, claim, rebuttal.
              const known =
                parts >= [1, 4, 5, 3, 6][i] && (i !== 1 || t.recon || !c.recon) && (i !== 3 || t.scope || !c.scope);
              const pass = ok(k);
              return (
                <li key={label} className="grid grid-cols-[16px_minmax(0,1fr)] items-start gap-2">
                  {known ? (
                    <M as="span" in="pop">
                      <Icon
                        n={pass ? "circleCheck" : "alert"}
                        className={cn(
                          "mt-0.5 size-3.5",
                          pass ? "text-emerald-600" : i === 1 ? "text-violet-600" : "text-amber-600",
                        )}
                      />
                    </M>
                  ) : (
                    <span className="mt-1 size-2.5 rounded-full border border-foreground/25" />
                  )}
                  <span className={cn(!known && "text-muted-foreground")}>
                    {label}
                    {known && !pass ? (
                      <span className="block text-[11px] text-muted-foreground">
                        {i === 1 ? "Marked as reconstructed; never shown as a quote." : "Settled by you at K04."}
                      </span>
                    ) : (
                      ""
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </RailSection>
        <RailSection title="All four claims" aside={`${t.cards} of 4 taken apart`}>
          <ul className="flex flex-col gap-1">
            {TOU_KEYS.map((key, i) => {
              const n = t.parts[key] ?? (i < t.cards ? 6 : 0);
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={i >= t.cards}
                    onClick={() => setPin(key)}
                    className={cn(
                      "grid w-full grid-cols-[28px_minmax(0,1fr)_44px] items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12.5px] transition-colors hover:bg-muted/60 disabled:opacity-40",
                      key === k && "bg-muted/70",
                    )}
                  >
                    <Badge
                      className={cn(
                        "h-4 px-1.5 text-center font-mono text-[10px]",
                        ENTITY[key === "C" ? "CONCLUSION" : "FINDING"].chip,
                      )}
                    >
                      {key}
                    </Badge>
                    <span className="truncate">{TOU[key].claim}</span>
                    <i className="h-1 overflow-hidden rounded-full bg-muted">
                      <b
                        className="block h-full rounded-full bg-blue-500 transition-[width] duration-300"
                        style={{ width: `${(n / 6) * 100}%` }}
                      />
                    </i>
                  </button>
                </li>
              );
            })}
          </ul>
        </RailSection>
        <RailSection title="How to read it" aside="Toulmin">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            The <b className="font-medium text-foreground">data</b> leads to the{" "}
            <b className="font-medium text-foreground">claim</b> because of the{" "}
            <b className="font-medium text-foreground">warrant</b>, which rests on the{" "}
            <b className="font-medium text-foreground">backing</b>. The{" "}
            <b className="font-medium text-foreground">qualifier</b> says how far the claim reaches; the{" "}
            <b className="font-medium text-foreground">rebuttal</b> says what would undo it. A dashed violet warrant was
            inferred by the AI.
          </p>
          <ul className="mt-2.5 flex flex-col gap-1 border-t pt-2.5 text-[11.5px]">
            {[
              ["Data", "the premises the Proponent cited"],
              ["Warrant", "the scheme, or an answered challenge"],
              ["Backing", "answers that held"],
              ["Qualifier", "concessions"],
              ["Rebuttal", "upheld or conceded challenges"],
            ].map(([part, v]) => (
              <li key={part} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                <b className="font-medium">{part}</b>
                <span className="text-muted-foreground">{v}</span>
              </li>
            ))}
          </ul>
        </RailSection>
      </aside>
      <AgentCursor
        agent={live && st.status === "running" ? "ag" : null}
        host={host}
        target={target}
        version={`${k}-${parts}-${t.recon}-${t.scope}-${t.narrowed}-${t.tied}`}
      />
    </div>
  );
}

/* ---------- S05–S06 · the argument map ---------- */
export const boxOf = (id: string) =>
  MN[id]
    ? { x: MN[id].x, y: MN[id].y, w: MN[id].w, h: MN[id].h }
    : MAP_SCH[id]
      ? { x: MAP_SCH[id].x - 18, y: MAP_SCH[id].y - 11, w: 36, h: 22 }
      : null;
export const SCHEME_TONE: Record<string, string> = {
  ra: "bg-card text-emerald-700 ring-emerald-500/70 dark:text-emerald-300",
  ca: "bg-card text-rose-700 ring-rose-500/70 dark:text-rose-300",
  pa: "bg-card text-sky-700 ring-sky-500/70 dark:text-sky-300",
  "ra dang": "bg-card text-rose-700 ring-rose-500/70 dark:text-rose-300",
};
export const SCHEME_NAME: Record<string, string> = {
  ra: "Inference · supports",
  ca: "Conflict · undercuts",
  pa: "Preference",
  "ra dang": "Inference · no premise",
};
export const EDGE_TONE: Record<string, [string, string]> = {
  ok: ["stroke-emerald-600", "fill-emerald-600"],
  att: ["stroke-rose-600", "fill-rose-600"],
  pref: ["stroke-sky-600", "fill-sky-600"],
  life: ["stroke-slate-400", "fill-slate-400"],
  test: ["stroke-slate-400", "fill-slate-400"],
  lim: ["stroke-rose-400", "fill-rose-400"],
};
export interface MapEdge {
  a: string;
  b: string;
  kind: string;
  layer: string;
}
export function mapEdges() {
  const m = S.map;
  const has = (id: string) => m.n.includes(id) || m.s.includes(id);
  const out: MapEdge[] = [];
  for (const [a, b, k] of MAP_LIFE) if (has(a) && has(b)) out.push({ a, b, kind: k ?? "life", layer: "life" });
  for (const [a, b, k] of MAP_AIF)
    if (has(a) && has(b))
      out.push({ a, b, kind: k ?? "ok", layer: k === "att" || k === "pref" ? "conflict" : "support" });
  return out;
}
export const EDGE_VERB: Record<string, string> = {
  att: "undercuts",
  pref: "prefers",
  life: "leads to",
  test: "is tested by",
  lim: "bounds",
  ok: "supports",
};
/* The argument map in React Flow: lanes and the premises band behind, I-nodes and schemes on top. */
interface LaneData extends Record<string, unknown> {
  title: string;
  band?: boolean;
}
function MapLane({ data, width, height }: NodeProps<Node<LaneData, "lane">>) {
  return (
    <div
      style={{ width, height }}
      className={cn(
        "pointer-events-none flex flex-col rounded-2xl px-2.5 pt-2 ring-1",
        data.band ? "bg-rose-500/[0.03] ring-rose-500/15" : "bg-foreground/[0.03] ring-foreground/10",
      )}
    >
      <b
        className={cn(
          "font-mono font-semibold text-[10px] uppercase tracking-wider",
          data.band ? "text-rose-700/70 dark:text-rose-300/70" : "text-muted-foreground",
        )}
      >
        {data.title}
      </b>
    </div>
  );
}
interface INodeData extends Record<string, unknown> {
  id: string;
  label: string;
  fresh: boolean;
  dim: boolean;
  picked: boolean;
}
function MapINode({ data }: NodeProps<Node<INodeData, "inode">>) {
  const { id } = data;
  const n = MN[id];
  const m = S.map;
  const ent = ENTITY[id === "F3" && S.stm.f3 === "limitation" ? "LIMITATION" : n.ty];
  const dead = id === "X" && m.removed;
  const back = Boolean(n.claim && m.back.includes(n.claim));
  const lab = S.asp.labels[id];
  let opacity = 1;
  if (dead) opacity = 0.3;
  else if (data.dim) opacity = 0.25;
  else if (lab === "OUT") opacity = 0.55;
  return (
    <motion.div
      data-cursor={`node:${id}`}
      initial={data.fresh ? { opacity: 0, y: -10, scale: 0.9 } : false}
      animate={{ opacity, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: n.w, height: n.h }}
      className={cn(
        "relative flex cursor-pointer flex-col gap-1 overflow-hidden rounded-xl px-2.5 py-2 text-left text-white shadow-sm ring-1 transition-shadow duration-300 hover:shadow-md",
        ent.box,
        data.picked && "shadow-lg ring-[3px] ring-foreground",
        back && "ring-[3px] ring-amber-400",
        !dead && !data.dim && lab === "OUT" && "saturate-[.35]",
        !dead && !data.dim && lab === "UND" && "ring-[3px] ring-amber-400",
      )}
    >
      <Handles />
      <span className="flex min-w-0 items-center gap-1.5 pr-4 text-[10.5px]">
        <b className="shrink-0 rounded bg-white/20 px-1 font-mono font-semibold leading-4">{ent.tag}</b>
        <span className="truncate font-medium opacity-90">{n.t}</span>
      </span>
      <span className={cn("line-clamp-2 text-[12px] leading-snug", dead && "line-through")}>{data.label}</span>
      {m.checked.includes(id) && !lab && (
        <motion.span
          initial={canEnter() ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-white text-emerald-700 shadow-sm"
        >
          <Icon n="check" className="size-2.5" sw={3.5} />
        </motion.span>
      )}
      {lab && (
        <motion.span
          key={lab}
          initial={canEnter() ? { scale: 0.6, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className={cn(
            "absolute top-1.5 right-1.5 rounded bg-white px-1 font-bold font-mono text-[9px] leading-4 shadow-sm",
            LABEL_TONE[lab],
          )}
        >
          {LABEL_TXT[lab]}
        </motion.span>
      )}
      {n.ctx && (
        <span className="absolute right-1.5 bottom-1.5 rounded bg-white/25 px-1 font-mono text-[9px] leading-4">
          context
        </span>
      )}
    </motion.div>
  );
}
interface SchemeData extends Record<string, unknown> {
  id: string;
  fresh: boolean;
  dim: boolean;
  picked: boolean;
}
function MapScheme({ data }: NodeProps<Node<SchemeData, "scheme">>) {
  const { id } = data;
  const sc = MAP_SCH[id];
  const dead = S.map.removed && id === "RA6";
  const answered = S.asp.answered.includes(id);
  let opacity = 1;
  if (dead) opacity = 0;
  else if (data.dim) opacity = 0.25;
  else if (answered) opacity = 0.45;
  return (
    <motion.div
      title={answered ? `${SCHEME_INFO[id]} Answered at S07.` : SCHEME_INFO[id]}
      data-cursor={`node:${id}`}
      initial={data.fresh ? { opacity: 0, scale: 0.6 } : false}
      animate={{ opacity, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className={cn(
        "grid h-[22px] w-9 cursor-pointer place-items-center rounded-full font-bold font-mono text-[10px] shadow-sm ring-[1.5px]",
        SCHEME_TONE[sc.k],
        sc.k === "ra dang" && "border border-rose-500 border-dashed",
        answered && "line-through",
        data.picked && "ring-[3px]",
      )}
    >
      <Handles />
      {id.slice(0, 2)}
    </motion.div>
  );
}
const MAP_NODE_TYPES = { lane: MapLane, inode: MapINode, scheme: MapScheme };

export function MapCanvas({
  sel,
  pinned,
  onPick,
  hov,
  onHov,
  layer,
  live,
}: {
  sel: string;
  pinned: boolean;
  onPick(id: string): void;
  hov: string | null;
  onHov(id: string | null): void;
  layer: string;
  live: boolean;
}) {
  const m = S.map;
  const all = mapEdges();
  const edges = all.filter((e) => layer === "all" || e.layer === layer);
  const focus = hov ?? (pinned ? sel : null);
  const near = new Set<string>();
  if (focus) {
    near.add(focus);
    for (const e of all) {
      if (e.a === focus) near.add(e.b);
      if (e.b === focus) near.add(e.a);
    }
    /* through a scheme: a node's inference reaches the nodes on its other side */
    for (const e of all) {
      if (MAP_SCH[e.a] && near.has(e.a) && !MAP_SCH[focus]) near.add(e.b);
      if (MAP_SCH[e.b] && near.has(e.b) && !MAP_SCH[focus]) near.add(e.a);
    }
  }
  const lit = focus ? near : null;
  const { fresh, seen } = useFresh(live);
  const shownScheme = (id: string) => {
    const k = MAP_SCH[id].k;
    if (layer === "life") return false;
    if (layer === "support") return k === "ra" || k === "ra dang";
    if (layer === "conflict") return k !== "ra" && k !== "ra dang";
    return true;
  };
  const nodes: Node[] = [
    {
      id: "band",
      type: "lane",
      position: { x: 4, y: 4 },
      width: MAP_W - 8,
      height: 106,
      zIndex: -1,
      selectable: false,
      data: { title: "Premises and caveats", band: true },
    },
    ...MAP_COLS.map(
      ([title, x, w]): Node => ({
        id: `lane-${title}`,
        type: "lane",
        position: { x: x - 6, y: 142 },
        width: w + 12,
        height: MAP_H - 206,
        zIndex: -1,
        selectable: false,
        data: { title },
      }),
    ),
    ...Object.keys(MN)
      .filter((id) => m.n.includes(id))
      .map((id): Node => {
        const n = MN[id];
        let label = n.s;
        if (id === "C" && S.c.restated) label = n.s3 ?? n.s;
        else if (id === "C" && S.tou.narrowed) label = n.s2 ?? n.s;
        return {
          id,
          type: "inode",
          position: { x: n.x, y: n.y },
          width: n.w,
          height: n.h,
          data: { id, label, fresh: fresh(id), dim: Boolean(lit && !lit.has(id)), picked: sel === id && pinned },
        };
      }),
    ...m.s.filter(shownScheme).map((id): Node => {
      const sc = MAP_SCH[id];
      return {
        id,
        type: "scheme",
        position: { x: sc.x - 18, y: sc.y - 11 },
        width: 36,
        height: 22,
        data: { id, fresh: fresh(id), dim: Boolean(lit && !lit.has(id)), picked: sel === id },
      };
    }),
  ];
  const placed = new Set(nodes.map((n) => n.id));
  const links: LinkEdge[] = edges
    .filter((e) => placed.has(e.a) && placed.has(e.b))
    .map((e) => {
      const id = `${e.a}-${e.b}`;
      const on = Boolean(lit?.has(e.a) && lit.has(e.b));
      const dead = m.removed && (e.a === "RA6" || e.b === "RA6");
      const dashed = e.kind === "life" || e.kind === "lim" || e.kind === "test";
      let opacity = 1;
      if (dead) opacity = 0;
      else if (lit && !on) opacity = 0.15;
      return {
        id,
        type: "link",
        source: e.a,
        target: e.b,
        ...(MAP_ROUTE[id]
          ? { sourceHandle: MAP_ROUTE[id].s, targetHandle: MAP_ROUTE[id].t }
          : sides(boxOf(e.a) as Box, boxOf(e.b) as Box)),
        data: {
          stroke: EDGE_TONE[e.kind][0],
          fill: EDGE_TONE[e.kind][1],
          dash: dashed ? "3 4" : undefined,
          width: on ? 2.6 : 1.7,
          opacity,
          fresh: fresh(id),
          step: true,
          cx: MAP_ROUTE[id]?.cx,
          cy: MAP_ROUTE[id]?.cy,
        },
      };
    });
  useEffect(() => seen([...nodes.map((n) => n.id), ...links.map((l) => l.id)]));
  return (
    <Diagram
      label="The argument map"
      nodes={nodes}
      edges={links}
      nodeTypes={MAP_NODE_TYPES}
      fitKey={`${layer}`}
      className="h-[460px] md:h-[600px]"
      onNodeClick={(id) => (MN[id] || MAP_SCH[id]) && onPick(id)}
      onNodeEnter={(id) => (MN[id] || MAP_SCH[id]) && onHov(id)}
      onNodeLeave={() => onHov(null)}
    >
      {m.sweep && (
        <span
          aria-hidden="true"
          className="sweep-x pointer-events-none absolute inset-y-0 z-10 w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-red-500/15 to-transparent"
        />
      )}
      {S.asp.phase === 2 && (
        <M
          in="pop8"
          className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-popover px-3.5 py-2.5 shadow-lg ring-1 ring-foreground/15"
        >
          <WorkOrb state="working" size={20} />
          <span className="flex flex-col">
            <b className="font-semibold text-[12px]">Code check · bootstrap by course</b>
            <span className="text-[11px] text-muted-foreground">2,000 resamples of the courses · gain 95% CI</span>
          </span>
          <RollNumber value="0.081–0.146" className="font-semibold text-[15px]" />
        </M>
      )}
    </Diagram>
  );
}
export function MapRecord({ id, onPick }: { id: string; onPick(id: string): void }) {
  const links = mapEdges().filter((e) => e.a === id || e.b === id);
  const chips = (
    <div className="flex flex-col gap-0.5">
      {links.map((e) => (
        <button
          type="button"
          key={e.a + e.b}
          onClick={() => onPick(e.a === id ? e.b : e.a)}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11.5px] hover:bg-muted/60"
        >
          <span className={cn("font-mono font-semibold", e.a === id && "text-muted-foreground")}>{e.a}</span>
          <span className="text-muted-foreground">{EDGE_VERB[e.kind]}</span>
          <span className={cn("font-mono font-semibold", e.b === id && "text-muted-foreground")}>{e.b}</span>
        </button>
      ))}
      {!links.length && <span className="text-[11.5px] text-muted-foreground">No links yet.</span>}
    </div>
  );
  if (MAP_SCH[id]) {
    const sc = MAP_SCH[id];
    return (
      <div className="flex flex-col gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-5 w-8 place-items-center rounded-full font-bold font-mono text-[9.5px] ring-[1.5px]",
              SCHEME_TONE[sc.k],
            )}
          >
            {id.slice(0, 2)}
          </span>
          <b className="font-semibold text-[12.5px]">{id}</b>
          <span className="text-muted-foreground">{SCHEME_NAME[sc.k]}</span>
        </div>
        <p className="leading-snug">{SCHEME_INFO[id]}</p>
        {id === "RA6" && S.map.removed && (
          <p className="rounded-md bg-rose-500/8 px-2 py-1.5 text-rose-700 dark:text-rose-300">
            Removed at S06: an inference needs at least one premise.
          </p>
        )}
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">Links</span>
        {chips}
      </div>
    );
  }
  const n = MN[id];
  if (!n) return null;
  const ent = ENTITY[n.ty];
  return (
    <div className="flex flex-col gap-2.5 text-xs">
      <div className="flex items-center gap-1.5">
        <Badge className={cn("font-mono", ent.chip)}>{ent.tag}</Badge>
        <b className="font-semibold text-[12.5px]">{n.t}</b>
        {n.st && (
          <span
            className={cn("ml-auto rounded px-1 py-px font-medium text-[9.5px] tracking-wide", STATUS_CHIP[n.st[1]])}
          >
            {n.st[0]}
          </span>
        )}
      </div>
      <p className="leading-snug">{id === "C" && S.tou.narrowed ? n.s2 : n.s}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/60 px-2.5 py-2">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">AIF core</span>
          <dl className="mt-1 grid grid-cols-[34px_minmax(0,1fr)] gap-x-1.5 gap-y-0.5 font-mono text-[10.5px]">
            <dt className="text-muted-foreground">id</dt>
            <dd>{id}</dd>
            <dt className="text-muted-foreground">type</dt>
            <dd>I-node</dd>
          </dl>
        </div>
        <div
          className={cn(
            "rounded-lg px-2.5 py-2 transition-colors",
            S.map.ext ? "bg-violet-500/8 ring-1 ring-violet-500/30" : "bg-muted/40 text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-wide",
              S.map.ext && "text-violet-700 dark:text-violet-300",
            )}
          >
            ASW extension
          </span>
          {S.map.ext ? (
            <dl className="mt-1 grid grid-cols-[48px_minmax(0,1fr)] gap-x-1.5 gap-y-0.5 font-mono text-[10.5px]">
              <dt className="text-muted-foreground">propType</dt>
              <dd className="truncate">{n.ty.toLowerCase()}</dd>
              <dt className="text-muted-foreground">src</dt>
              <dd className="truncate">{n.src ?? n.sp}</dd>
              {S.asp.labels[id] && (
                <>
                  <dt className="text-muted-foreground">label</dt>
                  <dd>{LABEL_TXT[S.asp.labels[id]]}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="mt-1 text-[10.5px]">Kept apart at S06</p>
          )}
        </div>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">Links</span>
      {chips}
    </div>
  );
}
/* ASPIC+ labels: what each claim is, and why */
export const LABEL_TONE: Record<string, string> = {
  IN: "text-emerald-700 dark:text-emerald-400",
  OUT: "text-rose-700 dark:text-rose-400",
  UND: "text-amber-700 dark:text-amber-400",
};
export const LABEL_TXT: Record<string, string> = { IN: "IN", OUT: "OUT", UND: "UNDEC" };
const LABEL_CHIP: Record<string, string> = {
  IN: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  OUT: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  UND: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
};
const LABEL_BAR: Record<string, string> = { IN: "bg-emerald-500", OUT: "bg-rose-500", UND: "bg-amber-500" };
const confTone = (v: number) => (v >= 75 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-rose-500");
/** The claims the paper may lean on, in the order it argues them. */
const CLAIM_ROWS = ["F1", "F2", "F3", "C", "GAP", "IMP", "H4", "ASM"];

/* What the Verifier and Code check established about the whole graph: three measures of one size, side by side. */
function VerifierBand({ className }: { className?: string }) {
  const m = S.map;
  const s6 = S.st.S07;
  const total = MAP_NODES.length + MAP_EVID.length - 1;
  const labels = Object.values(S.asp.labels);
  const counts: Record<string, number> = { IN: 0, OUT: 0, UND: 0 };
  for (const l of labels) counts[l] += 1;
  const cells: [string, ReactNode, ReactNode, ReactNode][] = [
    [
      "Traced to file, page and line",
      m.checked.length,
      total,
      <Progress
        key="t"
        value={(m.checked.length / total) * 100}
        aria-label="Traced to file, page and line"
        className={cn(
          "h-1.5",
          m.checked.length >= total
            ? "[&>[data-slot=progress-indicator]]:bg-emerald-500"
            : "[&>[data-slot=progress-indicator]]:bg-sky-500",
        )}
      />,
    ],
    [
      "Numbers recomputed",
      m.numbers,
      12,
      <Progress
        key="n"
        value={(m.numbers / 12) * 100}
        aria-label="Numbers recomputed"
        className={cn(
          "h-1.5",
          m.numbers >= 12
            ? "[&>[data-slot=progress-indicator]]:bg-emerald-500"
            : "[&>[data-slot=progress-indicator]]:bg-sky-500",
        )}
      />,
    ],
    [
      "ASPIC+ labels",
      labels.length ? (
        <span key="v" className="flex items-baseline gap-2">
          {(["IN", "OUT", "UND"] as const)
            .filter((k) => counts[k] || k !== "UND")
            .map((k) => (
              <span key={k} className="flex items-baseline gap-1">
                <RollNumber value={String(counts[k])} />
                <span className={cn("font-medium font-mono text-[10.5px]", LABEL_TONE[k])}>{LABEL_TXT[k]}</span>
              </span>
            ))}
        </span>
      ) : (
        "—"
      ),
      null,
      <span key="l" className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted">
        {(["IN", "UND", "OUT"] as const).map(
          (k) =>
            counts[k] > 0 && (
              <i
                key={k}
                className={cn("h-full transition-[width] duration-500", LABEL_BAR[k])}
                style={{ width: `${(counts[k] / LABEL_ORDER.length) * 100}%` }}
              />
            ),
        )}
      </span>,
    ],
  ];
  return (
    <Card className={className}>
      <ColHead
        icon="shield"
        title="Verifier"
        aside={s6.status === "pending" ? "after the build" : `${m.checked.length} of ${total} traced`}
      />
      <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 xl:grid-cols-1 xl:divide-x-0 xl:divide-y">
        {cells.map(([k, v, n, bar]) => (
          <div key={k} className="flex flex-col gap-2 px-3.5 py-3">
            <span className="text-[11.5px] text-muted-foreground">{k}</span>
            <b className="flex items-baseline gap-0.5 font-semibold text-[17px] tabular-nums leading-none">
              {typeof v === "number" ? <RollNumber value={String(v)} /> : v}
              {n != null && <span className="font-normal text-[12px] text-muted-foreground">/{n}</span>}
            </b>
            {bar}
          </div>
        ))}
      </div>
      {m.removed && (
        <M as="p" in="up4" className="flex items-start gap-2 border-t px-3.5 py-2.5 text-[12.5px]">
          <Icon n="ban" className="mt-0.5 size-3.5 shrink-0 text-rose-600" />
          RA6 had no premise; the implication it held up was removed.
        </M>
      )}
    </Card>
  );
}

/*
 * Each claim on one row: the ASPIC+ label and why, then how strongly it may be worded. The rows are there from the
 * start, so the table keeps its shape while the labels and limits arrive.
 */
function ClaimLedger({ sel, onPick, className }: { sel: string; onPick(id: string): void; className?: string }) {
  const m = S.map;
  return (
    <Card data-conf className={cn("flex flex-col", className)}>
      <ColHead icon="gavel" title="Claims" aside="ASPIC+ label · confidence limit" />
      <ul className="flex-1 divide-y">
        {CLAIM_ROWS.map((id) => {
          const l = S.asp.labels[id];
          const conf = CONF_K[id];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onPick(id)}
                aria-pressed={sel === id}
                className={cn(
                  "grid w-full grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50 sm:grid-cols-[40px_minmax(0,1fr)_132px]",
                  sel === id && "bg-muted/70 hover:bg-muted/70",
                )}
              >
                {l ? (
                  <M
                    as="span"
                    key={l}
                    in="pop"
                    className={cn(
                      "mt-px w-fit rounded px-1.5 py-px text-center font-bold font-mono text-[10px]",
                      LABEL_CHIP[l],
                    )}
                  >
                    {LABEL_TXT[l]}
                  </M>
                ) : (
                  <span className="mt-px w-fit rounded px-1.5 py-px font-mono text-[10px] border border-foreground/20 border-dashed text-muted-foreground">
                    ···
                  </span>
                )}
                <span className="min-w-0 text-[12.5px]">
                  <b className="font-medium">{MN[id].t}</b>
                  <span className="block text-[11.5px] text-muted-foreground leading-snug">
                    {l ? (
                      <Typed text={aspWhy(id) ?? ""} on={typing("asp.labels", id)} />
                    ) : (
                      "Labelled once the graph is traced."
                    )}
                  </span>
                </span>
                <span className="col-start-2 flex items-center gap-2 sm:col-start-auto sm:mt-1">
                  {conf ? (
                    <>
                      <i className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        {m.conf && (
                          <M
                            as="b"
                            in="grow"
                            className={cn("block h-full origin-left rounded-full", confTone(conf[0]))}
                            style={{ width: `${conf[0]}%` }}
                          />
                        )}
                      </i>
                      <span className="w-[62px] text-right text-[11px] text-muted-foreground">
                        {m.conf ? conf[1] : "after tests"}
                      </span>
                    </>
                  ) : (
                    <span
                      title="No confidence limit: this is not a finding"
                      className="text-[11px] text-muted-foreground/70 max-sm:hidden sm:ml-auto"
                    >
                      —
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="flex flex-col gap-2 border-t px-3.5 py-2.5 text-[11.5px]">
        {S.asp.phase >= 3 && (
          <M as="p" in="up4" className="rounded-md bg-emerald-500/8 px-2 py-1.5 text-emerald-800 dark:text-emerald-300">
            Answered by Code check from the traces, not by an agent. Ledger span EV-05 is superseded by its by-paper
            interval.
          </M>
        )}
        <p className="text-muted-foreground">
          IN may be written, OUT may not, undecided only hedged; the limit says how strongly.
        </p>
      </footer>
    </Card>
  );
}

/*
 * Under the map: the claims on the left; the Verifier's measures and the picked record on the right, the record taking
 * whatever height is left so both columns end together.
 */
function MapPanels({ sel, onPick }: { sel: string; onPick(id: string): void }) {
  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] xl:grid-rows-[auto_1fr]">
      <VerifierBand className="xl:col-start-2 xl:row-start-1" />
      <ClaimLedger sel={sel} onPick={onPick} className="xl:col-start-1 xl:row-span-2 xl:row-start-1" />
      <Card className="flex flex-col xl:col-start-2">
        <ColHead icon="file" title="Record" aside={sel} />
        <div className="flex-1 px-3.5 py-3">
          <MapRecord id={sel} onPick={onPick} />
        </div>
      </Card>
    </div>
  );
}
export function MapScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [sel, setSelRaw] = useState("F1");
  const [pinned, setPinned] = useState(false);
  const [hov, setHov] = useState<string | null>(null);
  const [layer, setLayer] = useState("all");
  const setSel = (id: string) => {
    setPinned(!(pinned && id === sel));
    setSelRaw(id);
  };
  const m = S.map;
  const s5 = S.st.S06;
  const s6 = S.st.S07;
  const running = s5.status === "running" ? "ag" : s6.status === "running" ? "av" : null;
  let target: string | null = null;
  if (s5.cur === "f1" && m.n.length) target = `node:${m.n[m.n.length - 1]}`;
  if (s5.cur === "f2" || s5.cur === "f3") target = `node:${m.n[m.n.length - 1] ?? "F1"}`;
  if (s5.cur === "f4") target = "node:X";
  if (s5.cur === "f5") target = "node:F1";
  if (s6.cur === "g1" && m.checked.length) target = `node:${m.checked[m.checked.length - 1]}`;
  if (s6.cur === "g2") target = "node:E1";
  if (s6.cur === "g3") target = "node:F1";
  if (s6.cur === "g4") target = "node:F1";
  if (s6.cur === "g5" || s6.cur === "G1") target = "node:C";
  return (
    <div ref={host} className="relative flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {m.frozen ? (
          <M
            as="span"
            in="pop"
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground px-3 font-semibold text-background text-xs"
          >
            <Icon n="lock" className="size-3.5" />
            Frozen · map v{m.version}
          </M>
        ) : (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-3 font-medium text-muted-foreground text-xs">
            <Icon n="pen" className="size-3.5" />
            Draft · map v{m.version}
          </span>
        )}
        <span className="text-muted-foreground text-xs tabular-nums">
          {m.n.length} statements · {m.s.filter((x) => !(m.removed && x === "RA6")).length} schemes
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={layer}
          onValueChange={(v) => v && setLayer(v)}
          aria-label="Show links"
          className="ml-auto"
        >
          {[
            ["all", "All links"],
            ["support", "Support"],
            ["conflict", "Conflict"],
            ["life", "Lifecycle"],
          ].map(([k, label]) => (
            <ToggleGroupItem key={k} value={k} className="h-6 px-2 text-[11.5px]">
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <MapCanvas sel={sel} pinned={pinned} onPick={setSel} hov={hov} onHov={setHov} layer={layer} live={live} />
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-4 rounded bg-emerald-600" />
          RA supports
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-4 rounded bg-rose-600" />
          CA attacks
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-4 rounded bg-sky-600" />
          PA prefers
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-0 w-4 border-slate-400 border-t-2 border-dotted" />
          lifecycle
        </span>
        {Object.keys(S.asp.labels).length > 0 && (
          <span className="flex items-center gap-1.5">
            {["IN", "OUT", "UND"].map((k) => (
              <span
                key={k}
                className={cn(
                  "rounded px-1 font-bold font-mono text-[9px] leading-4 ring-1 ring-foreground/10",
                  LABEL_TONE[k],
                )}
              >
                {LABEL_TXT[k]}
              </span>
            ))}
            ASPIC+
          </span>
        )}
        <span className="ml-auto">Hover to follow the links · click to read a record</span>
      </p>
      <MapPanels sel={sel} onPick={setSel} />
      <AgentCursor
        agent={live ? running : null}
        host={host}
        target={target}
        version={`${m.n.length}-${m.s.length}-${m.checked.length}-${m.removed}-${m.conf}`}
      />
    </div>
  );
}
