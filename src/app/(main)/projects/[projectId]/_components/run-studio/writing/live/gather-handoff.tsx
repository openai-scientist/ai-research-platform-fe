"use client";
"use no memo";

/* ===== The intake: the run's output, part by part, checked (the preview's HandoffScene, on a live run) =====
   The screen reads top to bottom: what the intake did (its takeaway, its figures, the checks by result and by part,
   its five steps), what that means for the paper, then every part of the package beside the intake's checks on it,
   what the experiment found, the runs, and what the paper cannot use, named once per kind with the part it comes from;
   a critical item says who must settle it. */

import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import type { Erp } from "../data/erp";
import { emit, item, reveal, S, sleep, step } from "../engine";
import { canEnter, cn, Icon, M, RM, WorkOrb } from "../lib";
import { LOG_TONE, STATE_TEXT, StateMark } from "../scenes-gather";
import {
  allChecks,
  analysesOf,
  byId,
  criticalOf,
  deviationsOf,
  envRows,
  figuresOf,
  fmt3,
  fmtTime,
  gains,
  human,
  intakeParts,
  itemsName,
  kindMeans,
  type LimitGroup,
  limitGroups,
  listed,
  lowerFirst,
  meansOf,
  otherResults,
  ownerOf,
  type Part,
  packageFacts,
  planEvents,
  planFacts,
  plural,
  runFacts,
  sourceFacts,
  tidy,
  verdicts,
  verdictText,
} from "./gather-data";
import { type CheckState, FoundChart, groupTone, LimitsList, RunsHeatmap } from "./gather-handoff-board";
import { at, Fact, LiveTyped, SERIF, SubHead } from "./gather-kit";
import { need, pending, shown, streaming } from "./kit";
import { Bars, scrollSoon } from "./outline-kit";
import { file, LIVE } from "./run";
import type { Tone } from "./stage-kit";
import {
  type BarRow,
  SubHead as ChartHead,
  EffectList,
  Legend,
  ResultGrid,
  Section,
  SegmentBar,
  type Part as Slice,
  StageAccent,
  type Swatch,
  Takeaway,
} from "./stage-visual";
import type { IntakeIssue } from "./types";

type Check = Part["checks"][number];
const CHECK_ICON: Record<string, string> = { ok: "check", warn: "alert", bad: "x" };

/* ---------- where the intake is ---------- */
const running = () => S.st.S00?.status === "running";
function checkState(c: Check, made: number): CheckState {
  if (c.index < made) return c.status;
  if (running() && at("li.at") === c.index + 1) return "now";
  return "pending";
}
/** The critical items of the intake, by the part they come from. */
const criticalParts = (parts: Part[]) => criticalOf(file("IntakeIssues.json")?.issues ?? [], parts);
function partState(p: Part, made: number, parts: Part[]): { k: string; label: string } {
  if (!p.checks.length) return { k: "wait", label: pending("IntakeChecks.json") ? "Waiting" : "No checks" };
  const states = p.checks.map((c) => checkState(c, made));
  if (states.includes("now")) return { k: "now", label: "Checking" };
  if (states.includes("pending"))
    return { k: "wait", label: states.every((x) => x === "pending") ? "Waiting" : "Checking" };
  // Severity decides: a part with a critical item is not done until the one who owns it settles it.
  const crit = criticalParts(parts).find((c) => c.part === p.k);
  if (crit) return { k: "bad", label: `Needs ${ownerOf(crit.issue)}` };
  const bad = states.filter((x) => x === "bad").length;
  if (bad) return { k: "bad", label: `Failed · ${plural(bad, "check")}` };
  const notes = states.filter((x) => x === "warn").length;
  if (notes) return { k: "warn", label: `Done · ${plural(notes, "note")}` };
  return { k: "ok", label: "Done" };
}

/* ---------- what each part holds, read from the package ---------- */
/* The lock is the event that matters; a deviation is to look at; the rest are plain marks on the line. */
const EVENT_DOT: Record<string, string> = {
  plan: "bg-foreground",
  run: "bg-foreground/40",
  dev: "bg-amber-500",
  ana: "bg-foreground/40",
  pkg: "bg-foreground/40",
};
/* The protocol's events in order: the lock, the first run, each deviation, each analysis added, the package. */
function PlanTimeline({ erp }: { erp: Erp }) {
  const events = planEvents(erp);
  return (
    <ol
      className="relative grid gap-2.5 sm:grid-cols-[repeat(var(--n),minmax(0,1fr))] sm:gap-2"
      style={{ "--n": events.length } as React.CSSProperties}
    >
      <span
        aria-hidden="true"
        className="absolute top-[6px] h-px bg-border max-sm:hidden"
        style={{ left: `${50 / events.length}%`, right: `${50 / events.length}%` }}
      />
      {events.map((e, i) => (
        <M
          as="li"
          key={`${e.k}:${e.x}`}
          in="fade"
          delay={canEnter() ? i * 0.08 : 0}
          className="relative flex items-start gap-2.5 sm:flex-col sm:items-center sm:gap-1.5 sm:text-center"
        >
          <span className={cn("relative mt-0.5 size-3 shrink-0 rounded-full ring-4 ring-card", EVENT_DOT[e.k])} />
          <span className="min-w-0">
            <b className="block font-medium text-[12.5px] leading-tight">{e.x}</b>
            <span className="font-mono text-[11px] text-muted-foreground">{fmtTime(e.at)}</span>
            {e.sub && <span className="block text-[11px] text-muted-foreground leading-snug">{e.sub}</span>}
          </span>
        </M>
      ))}
    </ol>
  );
}

