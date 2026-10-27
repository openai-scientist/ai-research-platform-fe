"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.

import { type ReactNode, useRef, useState } from "react";

import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { PulseDot } from "../run-bits";
import { wordDiff } from "../scenes/debate-positions";
import { CLAIMS } from "./data/core";
import {
  CLOSED_BY_RECORD,
  DSTANCE,
  DSTANCE_ORDER,
  GROUND,
  RULING,
  SCHEMES,
  TARGET,
  THREADS,
  type Turn,
} from "./data/debate";
import { AGENTS, ENTITY } from "./data/meta";
import {
  CEILING,
  CHAIN,
  type ChainLink,
  LEVEL_TONE,
  PLAN_VS_RUN,
  REPORT,
  REPORT_FIELDS,
  REPORT_LATE_STATUS,
  RESULTS_ONLY,
  STANDARDS,
  TIMELINE,
  TIMELINE_LATE,
  TIMELINE_VERDICT,
} from "./data/report";
import { S, turnsShown, typing } from "./engine";
import { AgentAvatar, AgentCursor, afterPaint, cn, Icon, M, Pane, q, RM, Strike, WorkOrb } from "./lib";
import { Card, ColHead, Slot, STATE_TEXT, STATE_TILE, StateMark, StatusBadge, TABLE_PAD, Typed } from "./scenes-gather";

/* ===== S01 the data report, and S04 the debate ===== */

/* ---------- S01 · the record in one standard frame ---------- */
/* The frame, the hypotheses, the planned settings and the questions the ceiling answers are known before the record is
   read: they are on screen from the start, and the record is laid into them in place. Nothing grows or moves. */
const LEVEL_TEXT: Record<string, string> = { must: "Must", should: "Should", may: "May" };
const FIELD_LABEL: Record<string, string> = { ok: "Present", warn: "Partial", bad: "Missing", na: "Not applicable" };
const STD_ORDER = ["RF", "SD", "NI", "DS", "PR", "CON", "RRP"];
const becomes = (to: string) =>
  to
    .split(" · ")
    .map((x) => ENTITY[x]?.name ?? x)
    .join(" · ");
type Field = (typeof REPORT_FIELDS)[number];
/** A field's status, with the late lock turning the plan's own fields partial. */
const fieldTone = (f: Field) => (S.ceil.expl ? REPORT_LATE_STATUS[f.id] : f.s);

function LevelBadge({ lv }: { lv: string }) {
  return <Badge className={LEVEL_TONE[lv]}>{LEVEL_TEXT[lv]}</Badge>;
}
/** The field's level, and whether it applies only to a paper that reports results. */
function FieldLevel({ f }: { f: Field }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <LevelBadge lv={f.level} />
      {RESULTS_ONLY.has(f.id) && <span className="text-[11px] text-muted-foreground">With results</span>}
    </span>
  );
}

export function chainRows() {
  const rp = S.rp;
  return CHAIN.map((c) => {
    if (S.scn !== "orphan" || c.h !== "H3") return c;
    if (rp.h3 === "arrived")
      return {
        ...c,
        pri: "primary",
        a: "A6",
        kind: "confirmatory",
        rows: "results-h3.csv rows 1–3",
        tr: "t06–t15",
        s: "ok",
        why: "Arrived after the hold",
      };
    if (rp.h3 === "named")
      return { ...c, pri: "primary", kind: "not run", s: "warn", why: "Named in Limits: planned, not run" };
    return { ...c, pri: "primary", kind: "missing", s: "bad", why: "Primary, but no analysis and no row" };
  });
}
export function planRunRows() {
  const rp = S.rp;
  return PLAN_VS_RUN.map(([k, plan, run, s]): [string, string, string, string] => {
    if (S.scn === "dev" && k === "Bootstrap") {
      if (rp.dev === "rerun") return [k, plan, "10,000 · rerun by Code check", "ok"];
      if (rp.dev === "declared") return [k, plan, "1,000 · declared as D2", "dev"];
      if (rp.dev === "rerunning") return [k, plan, "rerunning…", "run"];
      return [k, plan, "1,000 resamples · not declared", "bad"];
    }
    if (S.scn === "tune" && k === "Tuning") {
      if (rp.tune === "retuned") return [k, plan, "fixed grid, CV on the training part · rerun", "ok"];
      if (rp.tune === "declared") return [k, plan, "chosen on the test split · declared, D2", "dev"];
      if (rp.tune === "retuning") return [k, plan, "retuning on the training part…", "run"];
      return [k, plan, "grid point chosen on the test split", "bad"];
    }
    return [k, plan, run, s];
  });
}
const chainKind = (c: ChainLink) => (S.ceil.expl && c.kind === "confirmatory" ? "exploratory" : c.kind);
const CHAIN_STATE: Record<string, [string, string]> = {
  confirmatory: ["ok", "Confirmatory"],
  exploratory: ["warn", "Exploratory"],
  deferred: ["na", "Deferred"],
  "not run": ["warn", "Named, not run"],
  missing: ["bad", "Missing"],
};
const PLAN_STATE: Record<string, [string, string]> = {
  ok: ["ok", "Matches"],
  dev: ["warn", "Declared deviation"],
  bad: ["bad", "Not declared"],
  run: ["now", "Rerunning"],
};
const CEIL_STATE: Record<string, [string, string]> = {
  warn: ["warn", "Limited"],
  bad: ["bad", "Never"],
  info: ["na", "Fixed"],
};