const CHECK_MARK: Record<string, string> = { met: "ok", violated: "warn", not_checked: "na" };
function ResultsDetail({ erp }: { erp: Erp }) {
  const vs = verdicts();
  const analyses = analysesOf(erp);
  const means = meansOf(erp);
  const others = otherResults(erp);
  const { checks, flags } = erp.results;
  return (
    <>
      <SubHead>Analyses</SubHead>
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-3 text-[13px] sm:grid-cols-[2.5rem_2.75rem_minmax(0,1fr)_auto]">
        {analyses.map((a) => {
          const v = a.h.map((h) => vs[h]).find(Boolean);
          const [label, tone] = v ? verdictText(v) : ["", "na"];
          return (
            <Fragment key={a.id}>
              <span className="border-t py-2 font-mono first:border-t-0">{a.id}</span>
              <span className="border-t py-2 font-mono text-muted-foreground max-sm:hidden">
                {a.h.join(" · ") || "—"}
              </span>
              <span className="min-w-0 border-t py-2">
                <span className="block text-muted-foreground text-xs">
                  {a.kind}
                  <span className="sm:hidden">{a.h.length ? ` · ${a.h.join(" · ")}` : ""}</span>
                </span>
                {a.what}
                {a.est && <span className="block font-mono text-muted-foreground text-xs">{a.est}</span>}
              </span>
              <span className={cn("border-t py-2 text-right", label ? STATE_TEXT[tone] : "text-muted-foreground")}>
                {label || "—"}
              </span>
            </Fragment>
          );
        })}
      </div>
      {means.cells.length > 0 && (
        <>
          <SubHead>Mean of each model over its runs</SubHead>
          <div
            className="grid items-baseline gap-x-3 text-[13px]"
            style={{ gridTemplateColumns: `minmax(4.5rem,1fr) repeat(${means.metrics.length}, minmax(0,1fr))` }}
          >
            <span />
            {means.metrics.map((m) => (
              <span key={m.metric_id} className="pb-1 text-right text-muted-foreground text-xs leading-tight">
                {m.name}
                <span className="block text-[11px]">
                  {m.direction === "higher" ? "higher is better" : "lower is better"}
                </span>
              </span>
            ))}
            {means.treatments.map((t) => (
              <Fragment key={t}>
                <span className="border-t py-1.5 font-mono text-xs">{t}</span>
                {means.metrics.map((m) => {
                  const c = means.cells.find((x) => x.t === t && x.m === m.metric_id);
                  return (
                    <span key={m.metric_id} className="border-t py-1.5 text-right font-mono tabular-nums">
                      {c ? fmt3(c.v) : "—"}
                    </span>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </>
      )}
      {others.length > 0 && (
        <>
          <SubHead>Other results</SubHead>
          <dl className="divide-y">
            {others.map((r) => (
              <Fact key={r.id} k={r.id}>
                {r.what}
                <span className="block font-mono text-muted-foreground text-xs">{r.v}</span>
              </Fact>
            ))}
          </dl>
        </>
      )}
      {checks.length > 0 && (
        <>
          <SubHead>Assumptions checked</SubHead>
          <ul className="flex flex-col gap-2 text-[13px]">
            {checks.map((c) => (
              <li key={c.check_id} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2 leading-5">
                <StateMark k={CHECK_MARK[c.status] ?? "na"} size="size-3.5" />
                <span className="min-w-0">
                  {c.assumption}
                  <span className="font-mono text-muted-foreground text-xs"> · {c.analysis_id}</span>
                  <span className="block text-muted-foreground text-xs leading-snug">
                    {human(c.status)} · {c.evidence}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {flags.length > 0 && (
        <>
          <SubHead>Flags</SubHead>
          <ul className="flex flex-col gap-2 text-[13px]">
            {flags.map((f) => (
              <li key={f.flag_id} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2 leading-5">
                <StateMark k={f.severity === "info" ? "na" : "warn"} size="size-3.5" />
                <span className="min-w-0">
                  {f.rationale}
                  <span className="block font-mono text-muted-foreground text-xs">
                    {human(f.severity)} · {f.affected_ids.join(", ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

const GATE_STATE: Record<string, string> = { passed: "ok", not_applicable: "na", waived: "warn", pending: "wait" };
function PartDetail({ k, erp, lit, issues }: { k: string; erp: Erp; lit: boolean; issues: IntakeIssue[] }) {
  switch (k) {
    case "package":
      return (
        <>
          <dl className="divide-y">
            {packageFacts(erp).map(([f, v]) => (
              <Fact key={f} k={f}>
                {v}
              </Fact>
            ))}
          </dl>
          <SubHead>Quality gates</SubHead>
          <ul className="grid gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-2">
            {erp.quality.gates.map((g) => (
              <li key={g.gate_id} className="flex min-w-0 items-start gap-2 leading-5" title={g.rationale ?? undefined}>
                <StateMark k={GATE_STATE[g.status] ?? "bad"} size="size-3.5" />
                <span className="w-10 shrink-0 font-mono text-muted-foreground text-xs leading-5">{g.gate_id}</span>
                <span className="min-w-0">
                  {g.name}
                  {g.rationale && (
                    <span className="block text-muted-foreground text-xs leading-snug">{g.rationale}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      );
    case "protocol": {
      const s = erp.protocol.specification;
      const [question, ...facts] = planFacts(erp);
      return (
        <>
          {question && <p className={cn(SERIF, "mb-3 text-pretty text-[16px] leading-snug")}>{question[1]}</p>}
          <dl className="divide-y">
            {facts.map(([f, v]) => (
              <Fact key={f} k={f}>
                {v}
              </Fact>
            ))}
          </dl>
          <SubHead>Order of events</SubHead>
          <PlanTimeline erp={erp} />
          <SubHead>Hypotheses</SubHead>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {[...s.hypotheses]
              .sort((a, b) => byId(a.hypothesis_id, b.hypothesis_id))
              .map((h) => (
                <li
                  key={h.hypothesis_id}
                  className={cn(
                    "grid grid-cols-[2rem_minmax(0,1fr)] gap-2",
                    h.status !== "planned" && "text-muted-foreground",
                  )}
                >
                  <span className="font-mono">{h.hypothesis_id}</span>
                  <span className="min-w-0">
                    {h.statement}
                    <span className="block text-xs">
                      {human(h.priority)}
                      {h.status === "deferred" ? ` · Deferred · ${h.reason ?? ""}` : ""}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
          {s.prior_knowledge.length > 0 && (
            <>
              <SubHead>What the team knew before the lock</SubHead>
              <ul className="flex list-disc flex-col gap-1 pl-4 text-[13px] marker:text-muted-foreground">
                {s.prior_knowledge.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </>
          )}
          {erp.protocol.amendments.length > 0 && (
            <>
              <SubHead>Amendments</SubHead>
              <dl className="divide-y">
                {erp.protocol.amendments.map((a) => (
                  <Fact key={a.amendment_id} k={`${a.amendment_id} · v${a.from_version}→v${a.to_version}`}>
                    {a.reason}
                    <span className="block text-muted-foreground text-xs">
                      {a.impact} · {fmtTime(a.at)}
                      {a.outcome_accessed ? " · outcomes had been seen" : ""}
                    </span>
                  </Fact>
                ))}
              </dl>
            </>
          )}
        </>
      );
    }
    case "environment":
      return (
        <dl className="divide-y">
          {envRows(erp).map(([f, v, sub]) => (
            <Fact key={`${f}:${v}`} k={f}>
              {v}
              {sub && <span className="block text-muted-foreground text-xs">{sub}</span>}
            </Fact>
          ))}
        </dl>
      );
    case "runs": {
      // The grid of runs and its counts are drawn above, in "The runs"; these are the facts it does not show.
      const shownAbove = new Set(["Attempts", "Splits"]);
      return (
        <dl className="divide-y">
          {runFacts(erp)
            .filter(([f]) => !shownAbove.has(f))
            .map(([f, v]) => (
              <Fact key={`${f}:${v}`} k={f}>
                {v}
              </Fact>
            ))}
        </dl>
      );
    }
    case "results":
      return <ResultsDetail erp={erp} />;
    case "deviations": {
      const ds = deviationsOf(erp);
      if (!ds.length)
        return <p className="text-[13px] text-muted-foreground">The package declares no deviation from the plan.</p>;
      return (
        <>
          {ds.map((d) => (
            <Fragment key={d.id}>
              <dl className="divide-y">
                <Fact k={d.id}>
                  Declared {d.when}
                  <span className="block text-muted-foreground text-xs">{d.kind}</span>
                </Fact>
                <Fact k="Change">
                  <span className="text-muted-foreground line-through">{d.plan}</span> → {d.ran}
                </Fact>
                <Fact k="Why">{d.why}</Fact>
                <Fact k="Affects">{d.affects}</Fact>
              </dl>
              {d.check.length > 0 && (
                <>
                  <SubHead>
                    As planned, run as a check
                    {d.unchanged != null && (d.unchanged ? " · verdicts unchanged" : " · verdicts changed")}
                  </SubHead>
                  <dl className="divide-y">
                    {d.check.map((r) => (
                      <Fact key={r.id} k={r.id}>
                        <span className="font-mono text-xs">{r.v}</span>
                        {r.asRun && (
                          <span className="block font-mono text-muted-foreground text-xs">as run {r.asRun}</span>
                        )}
                      </Fact>
                    ))}
                  </dl>
                </>
              )}
            </Fragment>
          ))}
        </>
      );
    }
    case "figures": {
      const fs = figuresOf(erp);
      if (!fs.length) return <p className="text-[13px] text-muted-foreground">The package holds no figure.</p>;
      return (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {fs.map((f) => (
            <li key={f.id} className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2.5 text-[13px]">
              <b className="font-medium">{f.id}</b>
              <span className="text-muted-foreground text-xs leading-snug">{f.t}</span>
              <span className="mt-1 font-mono text-[11px] text-muted-foreground">
                {human(f.chart)} · {f.rows} rows · from {f.src}
              </span>
            </li>
          ))}
        </ul>
      );
    }
    case "sources": {
      const rows = sourceFacts(issues);
      if (!rows.length)
        return (
          <p className="text-[13px] text-muted-foreground">
            The sources come from the research record; the evidence ledger lists each one.
          </p>
        );
      return (
        <dl className="divide-y">
          {rows.map(([f, v]) => (
            <Fact key={f} k={f}>
              {v}
            </Fact>
          ))}
        </dl>
      );
    }
    default:
      return <p className="text-[13px] text-muted-foreground">The intake checks this part as listed beside it.</p>;
  }
}

/* One check: what it asks, its mark once made, and the evidence it read. */
function CheckRow({ c, made }: { c: Check; made: number }) {
  const st = checkState(c, made);
  const done = st === "ok" || st === "warn" || st === "bad";
  return (
    <li data-cursor={`chk:${c.key}`} className="grid grid-cols-[1.125rem_minmax(0,1fr)] gap-2.5">
      <span className="grid h-5 place-items-center">
        {st === "now" ? (
          <WorkOrb state="working" size={16} />
        ) : done ? (
          <M as="span" key={st} in="pop8" dur={260} className="grid place-items-center">
            <Icon n={CHECK_ICON[st]} className={cn("size-4", LOG_TONE[st])} />
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
          {c.text}
        </span>
        {done && (
          <M as="span" in="fade" dur={300} className="block text-muted-foreground text-xs leading-snug">
            <LiveTyped text={tidy(c.evidence)} on={streaming("li.done", c.key)} />
          </M>
        )}
      </span>
    </li>
  );
}

/* One line that says what the intake is doing right now. */
function intakeNow(parts: Part[], groups: LimitGroup[]) {
  const st = S.st.S00;
  const erp = file("experiment_result.json");
  if (st?.cur === "a0")
    return `Opening ${erp?.erp_id ?? "the package"} · ${parts[Math.max(0, at("li.open") - 1)]?.n ?? ""}`;
  if (st?.cur === "a4") {
    const g = groups[Math.min(at("li.named"), groups.length - 1)];
    return g ? `Naming what the paper cannot use · ${g.head}` : null;
  }
  const c = allChecks(parts).find((x) => x.index === at("li.at") - 1);
  if (!c) return null;
  return `${parts.find((p) => p.k === c.part)?.n} · ${c.text}`;
}

/* A part's checks before the intake publishes them. */
function ChecksSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <li key={i} aria-hidden="true" className="grid grid-cols-[1.125rem_minmax(0,1fr)] gap-2.5">
          <span className="grid h-5 place-items-center">
            <span className="size-3 rounded-full border border-foreground/25 border-dashed" />
          </span>
          <span className="flex min-w-0 flex-col gap-1.5 pt-1.5">
            <Skeleton className={cn("h-2.5 animate-none rounded-full", i % 2 ? "w-3/5" : "w-4/5")} />
            <Skeleton className="h-2 w-2/5 animate-none rounded-full" />
          </span>
        </li>
      ))}
    </>
  );
}

/* A part's icon takes the colour of what the part came to; a part that is fine stays neutral. */
const PART_ICON: Record<string, string> = {
  ok: "bg-background text-muted-foreground ring-foreground/10",
  warn: "bg-amber-50 text-amber-700 ring-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300",
  bad: "bg-rose-50 text-rose-700 ring-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300",
  now: "bg-background text-foreground ring-foreground/35",
  wait: "bg-muted text-muted-foreground ring-transparent",
};
/* A part's state in words, in the one colour meaning. */
const PART_TEXT: Record<string, string> = {
  ok: "text-muted-foreground",
  warn: "text-amber-700 dark:text-amber-300",
  bad: "text-rose-700 dark:text-rose-300",
  now: "text-foreground",
  wait: "text-muted-foreground",
};

/* One part in the list: its number and name, and what it came to when that is more than done. */
function PartTab({
  p,
  index,
  made,
  parts,
  selected,
  opened,
  onPick,
}: {
  p: Part;
  index: number;
  made: number;
  parts: Part[];
  selected: boolean;
  opened: boolean;
  onPick(): void;
}) {
  const state = partState(p, made, parts);
  const passed = p.checks.filter((c) => checkState(c, made) === "ok").length;
  return (
    <button
      type="button"
      role="tab"
      id={`part-tab-${p.k}`}
      aria-selected={selected}
      aria-controls="part-panel"
      onClick={onPick}
      className={cn(
        "relative flex w-60 shrink-0 items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none transition-[background-color,opacity] duration-300 focus-visible:ring-2 focus-visible:ring-ring lg:w-full",
        selected ? "bg-muted" : "hover:bg-muted/50",
        !opened && "opacity-60",
      )}
    >
      {selected && (
        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-foreground max-lg:hidden" />
      )}
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md ring-1 transition-colors duration-500",
          PART_ICON[state.k],
        )}
      >
        <Icon n={p.icon} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-[11px] text-muted-foreground">{index + 1}</span>
          <b className="truncate font-medium text-[13px]">{p.n}</b>
        </span>
        <span className={cn("block truncate text-xs", PART_TEXT[state.k])}>
          {state.k === "ok" ? `${passed} of ${plural(p.checks.length, "check")} passed` : state.label}
        </span>
      </span>
    </button>
  );
}

/* The chosen part: what it is, its checks in one band, then what it holds. Its verdict is on its tab. */
function PartPanel({
  p,
  index,
  made,
  parts,
  erp,
  issues,
}: {
  p: Part;
  index: number;
  made: number;
  parts: Part[];
  erp: Erp | undefined;
  issues: IntakeIssue[];
}) {
  const n = p.checks.filter((c) => !["pending", "now"].includes(checkState(c, made))).length;
  return (
    <M
      key={p.k}
      in="fade"
      dur={220}
      id="part-panel"
      role="tabpanel"
      aria-labelledby={`part-tab-${p.k}`}
      data-sec={p.k}
      className="min-w-0 scroll-mt-4"
    >
      <header className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b bg-card px-5 pt-4 pb-3.5 lg:sticky lg:top-0 lg:z-10">
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-muted-foreground text-xs tabular-nums">
            Part {index + 1} of {parts.length}
            {p.checks.length > 0 && ` · ${n} of ${plural(p.checks.length, "check")} made`}
          </p>
          <h4 className="mt-0.5 font-semibold text-lg leading-tight">{p.n}</h4>
          {p.src ? (
            <p className="mt-0.5 text-muted-foreground text-sm">{p.src}</p>
          ) : (
            <Skeleton aria-hidden="true" className="mt-2 h-2.5 w-48 max-w-full animate-none rounded-full" />
          )}
        </div>
      </header>
      <ol
        aria-label={`Checks on ${p.n}`}
        className={cn(
          "@container grid gap-x-6 gap-y-3 border-b bg-muted/20 px-5 py-3.5",
          (p.checks.length >= 3 || (!p.checks.length && pending("IntakeChecks.json"))) && "@2xl:grid-cols-2",
        )}
      >
        {p.checks.length ? (
          p.checks.map((c) => <CheckRow key={c.key} c={c} made={made} />)
        ) : pending("IntakeChecks.json") ? (
          <ChecksSkeleton />
        ) : (
          <li className="text-muted-foreground text-xs">The intake made no check on this part.</li>
        )}
      </ol>
      <div className="min-w-0 px-5 py-4">
        {erp ? (
          <PartDetail
            k={p.k}
            erp={erp}
            issues={issues}
            lit={p.checks.some((c) => checkState(c, made) !== "pending") || S.st.S00?.status === "done"}
          />
        ) : (
          <div aria-hidden="true" className="flex flex-col gap-2">
            <Skeleton className="h-3 w-2/3 animate-none rounded-full" />
            <Skeleton className="h-3 w-1/2 animate-none rounded-full" />
            <Skeleton className="h-3 w-3/5 animate-none rounded-full" />
          </div>
        )}
      </div>
    </M>
  );
}

/* ---------- what the intake did: its figures, the checks by result and by part, and its five steps ---------- */
/** A check's state as a mark of the one colour system. */
const _CHECK_SWATCH: Record<CheckState, Swatch | "wait"> = {
  ok: "ok",
  warn: "look",
  bad: "bad",
  now: "wait",
  pending: "wait",
};
/** The checks made so far, by result, in the order of the chart: passed, passed with a note, failed. */
function checkSlices(checks: Check[], made: number): Slice[] {
  const by = (k: string) => checks.filter((c) => c.index < made && c.status === k).length;
  return [
    { key: "ok", label: "Passed", value: by("ok"), swatch: "ok" },
    { key: "warn", label: "Passed with a note", value: by("warn"), swatch: "look" },
    { key: "bad", label: "Failed", value: by("bad"), swatch: "bad" },
  ];
}
/** A kind of item the paper cannot use, in a word or two: the legend of its chart. */
const KIND_LABEL: Record<string, string> = {
  deferred_hypothesis: "Deferred",
  unused_input: "Not used",
  source_quarantined: "Quarantined",
  source_unresolved: "Unresolved",
  source_data_conflict: "In conflict",
  cite_only: "Cite-only",
};
const TONE_SWATCH: Record<Tone, Swatch> = { ok: "ok", look: "look", bad: "bad", none: "none" };
/** The intake's steps, as the track names them, and the part of the screen each one fills. */
const STEPS: { k: string; title: string; sel: string }[] = [
  { k: "a0", title: "Open the package", sel: "[data-parts]" },
  { k: "a1", title: "Check the package, protocol, data and environment", sel: "[data-parts]" },
  { k: "a2", title: "Check the runs and the results", sel: "[data-parts]" },
  { k: "a3", title: "Check the deviations, figures and sources", sel: "[data-parts]" },
  { k: "a4", title: "Name what the paper cannot use", sel: "[data-limits]" },
];
/** What each step came to, from the checks and the limits streamed so far. */
function stepResult(
  k: string,
  o: { parts: Part[]; made: number; open: number; groups: LimitGroup[]; named: number; items: number },
): { tone: Tone | "wait" | "now"; label: string } {
  const st = S.st.S00;
  const now = st?.status === "running" && st.cur === k;
  const over = st?.status === "done";
  const wait = (busy: string, idle: string) => ({
    tone: now ? ("now" as const) : ("wait" as const),
    label: now ? busy : idle,
  });
  if (k === "a0") {
    if (over || (o.parts.length > 0 && o.open >= o.parts.length))
      return { tone: "ok", label: `${plural(o.parts.length, "part")} read` };
    return wait(`${o.open} of ${o.parts.length} parts open`, "Not opened yet");
  }
  if (k === "a4") {
    if (pending("IntakeIssues.json") || o.named < o.groups.length)
      return wait(`${o.named} of ${plural(o.groups.length, "kind")} named`, "Not named yet");
    if (!o.items) return { tone: "ok", label: "Nothing to name" };
    return {
      tone: o.groups.some((g) => g.tone === "bad") ? "bad" : "look",
      label: `${plural(o.items, "item")} named, none filled in`,
    };
  }
  const cs = o.parts.filter((p) => p.step === k).flatMap((p) => p.checks);
  if (!cs.length) return wait("Checking", pending("IntakeChecks.json") ? "Not checked yet" : "No check");
  const madeHere = cs.filter((c) => c.index < o.made);
  if (madeHere.length < cs.length) return wait(`${madeHere.length} of ${cs.length} checks made`, "Not checked yet");
  const bad = cs.filter((c) => c.status === "bad").length;
  const notes = cs.filter((c) => c.status === "warn").length;
  if (bad) return { tone: "bad", label: `${plural(bad, "check")} failed` };
  if (notes) return { tone: "look", label: `${cs.length - notes} of ${cs.length} passed · ${plural(notes, "note")}` };
  return { tone: "ok", label: `All ${plural(cs.length, "check")} passed` };
}

/* ---------- the package opened: one compartment per part, each with a mark for every check made on it ---------- */
const MARK: Record<CheckState, { n: string; c: string }> = {
  ok: { n: "check", c: "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-emerald-950" },
  warn: { n: "alert", c: "bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950" },
  bad: { n: "x", c: "bg-rose-500 text-white dark:bg-rose-400 dark:text-rose-950" },
  now: { n: "play", c: "bg-sky-500 text-white animate-pulse motion-reduce:animate-none" },
  pending: { n: "minus", c: "bg-foreground/[0.07] text-transparent" },
};
const COMPARTMENT: Record<string, string> = {
  bad: "ring-rose-300 bg-rose-50/50 dark:ring-rose-800 dark:bg-rose-950/20",
  warn: "ring-amber-300 bg-amber-50/40 dark:ring-amber-800 dark:bg-amber-950/15",
  ok: "ring-emerald-200 dark:ring-emerald-900",
};
function PackageBox({
  parts,
  made,
  shownPart,
  onPick,
}: {
  parts: Part[];
  made: number;
  shownPart?: string;
  onPick(k: string): void;
}) {
  return (
    <div className="rounded-xl border-2 border-foreground/15 border-dashed p-2.5">
      <p className="flex items-center gap-2 px-1 pb-2 font-semibold text-[11.5px] text-muted-foreground uppercase tracking-wide">
        <Icon n="package" className="size-3.5" /> The package the experiment run handed over
      </p>
      <ul className="grid gap-2 @xl:grid-cols-2 @4xl:grid-cols-3">
        {parts.map((p) => {
          const st = partState(p, made, parts);
          return (
            <li key={p.k}>
              <button
                type="button"
                onClick={() => onPick(p.k)}
                className={cn(
                  "flex h-full w-full flex-col gap-2 rounded-lg bg-card px-3 py-2.5 text-left ring-1 transition-colors hover:bg-muted/40",
                  COMPARTMENT[st.k] ?? "ring-foreground/10",
                  shownPart === p.k && "outline-2 outline-sky-400 outline-offset-1",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted">
                    <Icon n={p.icon} className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[13.5px]">{p.n}</span>
                    <span
                      className={cn(
                        "block text-[12px]",
                        st.k === "bad"
                          ? "font-medium text-rose-700 dark:text-rose-300"
                          : st.k === "warn"
                            ? "font-medium text-amber-700 dark:text-amber-300"
                            : "text-muted-foreground",
                      )}
                    >
                      {st.label}
                    </span>
                  </span>
                </span>
                {p.checks.length > 0 && (
                  <span className="flex flex-wrap gap-1" aria-hidden="true">
                    {p.checks.map((c) => {
                      const s = checkState(c, made);
                      return (
                        <span
                          key={c.key}
                          title={`${c.text}: ${s === "ok" ? "passed" : s === "warn" ? "passed with a note" : s === "bad" ? "failed" : "not made yet"}`}
                          className={cn("grid size-5 place-items-center rounded-md transition-colors", MARK[s].c)}
                        >
                          <Icon n={MARK[s].n} className="size-3" sw={3} />
                        </span>
                      );
                    })}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HandoffLive({ live }: { live: boolean }) {
  const st = S.st.S00;
  const erp = file("experiment_result.json");
  const issues = file("IntakeIssues.json")?.issues ?? [];
  const parts = intakeParts();
  const checks = allChecks(parts);
  const groups = limitGroups(issues, parts);
  const done = st?.status === "done";
  const failed = S.lifecycle === "failed" && !done;
  const checksIn = !pending("IntakeChecks.json");
  const issuesIn = !pending("IntakeIssues.json");
  const open = done ? parts.length : Math.min(parts.length, at("li.open"));
  const made = shown("S00", "li.done", checks.length);
  const named = shown("S00", "li.named", groups.length);
  // The part on show: the one a person picked; else the one being checked; else the first that needs someone.
  const [picked, setPicked] = useState<{ run: unknown; k: string | null }>({ run: S, k: null });
  const current = allChecks(parts).find((c) => c.index === at("li.at") - 1)?.part;
  const needs = (k: string) => parts.find((p) => partState(p, made, parts).k === k)?.k;
  const auto =
    st?.status === "running" ? (current ?? parts[Math.max(0, open - 1)]?.k) : (needs("bad") ?? needs("warn"));
  const shownPart = (picked.run === S ? picked.k : null) ?? auto ?? parts[0]?.k;
  const index = Math.max(
    0,
    parts.findIndex((p) => p.k === shownPart),
  );
  // On a narrow screen the parts scroll sideways: keep the part on show in sight. A part opens at its top.
  const tabs = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: follows the part on show
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
    const list = tabs.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el || list.scrollWidth <= list.clientWidth) return;
    const left = list.scrollLeft + el.getBoundingClientRect().left - list.getBoundingClientRect().left - 8;
    list.scrollTo({ left, behavior: RM() ? "auto" : "smooth" });
  }, [shownPart]);
  // A part named elsewhere (a limit's "show the part", a step): show it and bring the parts into view.
  const pick = (k: string) => {
    setPicked({ run: S, k });
    scrollSoon("[data-parts]");
  };

  /* ----- the takeaway: what arrived, how many checks passed, what the paper may not use, what blocks ----- */
  const count = (k: CheckState) => checks.filter((c) => c.index < made && c.status === k).length;
  const crit = named >= groups.length ? criticalParts(parts) : [];
  const itemsOf = (g: LimitGroup) => g.reasons.reduce((m, r) => m + r.ids.length, 0);
  const items = groups.reduce((n, g) => n + itemsOf(g), 0);
  const itemsNamed = groups.slice(0, named).reduce((n, g) => n + itemsOf(g), 0);
  const passed = count("ok");
  const _blocking = crit.length + count("bad");
  const owners = listed([...new Set(crit.map((c) => ownerOf(c.issue)))]);
  const ready = (done && checksIn && issuesIn) || failed;
  const _allMade = done || (checks.length > 0 && made >= checks.length);
  const _allNamed = done || (issuesIn && named >= groups.length);
  const status = erp?.status ?? "";
  let headline: ReactNode = `${status === "complete" ? "Received complete" : `Received ${status}`.trim()}: ${
    items ? `the paper may use everything except ${plural(items, "item")}.` : "the paper may use all of it."
  }`;
  if (crit.length)
    headline = `${headline} ${listed(crit.map((c) => c.issue.id))} ${crit.length === 1 ? "is" : "are"} held until ${owners} ${crit.length === 1 ? "settles it" : "settle them"}.`;
  if (count("bad")) headline = `${headline} ${plural(count("bad"), "check")} failed.`;
  if (failed) headline = `The intake stopped: ${S.failure}`;
  const _noted = parts
    .filter((p) => p.checks.some((c) => c.index < made && c.status === "warn"))
    .map((p) => p.n.toLowerCase());
  const _slices = checkSlices(checks, made);
  const _rows: BarRow[] = parts.map((p) => {
    const state = partState(p, made, parts);
    const notes = p.checks.filter((c) => c.index < made && c.status !== "ok").length;
    return {
      key: p.k,
      name: p.n,
      label: p.n,
      parts: checkSlices(p.checks, made),
      total: p.checks.length,
      end:
        state.k === "bad" ? (
          <span className="font-medium text-rose-700 dark:text-rose-300">{state.label}</span>
        ) : notes ? (
          <span className="font-medium text-amber-700 dark:text-amber-300">{plural(notes, "note")}</span>
        ) : p.checks.length ? (
          plural(p.checks.length, "check")
        ) : (
          "No check"
        ),
    };
  });
  // What the paper cannot use, by kind, as it is named.
  const limitSlices: Slice[] = groups.map((g, i) => ({
    key: g.kind,
    label: KIND_LABEL[g.kind] ?? human(g.kind),
    value: i < named ? itemsOf(g) : 0,
    swatch: TONE_SWATCH[groupTone(g)],
  }));
  const effects = groups.slice(0, named).map((g) => ({
    key: g.kind,
    item: itemsName(
      g.kind,
      g.reasons.flatMap((r) => r.ids),
    ),
    // A critical item says who must settle it; the kind's own meaning comes first.
    effect: `${lowerFirst(kindMeans(g.kind) && g.means !== kindMeans(g.kind) ? `${kindMeans(g.kind)}; ${lowerFirst(g.means)}` : g.means)}.`,
    tone: groupTone(g),
  }));

  // Each visual fills as the checks of its part are made.
  const begun = (k: string) =>
    done || parts.find((p) => p.k === k)?.checks.some((c) => checkState(c, made) !== "pending");
  const playing = live && st?.status === "running";
  const now = playing && checksIn ? intakeNow(parts, groups) : null;
  const nowIn = (k: string[]) => (playing && st?.cur && k.includes(st.cur) ? now : null);
  return (
    <StageAccent accent="sky">
      <div className="relative flex min-w-0 flex-col gap-5">
        <Section
          icon="target"
          title="What this stage did"
          tells="The intake opened the package the experiment run handed over, checked each of its parts, and named what the paper cannot use."
          data-out="IntakeChecks.json"
          data-overview
        >
          <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
            <Takeaway ready={ready}>{headline}</Takeaway>
            <PackageBox parts={parts} made={made} shownPart={shownPart} onPick={pick} />
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
              <span>
                <b className="font-semibold text-foreground tabular-nums">{passed}</b> of {checks.length} checks passed
              </span>
              <span>
                <b className="font-semibold text-foreground tabular-nums">{count("warn")}</b> passed with a note
              </span>
              <span>
                <b className="font-semibold text-foreground tabular-nums">{count("bad")}</b> failed
              </span>
              <span>
                <b className="font-semibold text-foreground tabular-nums">{itemsNamed}</b> items the paper may not use
              </span>
              <span>Each square is one check. Click a part to open it below.</span>
            </p>
            <div className="flex flex-col gap-2">
              <ChartHead
                title="The five steps"
                tells="Each step of the intake in order, with what it came to. Click one to read it in full."
              />
              <ResultGrid
                items={STEPS.map((x) => {
                  const r = stepResult(x.k, { parts, made, open, groups, named, items });
                  const first = parts.find((p) => p.step === x.k)?.k;
                  return {
                    key: x.k,
                    title: x.title,
                    result: r.label,
                    tone: r.tone,
                    onPick: () => (first ? pick(first) : scrollSoon(x.sel)),
                  };
                })}
              />
            </div>
          </div>
        </Section>

        <Section
          icon="pen"
          title="What it means for the paper"
          tells="What the paper may not use from the package, and why. None of it is filled in or guessed."
          aside={issuesIn && items ? plural(items, "item") : undefined}
        >
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            {issuesIn && named > 0 ? (
              items ? (
                <>
                  <div className="flex flex-col gap-2.5">
                    <ChartHead
                      title={`The ${plural(items, "item")} the paper cannot use, by kind`}
                      tells="Red is blocked, amber is cited with care, grey is simply not claimed."
                    />
                    <SegmentBar parts={limitSlices} total={items} label="What the paper cannot use, by kind" />
                    <Legend parts={limitSlices.filter((s) => s.value > 0)} total={items} />
                  </div>
                  <EffectList items={effects} />
                </>
              ) : (
                <p className="text-[13.5px] text-muted-foreground">The paper may use everything the run handed over.</p>
              )
            ) : (
              <Bars n={3} last="w-1/2" className="py-1" />
            )}
          </div>
        </Section>

        {/* The parts as an inspector: the eight down the side, the chosen one's checks and contents beside them. */}
        <Section
          icon="package"
          title="Each part of the package and its checks"
          tells="The intake checks every part against the locked protocol. Pick a part to read its checks, then what it holds."
          now={nowIn(["a0", "a1", "a2", "a3"])}
          aside={
            checks.length
              ? made < checks.length
                ? `${made} of ${checks.length} made`
                : plural(checks.length, "check")
              : undefined
          }
        >
          <div data-parts data-board className="grid min-w-0 scroll-mt-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <div
              ref={tabs}
              role="tablist"
              aria-label="Parts of the package"
              aria-orientation="vertical"
              className="flex gap-1 overflow-x-auto border-b p-2 [scrollbar-width:thin] lg:flex-col lg:overflow-visible lg:border-b-0"
            >
              {parts.map((p, i) => (
                <PartTab
                  key={p.k}
                  p={p}
                  index={i}
                  made={made}
                  parts={parts}
                  selected={p.k === shownPart}
                  opened={done || i < open}
                  onPick={() => setPicked({ run: S, k: p.k })}
                />
              ))}
            </div>
            {/* The card keeps the height of the list of parts; a long part scrolls inside it. */}
            {parts[index] && (
              <div className="relative min-w-0 lg:border-l">
                <div
                  ref={panel}
                  className="overscroll-contain [scrollbar-width:thin] lg:absolute lg:inset-0 lg:overflow-y-auto"
                >
                  <PartPanel p={parts[index]} index={index} made={made} parts={parts} erp={erp} issues={issues} />
                </div>
              </div>
            )}
          </div>
        </Section>

        {erp && (
          <Section
            icon="flask"
            title="What the experiment found"
            tells="Each planned comparison's estimate and its interval against the line of no difference, with its hypothesis's verdict. The data report reads it next."
            aside={plural(gains(erp).length, "comparison")}
          >
            <FoundChart erp={erp} drawn={Boolean(begun("results"))} bare />
          </Section>
        )}
        {erp && (
          <Section
            icon="list"
            title="The runs"
            tells="Every planned job, model by seed. A run the intake flagged is amber; one that did not complete is red."
            aside={plural(erp.execution.runs.length, "run")}
          >
            <RunsHeatmap erp={erp} issues={issues} lit={Boolean(begun("runs"))} />
          </Section>
        )}
        <Section
          icon="ban"
          title="What the paper cannot use, and why"
          tells="Each item with the reason the intake gives and, for a critical one, who must settle it."
          now={nowIn(["a4"])}
          aside={
            issuesIn
              ? named < groups.length
                ? `${named} of ${groups.length} named`
                : plural(items, "item")
              : undefined
          }
        >
          <LimitsList
            groups={groups}
            named={named}
            naming={live && st?.cur === "a4" && st.status === "running"}
            issuesIn={issuesIn}
            streamingKind={(kind) => streaming("li.named", kind)}
            onPick={pick}
          />
        </Section>
      </div>
    </StageAccent>
  );
}

/* ---------- how the stage plays: the parts open, the checks are made one by one, then the limits are named ---------- */
function checkLine(ps: Part[]) {
  return ps
    .filter((p) => p.checks.length)
    .map((p) => {
      const ok = p.checks.filter((c) => c.status === "ok").length;
      const notes = p.checks.filter((c) => c.status !== "ok").map((c) => `${c.text}: ${tidy(c.evidence)}`);
      return `${p.n}: ${ok} of ${p.checks.length} passed.${notes.length ? ` ${notes.join(". ")}.` : ""}`;
    })
    .join(" ")
    .replace(/\.\./g, ".");
}
async function checkParts(ps: Part[]) {
  for (const p of ps) {
    // The board shows the checks as they are made; the plot and the runs fill as their parts are checked.
    reveal(p.k === "results" ? "[data-found]" : p.k === "runs" ? "[data-runs]" : "[data-board]");
    for (const c of p.checks) {
      S.n["li.at"] = c.index + 1;
      emit();
      await sleep(300);
      await item("li.done", c.index, {
        id: c.key,
        text: tidy(c.evidence),
        actor: "code",
        wait: c.status === "ok" ? 140 : 420,
      });
    }
  }
  S.n["li.at"] = 0;
}
export async function playIntake() {
  // The intake publishes its checks and its limits together, when its code checks are done.
  if (!(await need("S00", "IntakeChecks.json", "IntakeIssues.json"))) return;
  const erp = file("experiment_result.json");
  const parts = intakeParts();
  const groups = limitGroups(file("IntakeIssues.json")?.issues ?? [], parts);
  await step(
    "S00",
    "a0",
    async () => {
      for (let i = 1; i <= parts.length; i++) {
        S.n["li.open"] = i;
        emit();
        await sleep(150);
      }
    },
    {
      text: erp
        ? `${erp.erp_id} v${erp.version}, built by ${erp.generated_by} on ${fmtTime(erp.generated_at)}, read in ${plural(parts.length, "part")}: ${parts.map((p) => p.n.toLowerCase()).join(", ")}.`
        : `The package is read in ${plural(parts.length, "part")}.`,
    },
  );
  for (const sid of ["a1", "a2", "a3"] as const) {
    const ps = parts.filter((p) => p.step === sid);
    await step("S00", sid, () => checkParts(ps), { text: checkLine(ps) || "No check on these parts." });
  }
  await step(
    "S00",
    "a4",
    async () => {
      for (let i = 0; i < groups.length; i++) {
        if (i === 0) reveal("[data-limits]");
        await sleep(400);
        const g = groups[i];
        await item("li.named", i, { id: g.kind, text: g.head + g.reasons.map((r) => r.why).join(""), wait: 500 });
      }
    },
    {
      text: groups.length
        ? `${groups.map((g) => g.head).join(". ")}. Nothing is filled in.`
        : "Nothing the paper cannot use.",
    },
  );
}
export function intakeSummary() {
  const parts = intakeParts();
  const checks = allChecks(parts);
  const issues = file("IntakeIssues.json")?.issues ?? [];
  if (!checks.length) {
    // The files are late: say what the step reported when it was done.
    const r = LIVE.summary.S00 as { erp_id?: string; version?: number; checks?: number; warnings?: number } | undefined;
    return r?.checks != null
      ? `${r.erp_id ?? "The package"} v${r.version ?? 1} read: ${plural(r.checks, "check")}, ${plural(r.warnings ?? 0, "note")}.`
      : "The intake read the package.";
  }
  const n = (k: string) => checks.filter((c) => c.status === k).length;
  return `${plural(checks.length, "check")} on ${plural(parts.length, "part")}: ${n("ok")} passed, ${plural(n("warn"), "note")}${n("bad") ? `, ${n("bad")} failed` : ""}; ${plural(issues.length, "limit")} on the paper named, none filled in.`;
}