/* ----- what the data report is doing, and what each of its five checks came to ----- */
const REPORT_STEPS = [
  { k: "r1", n: "Standard frame", sel: "[data-frame]" },
  { k: "r2", n: "Plan lock", sel: "[data-timeline]" },
  { k: "r3", n: "Hypotheses to results", sel: "[data-chain]" },
  { k: "r4", n: "Runs against the plan", sel: "[data-planrun]" },
  { k: "r5", n: "Claim ceiling", sel: "[data-ceiling]" },
];
function stepResult(k: string): { k: string; label: string } {
  const rp = S.rp;
  const st = S.st.S01;
  const now = st.status === "running" && st.cur === k;
  const pending = (busy: string, idle: string) => ({ k: now ? "now" : "wait", label: now ? busy : idle });
  if (k === "r1") {
    const n = REPORT_FIELDS.length;
    if (rp.fields < n) return pending(`${rp.fields} of ${n} fields`, `${n} fields`);
    const partial = REPORT_FIELDS.filter((f) => fieldTone(f) === "warn").length;
    return partial ? { k: "warn", label: `${partial} partial` } : { k: "ok", label: "Complete" };
  }
  if (k === "r2") {
    if (!rp.tlDone) return pending("Comparing times", "Not checked yet");
    return S.scn === "late" ? { k: "bad", label: "After the runs" } : { k: "ok", label: "Before the runs" };
  }
  if (k === "r3") {
    const rows = chainRows();
    if (!rp.chainDone) return pending(`${rp.chain} of ${rows.length} linked`, "Not linked yet");
    const linked = rows.filter((c) => c.a).length;
    return { k: "ok", label: `${linked} linked · ${rows.length - linked} not tested` };
  }
  if (k === "r4") {
    const rows = planRunRows();
    if (!rp.planDone) return pending(`${rp.plan} of ${rows.length} compared`, "Not compared yet");
    if (rows.some((r) => r[3] === "bad")) return { k: "bad", label: "Undeclared change" };
    const dev = rows.filter((r) => r[3] === "dev").length;
    return dev
      ? { k: "warn", label: `${dev} ${dev === 1 ? "deviation" : "deviations"}, declared` }
      : { k: "ok", label: "Matches the plan" };
  }
  if (rp.ceil < CEILING.length) return pending(`${rp.ceil} of ${CEILING.length} set`, "Not set yet");
  return { k: "ok", label: `${CEILING.length} limits set` };
}
/* One line that says what the Data Steward or Code check is doing right now. */
function reportNow() {
  const rp = S.rp;
  const st = S.st.S01;
  if (st.status !== "running") return null;
  if (st.cur === "r1") {
    const f = REPORT_FIELDS[Math.max(0, rp.fields - 1)];
    return `${REPORT.find((p) => p.p === f.part)?.n} · ${f.id} ${f.label}`;
  }
  if (st.cur === "r2") {
    const tl = S.scn === "late" ? TIMELINE_LATE : TIMELINE;
    return `Comparing the lock of plan.md with the first trace · ${tl[Math.max(0, rp.tl - 1)].x}`;
  }
  if (st.cur === "r3") {
    const c = chainRows()[Math.max(0, rp.chain - 1)];
    return c.h ? `Linking ${c.h} to its analysis, rows and traces` : `Linking ${c.a}, which has no hypothesis`;
  }
  if (st.cur === "r4") {
    const r = planRunRows()[Math.max(0, rp.plan - 1)];
    return `${r[0]} · planned ${r[1]}, ran ${r[2]}`;
  }
  if (st.cur === "K01") return "Waiting for you to confirm the exploratory analysis";
  if (st.cur === "r5") return `Setting what the paper may say · ${CEILING[Math.max(0, rp.ceil - 1)].t}`;
  return null;
}
function ReportSummary({ live }: { live: boolean }) {
  const rp = S.rp;
  const st = S.st.S01;
  const done = st.status === "done";
  const failed = S.lifecycle === "failed" && st.status === "running";
  const laid = REPORT_FIELDS.slice(0, rp.fields);
  const must = REPORT_FIELDS.filter((f) => f.level === "must");
  const mustIn = laid.filter((f) => f.level === "must" && f.s !== "bad").length;
  const partial = laid.filter((f) => fieldTone(f) === "warn").length;
  let title = "Laying the record into the data report";
  if (done)
    title = S.ceil.expl
      ? "Data report complete: every analysis is exploratory"
      : `Data report complete: ${must.length} of ${must.length} must fields present`;
  else if (failed) title = "The data report stopped";
  let line: ReactNode = "Starts once the intake has checked the run’s output.";
  if (done) line = "Every later stage is held to the claim ceiling: the debate, the wording at stop 3, the read-back.";
  else if (failed) line = S.failure;
  else if (st.status === "running") line = (live && reportNow()) || "Opening the checked output of RUN-25CD";
  const oneLine = live && st.status === "running";
  const pick = (sel: string) => q(sel)?.scrollIntoView({ block: "start", behavior: RM() ? "auto" : "smooth" });
  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span className="grid size-10 shrink-0 place-items-center">
          {done ? (
            <Icon n="circleCheck" className="size-7 text-emerald-600 dark:text-emerald-400" />
          ) : failed ? (
            <Icon n="ban" className="size-7 text-rose-600 dark:text-rose-400" />
          ) : st.status === "running" ? (
            <WorkOrb state="working" size={32} />
          ) : (
            <Icon n="list" className="size-6 text-muted-foreground" />
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
        <dl className="flex gap-4">
          {(
            [
              ["Fields", `${rp.fields}/${REPORT_FIELDS.length}`, rp.fields > 0, "", "w-16"],
              ["Must present", `${mustIn}/${must.length}`, mustIn > 0, "", "w-[5.5rem]"],
              ["Partial", String(partial), partial > 0, "text-amber-600 dark:text-amber-400", "w-12"],
            ] as const
          ).map(([label, v, on, tone, w]) => (
            // Each count keeps one width while it climbs, so the row never rewraps mid-run.
            <div key={label} className={cn("flex flex-col", w)}>
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd
                className={cn(
                  "font-semibold text-[22px] tabular-nums leading-tight",
                  on ? tone : "text-muted-foreground/50",
                )}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {REPORT_STEPS.map((s, i) => {
          const r = stepResult(s.k);
          return (
            <li key={s.k} className={cn(i === REPORT_STEPS.length - 1 && "max-sm:col-span-2")}>
              <button
                type="button"
                onClick={() => pick(s.sel)}
                aria-label={`${s.n}: ${r.label}`}
                className={cn(
                  "flex h-full w-full min-w-0 flex-col gap-2 rounded-lg p-2.5 text-left outline-none ring-1 ring-inset transition-[background-color,box-shadow] duration-500 hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring dark:hover:brightness-125",
                  STATE_TILE[r.k],
                )}
              >
                <span className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                  <StateMark k={r.k} />
                </span>
                <span className="min-w-0">
                  <b className="block truncate font-medium text-[12.5px]">{s.n}</b>
                  <span className={cn("block truncate text-[11.5px]", STATE_TEXT[r.k])}>{r.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ----- r1 · the standard frame, field by field ----- */
export function ReportFrame({ live }: { live: boolean }) {
  const rp = S.rp;
  const st = S.st.S01;
  const done = rp.fields === REPORT_FIELDS.length;
  const [only, setOnly] = useState("all");
  const filling = live && st.status === "running" && st.cur === "r1";
  const attention = REPORT_FIELDS.filter((f) => fieldTone(f) === "warn").length;
  const show = done ? only : "all";
  let idx = 0;
  return (
    <Card data-frame className="@container">
      <ColHead
        icon="list"
        title="Standard frame"
        aside={
          done ? (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={show}
              onValueChange={(v) => v && setOnly(v)}
              aria-label="Show"
            >
              <ToggleGroupItem value="all" className="h-6 px-2 text-[11.5px]">
                All {REPORT_FIELDS.length}
              </ToggleGroupItem>
              <ToggleGroupItem value="warn" className="h-6 px-2 text-[11.5px]">
                Partial {attention}
              </ToggleGroupItem>
            </ToggleGroup>
          ) : (
            // As tall as the filter that replaces it, so the header keeps its height.
            <span className="inline-flex h-6 items-center">
              {REPORT.length} parts · {REPORT_FIELDS.length} fields
            </span>
          )
        }
      />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Field</TableHead>
            <TableHead className="w-24 @max-3xl:hidden">Level</TableHead>
            <TableHead>In this record</TableHead>
            <TableHead className="w-40 @max-4xl:hidden">Becomes</TableHead>
            <TableHead className="w-40 pr-4 @max-xl:hidden">Status</TableHead>
          </TableRow>
        </TableHeader>
        {REPORT.map((part) => {
          const first = idx;
          idx += part.fields.length;
          const laid = Math.max(0, Math.min(part.fields.length, rp.fields - first));
          const rows = REPORT_FIELDS.slice(first, idx).filter((f) => show === "all" || fieldTone(f) === "warn");
          if (!rows.length) return null;
          return (
            <TableBody key={part.p} data-part={part.p}>
              {/* The same cells as a field row, so a hidden column never leaves an empty one behind. */}
              <TableRow className="bg-muted/50 text-xs hover:bg-muted/50">
                <TableCell className="py-1.5 pl-4">
                  <span className="flex gap-2.5">
                    <b className="w-7 shrink-0 font-mono font-semibold">{part.p}</b>
                    <span className="truncate font-medium">{part.n}</span>
                  </span>
                </TableCell>
                <TableCell className="py-1.5 @max-3xl:hidden" />
                <TableCell className="py-1.5 pr-4 text-right font-mono text-muted-foreground tabular-nums @xl:pr-2">
                  <span className="@xl:hidden">
                    {laid}/{part.fields.length}
                  </span>
                </TableCell>
                <TableCell className="py-1.5 @max-4xl:hidden" />
                <TableCell className="py-1.5 pr-4 text-right font-mono text-muted-foreground tabular-nums @max-xl:hidden">
                  {laid}/{part.fields.length}
                </TableCell>
              </TableRow>
              {rows.map((f) => {
                const n = REPORT_FIELDS.indexOf(f);
                const on = n < rp.fields;
                const tone = fieldTone(f);
                const late = tone !== f.s;
                const status = <StatusBadge k={tone}>{FIELD_LABEL[tone]}</StatusBadge>;
                return (
                  <TableRow
                    key={f.id}
                    data-field={f.id}
                    data-cursor={`field:${f.id}`}
                    data-state={filling && n === rp.fields - 1 ? "selected" : undefined}
                    className="duration-300"
                  >
                    <TableCell className={TABLE_PAD}>
                      <span className="flex gap-2.5">
                        <span className="w-7 shrink-0 font-mono text-muted-foreground text-xs leading-5">{f.id}</span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="font-medium leading-5">{f.label}</span>
                          <span className="font-mono text-muted-foreground text-xs">
                            {f.std.length ? f.std.join(" · ") : "rrp/v2"}
                          </span>
                          <span className="@3xl:hidden">
                            <FieldLevel f={f} />
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className={cn(TABLE_PAD, "@max-3xl:hidden")}>
                      <FieldLevel f={f} />
                    </TableCell>
                    <TableCell className={TABLE_PAD}>
                      <Slot on={on} w={n % 3 ? "w-2/3" : "w-5/6"}>
                        <span
                          className={cn(
                            "block leading-5",
                            tone === "na" && "text-muted-foreground",
                            tone === "warn" && "text-amber-800 dark:text-amber-300",
                          )}
                        >
                          <Typed
                            text={late ? `${f.v} · exploratory: plan locked after the runs` : f.v}
                            on={typing("rp.fields", f.id)}
                          />
                        </span>
                        <span className="mt-1 block text-muted-foreground text-xs @4xl:hidden">
                          Becomes {becomes(f.to)}
                        </span>
                        <span className="mt-1.5 block @xl:hidden">{status}</span>
                      </Slot>
                    </TableCell>
                    <TableCell className={cn(TABLE_PAD, "text-muted-foreground @max-4xl:hidden")}>
                      <Slot on={on} w="w-2/3">
                        <span className="leading-5">{becomes(f.to)}</span>
                      </Slot>
                    </TableCell>
                    <TableCell className={cn(TABLE_PAD, "@max-xl:hidden")}>
                      <Slot on={on} w="w-20">
                        {status}
                      </Slot>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          );
        })}
      </Table>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2.5 text-muted-foreground text-xs">
        {STD_ORDER.map((k) => (
          <div key={k} className="flex gap-1.5">
            <dt className="font-mono text-foreground">{k}</dt>
            <dd>{STANDARDS[k].n}</dd>
          </div>
        ))}
        <div className="flex gap-1.5">
          <dt className="text-foreground">With results</dt>
          <dd>Not asked of a study proposal</dd>
        </div>
      </dl>
    </Card>
  );
}

/* ----- r2 · was the plan locked before the first run? ----- */
const EVENT_DOT: Record<string, string> = {
  run: "bg-sky-500",
  dev: "bg-amber-500",
  ana: "bg-foreground/40",
  hand: "bg-foreground/40",
};
export function Timeline() {
  const rp = S.rp;
  const late = S.scn === "late";
  const tl = late ? TIMELINE_LATE : TIMELINE;
  const verdict = late ? TIMELINE_VERDICT.late : TIMELINE_VERDICT.ok;
  return (
    <Card data-timeline>
      <ColHead
        icon="lock"
        title="Was the plan locked before the runs?"
        aside={
          rp.tlDone ? (
            <span className={cn("inline-flex items-center gap-1.5 text-[12.5px]", STATE_TEXT[late ? "bad" : "ok"])}>
              <StateMark k={late ? "bad" : "ok"} />
              {late ? "No · locked 12 h after the first trace" : "Yes · locked a minute before the first trace"}
            </span>
          ) : (
            <span className="whitespace-nowrap">Pre-registration</span>
          )
        }
      />
      <div className="px-4 pt-4 pb-3 sm:px-5">
        <ol className="relative grid gap-3 sm:grid-cols-6 sm:gap-2">
          <span
            aria-hidden="true"
            className="absolute top-[5px] right-[8.33%] left-[8.33%] h-px bg-border max-sm:hidden"
          />
          {tl.map((e, i) => {
            const on = i < rp.tl;
            const writing = typing("rp.tl", i);
            const plan = e.k === "plan";
            return (
              <li
                key={e.x}
                data-cursor={`tl:${i}`}
                className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
              >
                <span
                  className={cn(
                    "relative mt-0.5 size-3 shrink-0 rounded-full ring-4 ring-card transition-colors duration-300",
                    !on && "bg-muted ring-card",
                    on && (plan ? (late ? "bg-rose-500" : "bg-emerald-500") : EVENT_DOT[e.k]),
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:items-center">
                  <Slot on={on} w="w-20">
                    <b
                      className={cn(
                        "block font-medium text-[12.5px] leading-tight",
                        plan && late && "text-rose-700 dark:text-rose-300",
                      )}
                    >
                      <Typed text={e.x} on={writing} />
                    </b>
                  </Slot>
                  <Slot on={on} w="w-16">
                    <span className="block font-mono text-[11px] text-muted-foreground tabular-nums">{e.t}</span>
                    <span className="block text-[11px] text-muted-foreground leading-snug">
                      <Typed text={e.sub} on={writing} after={e.x.length} />
                    </span>
                  </Slot>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <p
        aria-hidden={rp.tlDone ? undefined : true}
        className={cn(
          "border-t px-4 py-2.5 text-[12.5px] text-muted-foreground transition-opacity duration-300 sm:px-5",
          !rp.tlDone && "opacity-0",
        )}
      >
        <Typed text={verdict} on={typing("rp.verdict", 0)} />
      </p>
    </Card>
  );
}

/* ----- r3 · each hypothesis to its analysis, its rows and its traces ----- */
export function ChainView() {
  const rp = S.rp;
  const st = S.st.S01;
  const rows = chainRows();
  const linking = st.status === "running" && st.cur === "r3";
  const missing = (v: string | null) => v ?? <span className="text-muted-foreground">—</span>;
  return (
    <Card data-chain className="@container">
      <ColHead
        icon="link"
        title="Each hypothesis to its result"
        aside={rp.chainDone ? stepResult("r3").label : "hypothesis → analysis → rows → traces"}
      />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Hypothesis</TableHead>
            <TableHead className="w-24 @max-3xl:hidden">Analysis</TableHead>
            <TableHead className="w-32 @max-3xl:hidden">Results rows</TableHead>
            <TableHead className="w-24 @max-3xl:hidden">Traces</TableHead>
            <TableHead className="w-44 pr-4 @max-xl:hidden">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c, i) => {
            const on = i < rp.chain;
            const [k, label] = CHAIN_STATE[chainKind(c)];
            const status = <StatusBadge k={k}>{label}</StatusBadge>;
            return (
              <TableRow
                key={c.h ?? c.a}
                data-cursor={`chain:${c.h ?? c.a}`}
                data-state={linking && i === rp.chain - 1 ? "selected" : undefined}
                className="duration-300"
              >
                <TableCell className={TABLE_PAD}>
                  <span className="flex gap-2.5">
                    <span className="w-6 shrink-0 font-mono text-muted-foreground text-xs leading-5">{c.h ?? "—"}</span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium leading-5">{c.txt}</span>
                      <span className="text-muted-foreground text-xs">
                        {[c.pri ? `${c.pri[0].toUpperCase()}${c.pri.slice(1)}` : null, c.why]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span className="@3xl:hidden">
                        <Slot on={on} w="w-1/2">
                          <span className="block font-mono text-xs">
                            {c.a ? [c.a, c.rows, c.tr].filter(Boolean).join(" → ") : "No analysis"}
                          </span>
                          <span className="mt-1.5 block @xl:hidden">{status}</span>
                        </Slot>
                      </span>
                    </span>
                  </span>
                </TableCell>
                {[c.a, c.rows, c.tr].map((v, j) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: the three links of a chain, always in this order
                  <TableCell key={j} className={cn(TABLE_PAD, "font-mono text-xs leading-5 @max-3xl:hidden")}>
                    <Slot on={on} w="w-10">
                      {missing(v)}
                    </Slot>
                  </TableCell>
                ))}
                <TableCell className={cn(TABLE_PAD, "@max-xl:hidden")}>
                  <Slot on={on} w="w-20">
                    {status}
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

/* ----- r4 · the runs against the plan, setting by setting ----- */
export function PlanRun() {
  const rp = S.rp;
  const st = S.st.S01;
  const rows = planRunRows();
  const comparing = st.status === "running" && st.cur === "r4";
  return (
    <Card data-planrun className="@container">
      <ColHead
        icon="compare"
        title="The runs against the plan"
        aside={rp.planDone ? stepResult("r4").label : "CONSORT 3b"}
      />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Setting</TableHead>
            <TableHead className="@max-xl:hidden">Planned</TableHead>
            <TableHead>Ran</TableHead>
            <TableHead className="w-48 pr-4 @max-xl:hidden">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([k, plan, run, s], i) => {
            const on = i < rp.plan;
            const [mk, label] = PLAN_STATE[s];
            const status = <StatusBadge k={mk}>{label}</StatusBadge>;
            return (
              <TableRow
                key={k}
                data-cursor={`plan:${k}`}
                data-state={comparing && i === rp.plan - 1 ? "selected" : undefined}
                className="duration-300"
              >
                <TableCell className={TABLE_PAD}>
                  <span className="block font-medium leading-5">{k}</span>
                  <span className="mt-1 block text-muted-foreground text-xs @xl:hidden">Planned {plan}</span>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 @max-xl:hidden")}>
                  {plan}
                </TableCell>
                <TableCell className={TABLE_PAD}>
                  <Slot on={on} w="w-1/2">
                    <M
                      as="span"
                      key={run}
                      in="fade"
                      dur={260}
                      className={cn(
                        "block leading-5",
                        s === "bad" && "font-medium text-destructive",
                        s === "dev" && "text-amber-800 dark:text-amber-300",
                      )}
                    >
                      <Typed
                        text={run + (s === "dev" && k === "Encoding" ? " · D1, declared 27 Oct" : "")}
                        on={typing("rp.plan", k)}
                      />
                    </M>
                    <span className="mt-1.5 block @xl:hidden">{status}</span>
                  </Slot>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-xl:hidden")}>
                  <Slot on={on} w="w-20">
                    {status}
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

/* ----- r5 · what the record lets the paper say, and what it never may ----- */
export function Ceiling() {
  const rp = S.rp;
  const st = S.st.S01;
  const setting = st.status === "running" && st.cur === "r5";
  const items = CEILING.map((c) =>
    S.ceil.expl && c.t === "Strength of a finding"
      ? { ...c, v: "At most “suggest”", why: "Every analysis is exploratory: the plan was locked after the runs." }
      : c,
  );
  return (
    <Card data-ceiling className="@container">
      <ColHead
        icon="gauge"
        title="Claim ceiling"
        aside={rp.ceil === CEILING.length ? "Every later stage is held to it" : "What the paper may say"}
      />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">On</TableHead>
            <TableHead>The paper may say</TableHead>
            <TableHead className="@max-3xl:hidden">Because</TableHead>
            <TableHead className="w-32 pr-4 @max-xl:hidden">Limit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c, i) => {
            const on = i < rp.ceil;
            const writing = typing("rp.ceil", i);
            const [k, label] = CEIL_STATE[c.tone];
            const status = <StatusBadge k={k}>{label}</StatusBadge>;
            return (
              <TableRow
                key={c.t}
                data-cursor={`ceil:${i}`}
                data-state={setting && i === rp.ceil - 1 ? "selected" : undefined}
                className="duration-300"
              >
                <TableCell className={cn(TABLE_PAD, "font-medium leading-5")}>{c.t}</TableCell>
                <TableCell className={TABLE_PAD}>
                  <Slot on={on} w="w-2/3">
                    <span className="block leading-5">
                      <Typed text={c.v} on={writing} />
                    </span>
                    <span className="mt-1 block text-muted-foreground text-xs @3xl:hidden">
                      <Typed text={c.why} on={writing} after={c.v.length} />
                    </span>
                    <span className="mt-1.5 block @xl:hidden">{status}</span>
                  </Slot>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 @max-3xl:hidden")}>
                  <Slot on={on} w="w-3/4">
                    <Typed text={c.why} on={writing} after={c.v.length} />
                  </Slot>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-xl:hidden")}>
                  <Slot on={on} w="w-16">
                    {status}
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

export function DataReportScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const rp = S.rp;
  const st = S.st.S01;
  let target: string | null = null;
  if (st.cur === "r1" && rp.fields) target = `field:${REPORT_FIELDS[rp.fields - 1].id}`;
  if (st.cur === "r2") target = `tl:${Math.max(0, rp.tl - 1)}`;
  if (st.cur === "r3") {
    const c = chainRows()[Math.max(0, rp.chain - 1)];
    target = `chain:${c.h ?? c.a}`;
  }
  if (st.cur === "r4") target = `plan:${PLAN_VS_RUN[Math.max(0, rp.plan - 1)][0]}`;
  if (st.cur === "r5" || st.cur === "K01") target = `ceil:${Math.max(0, rp.ceil - 1)}`;
  return (
    <div ref={host} className="relative flex flex-col gap-4">
      <ReportSummary live={live} />
      <ReportFrame live={live} />
      <Timeline />
      <ChainView />
      <PlanRun />
      <Ceiling />
      <p className="flex items-start gap-2 px-1 text-[12px] text-muted-foreground">
        <Icon n="info" className="mt-0.5 size-3.5" />
        <span>
          S01 checks that the record is complete and consistent. Whether the method is sound is not decided here: it is
          argued at S04, with this report as a ground.
        </span>
      </p>
      <AgentCursor
        agent={
          live && st.status === "running" && S.lifecycle === "running"
            ? st.cur === "r2" || st.cur === "r4"
              ? "code"
              : "ds"
            : null
        }
        host={host}
        target={target}
        version={`${rp.fields}-${rp.tl}-${rp.chain}-${rp.plan}-${rp.ceil}`}
      />
    </div>
  );
}

/* ---------- S04 · the debate, laid out as the research run's hypothesis debate is ---------- */
/* One pane: the seats, then the conversation thread by thread beside a summary of where each claim stands. On a narrow
   screen the two sides are tabs. Every position is read from a turn's stance, what it replies to and the Judge's
   rulings; nothing is inferred from tone. */
export function threadState(th: string, turns: Turn[]) {
  const mine = turns.filter((t) => t.th === th);
  const rulings = mine.filter((t) => t.st === "rule");
  const challenges = mine.filter((t) => t.st === "challenge");
  const last = (on: string) => rulings.filter((r) => r.on === on).at(-1);
  // A challenge that presses on after an answer belongs to the exchange it continues: only the first one is a root.
  const up = (t: Turn) => (t.re ? mine.find((x) => x.id === t.re) : undefined);
  const continues = (c: Turn) => {
    for (let p = up(c); p; p = up(p)) if (p.st === "challenge") return true;
    return false;
  };
  const roots = challenges.filter((c) => !continues(c));
  const outcomes = roots.map((c) => last(c.id)?.r ?? "open");
  let status = "open";
  if (!mine.length) status = "pending";
  else if (outcomes.includes("unresolved")) status = "deadlock";
  else if (outcomes.includes("upheld")) status = "upheld";
  else if (outcomes.includes("open")) status = challenges.length ? "argued" : "proposed";
  else if (outcomes.includes("conceded")) status = "conceded";
  else status = "held";
  return { mine, rulings, challenges, roots, outcomes, status };
}
type ThreadState = ReturnType<typeof threadState>;
export const THREAD_STATUS: Record<string, { label: string; c: string; icon: string }> = {
  pending: { label: "Waiting", c: "bg-muted text-muted-foreground", icon: "minus" },
  proposed: { label: "Proposed", c: DSTANCE.propose.c, icon: "bulb" },
  argued: { label: "Being argued", c: DSTANCE.challenge.c, icon: "swords" },
  deadlock: { label: "Deadlock · you decide", c: "bg-amber-500/15 text-amber-800 dark:text-amber-300", icon: "flag" },
  upheld: { label: "Objection stands", c: "bg-rose-500/12 text-rose-700 dark:text-rose-300", icon: "swords" },
  conceded: { label: "Caveats kept", c: "bg-sky-500/12 text-sky-700 dark:text-sky-300", icon: "pen" },
  held: { label: "Defended", c: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", icon: "shield" },
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
/** One line under a claim's status saying what it rests on. */
function statusLine(ts: ThreadState) {
  const n = (r: string) => ts.outcomes.filter((x) => x === r).length;
  switch (ts.status) {
    case "pending":
      return "Not stated yet";
    case "proposed":
      return "Stated; no critic has spoken yet";
    case "argued":
      return `${plural(n("open"), "challenge")} waiting for a ruling`;
    case "deadlock":
      return "The Judge could not rule after three rounds: you settle it";
    case "upheld":
      return `${plural(n("upheld"), "objection")} upheld: it cannot stand as written`;
    case "conceded":
      return `${plural(n("conceded"), "caveat")} kept, so the claim is narrowed`;
    default:
      return `Kept against ${plural(ts.roots.length, "challenge")}${n("struck") ? `, ${n("struck")} struck` : ""}`;
  }
}
/** A claim as it now reads: narrowed at K04, or restated after the scenario U8 counterexample. */
function claimNow(th: string, ts: ThreadState) {
  const def = THREADS.find((x) => x.id === th) ?? THREADS[0];
  if (th !== "C") return def.claim;
  if (S.c.restated) return CLAIMS[3].t3 ?? def.claim;
  if (S.db.k04 && ts.mine.some((t) => t.id === "T38"))
    return S.db.k04 === "r"
      ? "In this record, first-semester results are the better basis for dropout early warning."
      : CLAIMS[3].t2;
  return def.claim;
}
/** Where each speaker stands on one claim. */
const POSITION: Record<string, { label: string; icon: string; c: string }> = {
  proposed: { label: "Proposed", icon: "bulb", c: "text-violet-700 dark:text-violet-300" },
  defends: { label: "Defends it", icon: "shield", c: "text-indigo-700 dark:text-indigo-300" },
  rewrote: { label: "Rewrote it", icon: "pen", c: "text-sky-700 dark:text-sky-300" },
  concedes: { label: "Concedes", icon: "check", c: "text-emerald-700 dark:text-emerald-300" },
  objects: { label: "Objects", icon: "swords", c: "text-orange-700 dark:text-orange-300" },
  upheld: { label: "Objection stands", icon: "swords", c: "text-rose-700 dark:text-rose-300" },
  answered: { label: "Objection answered", icon: "swords", c: "text-muted-foreground" },
  conceded: { label: "Caveat kept", icon: "alert", c: "text-amber-800 dark:text-amber-300" },
  struck: { label: "Struck", icon: "ban", c: "text-muted-foreground" },
  rejected: { label: "Objects", icon: "swords", c: "text-orange-700 dark:text-orange-300" },
  unresolved: { label: "Deadlock", icon: "flag", c: "text-amber-800 dark:text-amber-300" },
  satisfied: { label: "Satisfied", icon: "circleCheck", c: "text-emerald-700 dark:text-emerald-300" },
  ruled: { label: "Ruled", icon: "gavel", c: "text-stone-700 dark:text-stone-300" },
};
const AUTHOR_POS: Record<string, string> = {
  propose: "proposed",
  defend: "defends",
  refine: "rewrote",
  concede: "concedes",
};
function positionsOf(ts: ThreadState) {
  const order = [...new Set(ts.mine.map((t) => t.a))];
  return order.map((a) => {
    if (a === "aa") return { a, k: AUTHOR_POS[ts.mine.filter((t) => t.a === "aa").at(-1)?.st ?? "propose"] };
    if (a === "jd") return { a, k: "ruled", n: ts.rulings.length };
    if (ts.mine.some((t) => t.a === a && t.st === "concede")) return { a, k: "satisfied" };
    const mine = ts.challenges.filter((c) => c.a === a);
    const r = ts.rulings.filter((x) => mine.some((c) => c.id === x.on)).at(-1)?.r;
    return { a, k: r && POSITION[r] ? r : "objects" };
  });
}
function PositionChip({ a, k, n }: { a: string; k: string; n?: number }) {
  const meta = POSITION[k];
  return (
    <M
      as="span"
      in="fade"
      dur={250}
      className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted/60 py-0.5 pr-2 pl-0.5 text-[11px]"
    >
      <span className="relative">
        <AgentAvatar a={a} size="sm" />
        <span
          className={cn(
            "absolute -right-1 -bottom-1 grid size-3 place-items-center rounded-full bg-card ring-1 ring-foreground/10",
            meta.c,
          )}
        >
          <Icon n={meta.icon} className="size-2" />
        </span>
      </span>
      <M as="span" key={k} in="fade" dur={250} className={cn("font-medium", meta.c)}>
        {meta.label}
        {n ? ` ×${n}` : ""}
      </M>
    </M>
  );
}
function StatusPill({ status }: { status: string }) {
  const meta = THREAD_STATUS[status];
  return (
    <M
      as="span"
      in="fade"
      dur={250}
      key={status}
      className={cn("inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 font-medium text-[11px]", meta.c)}
    >
      <Icon n={meta.icon} className="size-3" />
      {meta.label}
    </M>
  );
}
/** The claim as first stated and as it now reads: removed words struck, added words marked. */
function Rewrite({ before, after }: { before: string; after: string }) {
  const parts = wordDiff(before, after);
  return (
    <span className="block rounded-lg bg-muted/45 px-2.5 py-2 text-[13px] leading-snug">
      <span className="mb-1 flex items-center gap-1 font-medium text-[11px] text-sky-700 dark:text-sky-300">
        <Icon n="pen" className="size-3" />
        Narrowed in the debate
      </span>
      {parts ? (
        parts.map((p, i) => {
          const key = `${i}-${p.kind}`;
          if (p.kind === "same") return <span key={key}>{p.text} </span>;
          if (p.kind === "del")
            return (
              <span key={key}>
                <Strike className="text-muted-foreground">{p.text}</Strike>{" "}
              </span>
            );
          return (
            <span key={key}>
              <span className="rounded-sm bg-emerald-500/15 px-0.5 text-emerald-800 dark:text-emerald-200">
                {p.text}
              </span>{" "}
            </span>
          );
        })
      ) : (
        <span className="flex flex-col gap-1">
          <Strike className="text-muted-foreground">{before}</Strike>
          <span>{after}</span>
        </span>
      )}
    </span>
  );
}
/** Critical questions of a claim's scheme that are closed: by a ruling, or from the record at the last step. */
function cqClosed(th: string, ts: ThreadState) {
  const def = THREADS.find((x) => x.id === th) ?? THREADS[0];
  const cqs = SCHEMES[def.sch].cqs.map(([cq]) => cq);
  const byRec = CLOSED_BY_RECORD.slice(0, S.db.closed).filter(
    ([t, cq]) => t === th && !(S.scn === "cout" && cq === "P3"),
  );
  const closed = cqs.filter(
    (cq) =>
      byRec.some(([, c]) => c === cq) ||
      ts.challenges.some((c) => c.cq === cq && ts.rulings.some((r) => r.on === c.id && r.r !== "unresolved")),
  );
  return [closed.length, cqs.length];
}
function ThreadCard({
  th,
  turns,
  active,
  onFocus,
}: {
  th: string;
  turns: Turn[];
  active: boolean;
  onFocus(th: string): void;
}) {
  const def = THREADS.find((x) => x.id === th) ?? THREADS[0];
  const ts = threadState(th, turns);
  const now = claimNow(th, ts);
  const [closed, all] = cqClosed(th, ts);
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={() => onFocus(th)}
        aria-label={`Show the debate on ${def.t}`}
        className="relative flex w-full flex-col gap-2 rounded-xl bg-card px-3 py-2.5 text-left text-sm outline-none ring-1 ring-foreground/10 transition-shadow duration-300 hover:shadow-sm hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {active && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px rounded-xl ring-2 ring-sky-500/50"
          />
        )}
        <span className="flex items-center gap-2">
          <b className="inline-flex h-5 items-center rounded-md bg-primary px-1.5 font-bold font-mono text-[11px] text-primary-foreground">
            {th}
          </b>
          <span className="truncate text-[11px] text-muted-foreground">{def.t}</span>
          {active && <PulseDot className="bg-sky-500" />}
          <span className="ml-auto">
            <StatusPill status={ts.status} />
          </span>
        </span>
        {now !== def.claim ? (
          <Rewrite before={def.claim} after={now} />
        ) : (
          <span className="line-clamp-3 text-[13px] leading-snug">{now}</span>
        )}
        {ts.mine.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {positionsOf(ts).map((p) => (
              <PositionChip key={p.a} a={p.a} k={p.k} n={p.n} />
            ))}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <M as="span" key={statusLine(ts)} in="fade" dur={250}>
            {statusLine(ts)}
          </M>
          <span className="ml-auto font-mono tabular-nums" title={SCHEMES[def.sch].n}>
            CQ {closed}/{all}
          </span>
        </span>
      </button>
    </li>
  );
}
const TALLY_NOUN: Record<string, string> = {
  propose: "claims",
  challenge: "challenges",
  defend: "answers",
  refine: "rewrites",
  concede: "concessions",
  rule: "rulings",
};
export function Tally({ turns }: { turns: Turn[] }) {
  const total = turns.length || 1;
  const tally = Object.fromEntries(DSTANCE_ORDER.map((k) => [k, turns.filter((t) => t.st === k).length]));
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {DSTANCE_ORDER.map((k) => (
          <span
            key={k}
            className={cn("h-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]", DSTANCE[k].bar)}
            style={{ width: `${(tally[k] / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {DSTANCE_ORDER.map((k) => (
          <span key={k} className={cn("inline-flex items-center gap-1", !tally[k] && "text-muted-foreground/60")}>
            <span className={cn("size-1.5 rounded-full", DSTANCE[k].bar)} />
            <Icon n={DSTANCE[k].icon} className="size-3 text-muted-foreground" />
            <span className="font-mono font-semibold tabular-nums">{tally[k]}</span>
            <span className="text-muted-foreground">{TALLY_NOUN[k]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
/** Every ruling and what it adds to the diagrams, in the order the Judge gave them. */
function RulingsCard({ turns }: { turns: Turn[] }) {
  const rulings = turns.filter((t) => t.st === "rule" && t.r);
  if (!rulings.length) return null;
  return (
    <M as="div" in="up6" className="flex flex-col gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10">
      <span className="flex items-center gap-1.5 font-semibold text-xs">
        <Icon n="gavel" className="size-3.5 text-muted-foreground" />
        Judge's rulings
        <span className="ml-auto font-normal text-[11px] text-muted-foreground">what each adds to the diagrams</span>
      </span>
      <ol className="flex flex-col gap-1.5">
        {rulings.map((t) => (
          <M
            as="li"
            key={t.id}
            in="fade"
            className="grid grid-cols-[36px_auto_minmax(0,1fr)] items-start gap-2 text-xs"
          >
            <span className="pt-0.5 font-mono font-semibold text-[11px] text-muted-foreground">{t.th}</span>
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-md px-1.5 font-medium text-[11px]",
                RULING[t.r ?? "answered"].c,
              )}
            >
              {RULING[t.r ?? "answered"].label}
            </span>
            <span className="pt-0.5 text-muted-foreground leading-snug">{t.fx ?? "Nothing is drawn"}</span>
          </M>
        ))}
      </ol>
    </M>
  );
}

const GROUND_PREFIX: Record<string, string> = { cq: "CQ ", rep: "Data report " };
/** What a turn rests on, in words: a critical question, a ledger span, a field of the data report, a source. */
function Grounds({ g }: { g: [string, string][] }) {
  if (g.some(([k]) => k === "none")) return <span className="text-destructive">No ground given</span>;
  return (
    <>
      Rests on{" "}
      {g.map(([k, ref], i) => (
        <span key={`${k}:${ref}`}>
          {i > 0 && " · "}
          <span title={GROUND[k]?.n}>
            {GROUND_PREFIX[k] ?? ""}
            <span className="font-mono text-foreground/80">{ref}</span>
          </span>
        </span>
      ))}
    </>
  );
}
/** How deep a reply sits: a reply to a reply is indented twice; a ruling sits under what it rules on. */
function depthOf(t: Turn, byId: Record<string, Turn>) {
  let depth = 0;
  let at: Turn | undefined = t;
  while (at && depth < 2) {
    const up: string | undefined = at.re ?? at.on;
    const parent: Turn | undefined = up ? byId[up] : undefined;
    if (!parent) break;
    depth += 1;
    at = parent;
  }
  return depth;
}
/** The replies a turn drew, one chip per stance, with who gave them. */
function Reactions({ replies }: { replies: Turn[] }) {
  if (!replies.length) return null;
  const groups = DSTANCE_ORDER.map((st) => ({
    st,
    agents: [...new Set(replies.filter((r) => r.st === st).map((r) => r.a))],
  })).filter((g) => g.agents.length);
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {groups.map(({ st, agents }) => (
        <M
          as="span"
          key={st}
          in="fade"
          title={`${agents.map((a) => AGENTS[a].name).join(" and ")}: ${DSTANCE[st].label.toLowerCase()}`}
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full py-0.5 pr-1 pl-2 font-medium text-[11px]",
            DSTANCE[st].c,
          )}
        >
          <Icon n={DSTANCE[st].icon} className="size-3" />
          <span className="font-mono tabular-nums">{agents.length}</span>
          <span className="flex -space-x-1.5">
            {agents.map((a) => (
              <span key={a} className="inline-flex rounded-full ring-2 ring-card">
                <AgentAvatar a={a} size="sm" />
              </span>
            ))}
          </span>
        </M>
      ))}
    </span>
  );
}
function TurnRow({
  t,
  byId,
  replies,
  fresh,
}: {
  t: Turn;
  byId: Record<string, Turn>;
  replies: Turn[];
  fresh: boolean;
}) {
  const g = AGENTS[t.a];
  const depth = depthOf(t, byId);
  const parent = t.re ? byId[t.re] : t.on ? byId[t.on] : undefined;
  const rule = t.st === "rule" ? RULING[t.r ?? "answered"] : null;
  const stance = DSTANCE[t.st];
  return (
    <M
      as="li"
      in="fade"
      dur={350}
      data-turn={t.id}
      data-cursor={`turn:${t.id}`}
      className={cn(
        "relative grid grid-cols-[28px_minmax(0,1fr)] gap-2.5",
        depth === 1 && "ml-6",
        depth === 2 && "ml-12",
      )}
    >
      {depth > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -left-4 h-5 w-3 rounded-bl-md border-foreground/15 border-b border-l"
        />
      )}
      {fresh && (
        <span
          aria-hidden="true"
          className="flash pointer-events-none absolute -inset-x-1.5 -inset-y-1 rounded-xl bg-sky-500/10 ring-1 ring-sky-500/30"
        />
      )}
      <AgentAvatar a={t.a} />
      <div className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <b className={cn("font-semibold", g.text)}>{g.name}</b>
          <span
            className={cn(
              "inline-flex h-5 items-center gap-1 rounded-md px-1.5 font-medium text-[11px]",
              rule ? rule.c : stance.c,
            )}
          >
            <Icon n={stance.icon} className="size-3" />
            {rule ? rule.label : stance.label}
          </span>
          {t.sev && (
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-md px-1.5 font-medium text-[11px]",
                t.sev === "fatal"
                  ? "bg-rose-500/12 text-rose-700 dark:text-rose-300"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-300",
              )}
            >
              {t.sev === "fatal" ? "Fatal" : "Caveat"}
              {t.tgt && <span className="ml-1 font-normal opacity-80">· {TARGET[t.tgt]}</span>}
            </span>
          )}
          {parent && (
            <span className="text-muted-foreground">
              {rule
                ? `on ${AGENTS[parent.a].name}’s ${parent.st === "defend" ? "answer" : "challenge"}`
                : `replying to ${AGENTS[parent.a].name}`}
            </span>
          )}
        </span>
        <p className="mt-0.5 max-w-[78ch] text-sm leading-snug">
          <Typed text={t.tx} on={typing("db.turns", t.id)} />
        </p>
        {Boolean(t.g ?? t.fx ?? t.note) && (
          <p className="mt-1 max-w-[78ch] text-muted-foreground text-xs leading-snug">
            {t.g && <Grounds g={t.g} />}
            {t.fx && (
              <>
                <b className="font-medium text-foreground/80">Adds to the diagrams: </b>
                {t.fx}
              </>
            )}
            {t.note && (
              <span className="block text-amber-800 dark:text-amber-300">
                <b className="font-medium">Why: </b>
                {t.note}
              </span>
            )}
          </p>
        )}
        <Reactions replies={replies} />
      </div>
    </M>
  );
}
function ThreadSection({
  th,
  turns,
  byId,
  replies,
  newest,
  live,
  flash,
}: {
  th: string;
  turns: Turn[];
  byId: Record<string, Turn>;
  replies: Map<string, Turn[]>;
  newest?: string;
  live: boolean;
  flash?: number;
}) {
  const def = THREADS.find((x) => x.id === th) ?? THREADS[0];
  const ts = threadState(th, turns);
  const sch = SCHEMES[def.sch];
  return (
    <section
      data-thread={th}
      className="relative grid scroll-mt-24 gap-x-4 gap-y-2.5 border-t pt-3.5 first:border-t-0 first:pt-0 @2xl:grid-cols-[132px_minmax(0,1fr)]"
    >
      {flash !== undefined && (
        <span
          key={flash}
          aria-hidden="true"
          className="flash pointer-events-none absolute -inset-x-2 -top-1 -bottom-2 rounded-xl bg-sky-500/10 ring-1 ring-sky-500/30"
        />
      )}
      <div className="flex flex-wrap items-center gap-2 @2xl:flex-col @2xl:items-start">
        <b className="inline-flex h-6 items-center rounded-md bg-primary px-2 font-bold font-mono text-primary-foreground text-xs">
          {th}
        </b>
        <StatusPill status={ts.status} />
        <span className="text-[11px] text-muted-foreground leading-snug" title={sch.form}>
          {plural(ts.mine.length, "turn")} · {sch.n}
        </span>
      </div>
      <ol className="flex min-w-0 flex-col gap-2.5">
        {ts.mine.map((t) => (
          <TurnRow key={t.id} t={t} byId={byId} replies={replies.get(t.id) ?? []} fresh={live && t.id === newest} />
        ))}
        {!ts.mine.length && (
          <li aria-hidden="true" className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
            <span className="size-7 rounded-full bg-muted" />
            <span className="flex min-w-0 flex-col gap-2 pt-1">
              <Skeleton className={cn("h-2 w-1/4 rounded-full", !live && "animate-none")} />
              <Skeleton className={cn("h-2.5 rounded-full", !live && "animate-none")} />
              <Skeleton className={cn("h-2.5 w-3/5 rounded-full", !live && "animate-none")} />
            </span>
          </li>
        )}
      </ol>
    </section>
  );
}
/** Who sits at the debate, and what each asks of a claim. */
const DEBATE_SEATS: [string, string][] = [
  ["aa", "States each claim and answers"],
  ["qm", "Asks how the evidence was made"],
  ["qs", "Asks whether the numbers hold"],
  ["qx", "Asks how far a claim reaches"],
  ["ql", "Asks what the literature says"],
  ["jd", "Rules on every exchange"],
];
export function DebateScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const st = S.st.S04;
  const turns = turnsShown();
  const byId: Record<string, Turn> = Object.fromEntries(turns.map((t) => [t.id, t]));
  const replies = new Map<string, Turn[]>();
  for (const t of turns) {
    const to = t.re ?? t.on;
    if (to) replies.set(to, [...(replies.get(to) ?? []), t]);
  }
  const newest = turns.at(-1)?.id;
  const [view, setView] = useState<"conversation" | "summary">("conversation");
  const [flash, setFlash] = useState<{ th: string; n: number } | null>(null);
  const focus = (th: string) => {
    setView("conversation");
    setFlash((f) => ({ th, n: (f?.n ?? 0) + 1 }));
    afterPaint(() =>
      q(`[data-thread="${th}"]`)?.scrollIntoView({ block: "start", behavior: RM() ? "auto" : "smooth" }),
    );
  };
  const running = live && st.status === "running";
  const speaking = running && S.lifecycle === "running" ? (turns.at(-1)?.a ?? null) : null;
  const argued = THREADS.filter((d) => turns.some((t) => t.th === d.id)).length;
  return (
    <div ref={host} className="relative flex min-w-0 flex-col gap-4">
      <Pane
        title="Debate"
        className="@container"
        aside={
          turns.length
            ? `${plural(argued, "claim")} · ${plural(turns.length, "turn")} · every claim answers four critics`
            : "The Proponent states every claim first"
        }
      >
        {/* The six seats stand from the start; the turns fill in below them. */}
        <div className="mb-4 grid gap-2 @xl:grid-cols-2 @3xl:grid-cols-3">
          {DEBATE_SEATS.map(([a, asks]) => {
            const on = speaking === a;
            const said = turns.filter((x) => x.a === a).length;
            return (
              <span
                key={a}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ring-1 transition-colors duration-300",
                  on ? cn(AGENTS[a].soft, "ring-current/20") : "bg-muted/50 ring-transparent",
                )}
              >
                <AgentAvatar a={a} size="lg" />
                <span className="min-w-0 flex-1">
                  <b className={cn("block font-semibold", AGENTS[a].text)}>{AGENTS[a].name}</b>
                  <span className="text-muted-foreground">{asks}</span>
                </span>
                {on ? (
                  <span className="flex gap-0.5" role="status" aria-label="Speaking">
                    {[0, 1, 2].map((i) => (
                      <motion.i
                        key={i}
                        className={cn("size-1 rounded-full bg-current", AGENTS[a].text)}
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{said}</span>
                )}
              </span>
            );
          })}
        </div>
        {/* Narrow screens show one side at a time; wide ones show both. */}
        <div className="mb-3 flex @4xl:hidden gap-1 rounded-lg bg-muted/60 p-0.5" role="tablist">
          {(
            [
              ["conversation", "Conversation", "msg"],
              ["summary", "Summary", "list"],
            ] as const
          ).map(([id, label, icon]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              variant="ghost"
              size="sm"
              onClick={() => setView(id)}
              className={cn("relative flex-1", view === id && "hover:bg-transparent")}
            >
              {view === id && (
                <motion.span
                  layoutId="asw-debate-view-tab"
                  className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-foreground/10"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon n={icon} className="relative" />
              <span className="relative">{label}</span>
            </Button>
          ))}
        </div>
        <div className="grid @4xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] gap-5">
          <div
            role="tabpanel"
            aria-label="Conversation"
            className={cn("flex min-w-0 flex-col gap-3.5", view !== "conversation" && "@4xl:flex hidden")}
          >
            {THREADS.map((d) => (
              <ThreadSection
                key={d.id}
                th={d.id}
                turns={turns}
                byId={byId}
                replies={replies}
                newest={newest}
                live={live}
                flash={flash?.th === d.id ? flash.n : undefined}
              />
            ))}
          </div>
          <aside
            role="tabpanel"
            aria-label="Summary"
            className={cn(
              "-m-1 flex min-w-0 flex-col gap-3 p-1 @4xl:sticky @4xl:top-4 @4xl:max-h-[calc(100dvh-6rem)] @4xl:self-start @4xl:overflow-y-auto",
              view !== "summary" && "@4xl:flex hidden",
            )}
          >
            <Tally turns={turns} />
            <ul className="flex flex-col gap-2.5">
              {THREADS.map((d) => (
                <ThreadCard key={d.id} th={d.id} turns={turns} active={running && S.db.th === d.id} onFocus={focus} />
              ))}
            </ul>
            <RulingsCard turns={turns} />
            <p className="px-1 text-[11px] text-muted-foreground leading-snug">
              Positions come from each turn's stance, the turn it replies to and the Judge's rulings, not from tone.
              Every challenge needs a ground in the record; one without is struck.
            </p>
          </aside>
        </div>
      </Pane>
      <AgentCursor agent={speaking} host={host} target={newest ? `turn:${newest}` : null} version={turns.length} />
    </div>
  );
}
