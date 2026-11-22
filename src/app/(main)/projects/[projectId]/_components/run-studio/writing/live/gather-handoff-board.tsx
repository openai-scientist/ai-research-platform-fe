"use client";
"use no memo";

/* ===== The visuals of the intake: what the paper cannot use, what the experiment found, and the runs as a heatmap.
   Each is drawn in place first and fills as the intake's checks stream. The experiment's findings are shown again on
   the data report, where the verdicts are set. */

import { Fragment, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import type { Erp } from "../data/erp";
import { erpCounts } from "../data/erp";
import { canEnter, cn, Icon, M, WorkOrb } from "../lib";
import {
  cap,
  fmt3,
  fmtCi,
  gains,
  itemsName,
  kindTone,
  type LimitGroup,
  listed,
  verdicts,
  verdictText,
} from "./gather-data";
import { CARD, LiveTyped, Pill, SectionHead } from "./gather-kit";
import { TONE, type Tone } from "./stage-kit";
import { Term } from "./term";
import type { IntakeIssue } from "./types";

export type CheckState = "pending" | "now" | "ok" | "warn" | "bad";

/* ---------- what the paper cannot use: grouped by kind, a marker of its meaning per group ---------- */
const MARKER: Record<Tone, string> = {
  bad: "border-rose-500",
  look: "border-amber-500",
  none: "border-foreground/25",
  ok: "border-emerald-500",
};
/** A group's meaning: an item someone must settle is blocked; otherwise its kind's meaning for the paper. */
export const groupTone = (g: LimitGroup): Tone => (g.tone === "bad" ? "bad" : kindTone(g.kind));
const KIND_TERM: Record<string, string> = {
  source_quarantined: "quarantined",
  source_unresolved: "unresolved",
  cite_only: "cite-only",
};
export function LimitsList({
  groups,
  named,
  naming,
  issuesIn,
  streamingKind,
  onPick,
}: {
  groups: LimitGroup[];
  named: number;
  naming: boolean;
  issuesIn: boolean;
  streamingKind(kind: string): boolean;
  onPick(part: string): void;
}) {
  return (
    <ul data-limits data-out="IntakeIssues.json" className="flex scroll-mt-4 flex-col gap-4 px-4 py-4 sm:px-5">
      {issuesIn
        ? groups.map((g, n) => {
            const on = n < named;
            const tone = groupTone(g);
            const ids = g.reasons.flatMap((r) => r.ids);
            const typing = streamingKind(g.kind);
            return (
              <li
                key={g.kind}
                data-cursor={`limit:${g.kind}`}
                aria-hidden={on ? undefined : true}
                className={cn("relative border-l-2 pl-3", MARKER[tone])}
              >
                <div className={cn("transition-opacity duration-300", !on && "opacity-0")}>
                  <b className="block font-semibold text-sm leading-snug">
                    <LiveTyped text={itemsName(g.kind, ids)} on={typing} />
                  </b>
                  <p className={cn("text-[13px] leading-snug", tone === "bad" ? TONE.bad.text : "text-foreground")}>
                    {g.means}
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1.5 text-[13px] text-muted-foreground leading-snug">
                    {g.reasons.map((r) => (
                      <li key={`${r.ids[0]}:${r.why}`} className="min-w-0">
                        {g.reasons.length > 1 || r.ids.length < ids.length ? (
                          <span className="mr-1.5 font-mono text-xs">{r.ids.join(", ")}</span>
                        ) : null}
                        <span className="text-pretty break-words">{cap(r.why)}</span>
                        {r.meta.length > 0 && (
                          <span className="mt-0.5 block text-xs">
                            {r.meta.map(([k, v], i) => (
                              <span key={k}>
                                {i > 0 && " · "}
                                {i > 0 ? k.toLowerCase() : k}{" "}
                                <b
                                  className={cn(
                                    "font-medium",
                                    k === "Severity" && v === "critical" ? TONE.bad.text : "text-foreground",
                                  )}
                                >
                                  {v}
                                </b>
                              </span>
                            ))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-muted-foreground text-xs">
                    {KIND_TERM[g.kind] && <Term t={KIND_TERM[g.kind]}>What “{KIND_TERM[g.kind]}” means</Term>}
                    {g.part && (
                      <button
                        type="button"
                        tabIndex={on ? undefined : -1}
                        onClick={() => g.part && onPick(g.part)}
                        className="underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Show the part it comes from
                      </button>
                    )}
                  </p>
                </div>
                {!on && (
                  <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-2 pt-1 pl-3">
                    <span className="flex items-center gap-2">
                      {naming && n === named && <WorkOrb state="working" size={16} />}
                      <Skeleton className="h-2.5 w-1/2 animate-none rounded-full" />
                    </span>
                    <Skeleton className="h-2 w-3/4 animate-none rounded-full" />
                  </div>
                )}
              </li>
            );
          })
        : [0, 1, 2, 3].map((i) => (
            <li key={i} aria-hidden="true" className="flex flex-col gap-2 border-foreground/10 border-l-2 pl-3">
              <Skeleton className={cn("h-2.5 animate-none rounded-full", i % 2 ? "w-2/5" : "w-1/2")} />
              <Skeleton className="h-2 w-3/4 animate-none rounded-full" />
              <Skeleton className={cn("h-2 animate-none rounded-full", i % 2 ? "w-1/2" : "w-2/3")} />
            </li>
          ))}
    </ul>
  );
}

/* ---------- what the experiment found: one row per planned comparison, the interval against its null ---------- */
interface Row {
  id: string;
  label: string;
  hyp: string[];
  v: number;
  lo: number;
  hi: number;
  nul: number;
}
/** Ticks a reader can count: about five across the span. */
function ticksOf(lo: number, hi: number) {
  const raw = (hi - lo) / 5 || 0.01;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const a = Math.floor(lo / step) * step;
  const b = Math.ceil(hi / step) * step;
  return { a, b, step, ticks: Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step) };
}
const tickText = (t: number, step: number) => {
  const d = Math.max(0, Math.min(3, Math.ceil(-Math.log10(step) + 0.001)));
  if (Math.abs(t) < 1e-9) return "0";
  const s = Math.abs(t).toFixed(d);
  return t < 0 ? `−${s}` : s;
};
/** A hypothesis by its plain name first: "Hypothesis 1 (H1)". */
export const hypName = (h: string) => {
  const m = /^H(\d+)$/.exec(h);
  return m ? `Hypothesis ${m[1]} (${h})` : h;
};
const ROW_GRID = "sm:grid-cols-[14rem_minmax(0,1fr)_7rem_7.5rem]";
function PlotRow({
  r,
  x,
  verdict,
  light,
  drawn,
  delay,
}: {
  r: Row;
  x(v: number): number;
  verdict?: [string, string];
  light?: boolean;
  drawn: boolean;
  delay: number;
}) {
  const crosses = r.lo <= r.nul && r.hi >= r.nul;
  // The interval's meaning: clear of the null holds (green), across it is to look at (amber); exploratory is grey.
  const tone: Tone = light ? "none" : crosses ? "look" : "ok";
  return (
    <li className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t py-3", ROW_GRID)}>
      <span className="col-span-2 min-w-0 sm:col-span-1">
        <b className={cn("block font-medium text-sm leading-snug", light && "font-normal")}>{r.label}</b>
        <span className="mt-0.5 block text-muted-foreground text-xs leading-snug">
          {r.hyp.length ? `Tests ${listed(r.hyp.map(hypName))}` : null}
          {r.hyp.length ? " · " : null}
          <span className="font-mono">{r.id}</span>
        </span>
      </span>
      <span
        className="relative col-span-2 h-8 sm:col-span-1"
        role="img"
        aria-label={`${r.label}: ${fmt3(r.v)}, interval ${fmt3(r.lo)} to ${fmt3(r.hi)}`}
      >
        <span className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${x(r.nul)}%` }} />
        {drawn ? (
          <>
            <M
              as="span"
              in="grow"
              delay={canEnter() ? delay : 0}
              className={cn("absolute top-[calc(50%-3px)] h-1.5 origin-left rounded-full opacity-60", TONE[tone].dot)}
              style={{ left: `${x(r.lo)}%`, width: `${Math.max(0.5, x(r.hi) - x(r.lo))}%` }}
            />
            <M
              as="span"
              in="pop8"
              delay={canEnter() ? delay + 0.25 : 0}
              className={cn("absolute top-[calc(50%-7px)] size-3.5 rounded-full ring-2 ring-card", TONE[tone].dot)}
              style={{ left: `calc(${x(r.v)}% - 7px)` }}
            />
          </>
        ) : (
          <Skeleton className="absolute top-[calc(50%-3px)] left-[20%] h-1.5 w-3/5 animate-none rounded-full" />
        )}
      </span>
      <span className="font-mono tabular-nums leading-tight sm:text-right">
        {drawn ? (
          <>
            <b className="font-semibold text-[15px]">{fmt3(r.v)}</b>
            <span className="block text-muted-foreground text-xs">{fmtCi(r.lo, r.hi)}</span>
          </>
        ) : (
          <Skeleton className="h-3 w-14 animate-none rounded-full sm:ml-auto" />
        )}
      </span>
      <span className="flex justify-end">
        {drawn && verdict ? (
          <Pill k={verdict[1]}>{verdict[0]}</Pill>
        ) : (
          !drawn && <Skeleton className="h-4 w-16 animate-none rounded-full" />
        )}
      </span>
    </li>
  );
}
/** The legend of the chart: what an interval's colour means. */
function FoundKey() {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
      <span className="inline-flex items-center gap-1.5">
        <span className={cn("size-2.5 rounded-full", TONE.ok.dot)} />
        Interval clear of 0
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={cn("size-2.5 rounded-full", TONE.look.dot)} />
        Includes 0
      </span>
    </span>
  );
}
/**
 * What the experiment found, as one chart: each planned comparison's estimate and interval against the line of no
 * difference, with its hypothesis's verdict; the exploratory analyses under it, lighter. `bare`: without its card, to
 * sit inside a fold.
 */
export function FoundChart({ erp, drawn, bare }: { erp: Erp; drawn: boolean; bare?: boolean }) {
  const vs = verdicts();
  const planned: Row[] = gains(erp).map((g) => ({
    id: g.id,
    label: g.what,
    hyp: g.h ? g.h.split(" · ") : [],
    v: g.v,
    lo: g.lo,
    hi: g.hi,
    nul: g.nul,
  }));
  const metric = gains(erp)[0]?.metric ?? "";
  const level = gains(erp)[0]?.level;
  // Exploratory analyses: those with an interval are drawn on the same axis, lighter; the rest are named with their value.
  const explAnalyses = [...erp.protocol.specification.analyses, ...erp.results.added_analyses].filter(
    (a) => a.analysis_class !== "confirmatory",
  );
  const explRows: Row[] = [];
  const explText: { id: string; what: string; v: string; added: boolean }[] = [];
  for (const a of explAnalyses) {
    const c = erp.results.comparisons.find((x) => x.analysis_id === a.analysis_id && x.role === "primary");
    const added = "added_at" in a;
    if (c && c.ci_low != null && c.ci_high != null)
      explRows.push({
        id: c.comparison_id,
        label: c.label,
        hyp: [],
        v: c.estimate,
        lo: c.ci_low,
        hi: c.ci_high,
        nul: 0,
      });
    else {
      const ds = erp.results.descriptives.filter((d) => d.analysis_id === a.analysis_id);
      const v =
        ds.length > 1
          ? `${ds.length} groups, ${fmt3(Math.min(...ds.map((d) => d.value)))} to ${fmt3(Math.max(...ds.map((d) => d.value)))}`
          : ds[0]
            ? `${fmt3(ds[0].value)} · ${ds[0].unit}${ds[0].n != null ? `, n ${ds[0].n.toLocaleString("en")}` : ""}`
            : "";
      explText.push({ id: a.analysis_id, what: a.estimand, v, added });
    }
  }
  const all = [...planned, ...explRows];
  if (!all.length && !explText.length) return null;
  const {
    a: lo,
    b: hi,
    step,
    ticks,
  } = ticksOf(Math.min(...all.map((r) => Math.min(r.lo, r.nul))), Math.max(...all.map((r) => Math.max(r.hi, r.nul))));
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const verdictOf = (r: Row): [string, string] | undefined => {
    const v = r.hyp.map((h) => vs[h]).find(Boolean);
    return v ? verdictText(v) : undefined;
  };
  const crossing = planned.filter((r) => r.lo <= r.nul && r.hi >= r.nul);
  const axis = (
    <li aria-hidden="true" className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-t pt-2", ROW_GRID)}>
      <span className="max-sm:hidden" />
      <span className="relative col-span-2 h-4 font-mono text-[11px] text-muted-foreground sm:col-span-1">
        {ticks.map((t, i) => (
          // On a phone every other tick is labelled, so the labels never run into each other.
          <span
            key={t}
            // The end ticks sit inside the axis, so their labels never run past the card's edge.
            className={cn(
              "absolute whitespace-nowrap",
              i === 0 ? "translate-x-0" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
              i % 2 === 1 && i !== ticks.length - 1 && "max-sm:hidden",
            )}
            style={{ left: `${x(t)}%` }}
          >
            {tickText(t, step)}
          </span>
        ))}
      </span>
    </li>
  );
  const purpose = `${metric}: each planned comparison, target minus control, with its ${level ? `${Math.round(level * 100)}% ` : ""}interval against the line of no difference.`;
  const body = (
    <div className="px-4 pt-1 pb-4 sm:px-5">
      {bare && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-3 pb-1">
          <p className="text-pretty text-muted-foreground text-xs">{purpose}</p>
          <FoundKey />
        </div>
      )}
      <ul className="[&>li:first-child]:border-t-0">
        {planned.map((r, i) => (
          <PlotRow key={r.id} r={r} x={x} verdict={verdictOf(r)} drawn={drawn} delay={i * 0.15} />
        ))}
        {axis}
      </ul>
      {crossing.length > 0 && drawn && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          The {crossing.length === 1 ? "interval" : "intervals"} of {listed(crossing.map((r) => r.id))}{" "}
          {crossing.length === 1 ? "includes" : "include"} 0: no clear difference, which is not evidence of none.
        </p>
      )}
      {(explRows.length > 0 || explText.length > 0) && (
        <div className="mt-4 rounded-lg bg-muted/50 px-3 pt-2.5 pb-1">
          <h4 className="font-medium text-muted-foreground text-xs">
            Exploratory: a note in the paper, never a finding
          </h4>
          <ul className="[&>li:first-child]:border-t-0">
            {explRows.map((r, i) => (
              <PlotRow
                key={r.id}
                r={r}
                x={x}
                verdict={["Exploratory", "na"]}
                light
                drawn={drawn}
                delay={(planned.length + i) * 0.15}
              />
            ))}
            {explText.map((t) => (
              <li
                key={t.id}
                className="grid grid-cols-1 gap-x-4 gap-y-1 border-t py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <span className="min-w-0 text-sm leading-snug">
                  {t.what}
                  <span className="block text-muted-foreground text-xs">
                    <span className="font-mono">{t.id}</span>
                    {t.added && " · added after the lock"}
                  </span>
                </span>
                <span className="font-mono text-[13px] tabular-nums sm:text-right">
                  {drawn ? t.v : <Skeleton className="h-3 w-20 animate-none rounded-full sm:ml-auto" />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
  if (bare)
    return (
      <div data-found className="scroll-mt-4">
        {body}
      </div>
    );
  return (
    <section data-found className={cn(CARD, "scroll-mt-4")}>
      <SectionHead big icon="flask" title="What the experiment found" purpose={purpose} aside={<FoundKey />} />
      {body}
    </section>
  );
}

/* ---------- the runs: model × seed as a heatmap, and the counts that matter ---------- */
const CELL = {
  wait: "bg-muted text-muted-foreground/60",
  ok: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/25 ring-inset dark:bg-emerald-950/40 dark:text-emerald-100",
  look: "bg-amber-50 font-semibold text-amber-950 ring-1 ring-amber-500/60 ring-inset dark:bg-amber-950/40 dark:text-amber-100",
  bad: "bg-rose-50 text-rose-900 ring-1 ring-rose-500/40 ring-inset dark:bg-rose-950/40 dark:text-rose-100",
};
export function RunsHeatmap({ erp, issues, lit }: { erp: Erp; issues: IntakeIssue[]; lit: boolean }) {
  const seeds = erp.design.randomization.seeds;
  const systems =
    erp.protocol.specification.factors.find((f) => f.role === "treatment")?.levels ??
    erp.protocol.specification.treatments.map((t) => t.treatment_id);
  const runOf = (sys: string, seed: number) => {
    const job = erp.design.jobs.find((j) => j.treatment_id === sys && j.seed === seed);
    return erp.execution.runs.find((r) => r.job_id === job?.job_id);
  };
  const counts = erpCounts(erp);
  const splits = erp.design.randomization.splits;
  const tests = [...new Set(splits.map((s) => s.n_test))];
  const flagged = erp.execution.runs.filter((r) => issues.some((i) => i.id.split(".")[0] === r.run_id));
  const stats: [string, ReactNode][] = [
    ["Jobs", counts.planned],
    ["Completed", counts.byStatus.completed],
    ["Retries", counts.retries],
    ["Failed", counts.byStatus.failed],
    ["Splits", splits.length],
  ];
  return (
    <div data-runs className="flex scroll-mt-4 flex-col gap-4 px-4 py-4 sm:px-5">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
        Every planned job, model by seed; hover a cell for its run.
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", CELL.ok)} />
          Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", CELL.look)} />
          Flagged by the intake
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", CELL.bad)} />
          Not completed
        </span>
      </span>
      <div className="grid items-start gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div
          role="img"
          aria-label={`${systems.length * seeds.length} runs: ${systems.length} models by ${seeds.length} seeds`}
          className="grid items-center gap-1.5 text-xs"
          style={{ gridTemplateColumns: `minmax(3.5rem,auto) repeat(${seeds.length}, minmax(0, 1fr))` }}
        >
          <span />
          {seeds.map((seed) => (
            <span key={seed} className="truncate text-center text-muted-foreground">
              <span className="max-sm:hidden">Seed </span>
              {seed}
            </span>
          ))}
          {systems.map((sys, r) => (
            <Fragment key={sys}>
              <span className="truncate pr-1 font-mono text-muted-foreground" title={sys}>
                {sys}
              </span>
              {seeds.map((seed, c) => {
                const run = runOf(sys, seed);
                const failed = run && run.status !== "completed";
                const flag = run && issues.find((i) => i.id.split(".")[0] === run.run_id);
                const k = !lit ? "wait" : failed ? "bad" : flag ? "look" : "ok";
                return (
                  <span
                    key={seed}
                    title={run ? `${run.run_id} · ${flag ? cap(flag.why) : run.status}` : "No run"}
                    className={cn(
                      "flex h-8 min-w-0 items-center justify-center rounded-md font-mono text-xs transition-colors duration-300",
                      CELL[k],
                    )}
                    style={{ transitionDelay: lit && canEnter() ? `${(r * seeds.length + c) * 40}ms` : "0ms" }}
                  >
                    {run?.run_id ?? "—"}
                  </span>
                );
              })}
            </Fragment>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-3 gap-2">
            {stats.map(([k, v]) => (
              <div
                key={k}
                className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-foreground/5"
              >
                <dt className="text-[12px] text-muted-foreground leading-tight">{k}</dt>
                <dd className="font-semibold text-xl tabular-nums leading-tight">{lit ? v : "—"}</dd>
              </div>
            ))}
          </dl>
          {lit && tests.length > 0 && (
            <p className="text-[13px] text-muted-foreground leading-snug">
              Rows in each test part:{" "}
              <span className="text-foreground tabular-nums">
                {tests.map((n) => n.toLocaleString("en")).join(", ")}
              </span>
            </p>
          )}
          {lit && flagged.length > 0 && (
            <M
              as="p"
              in="fade"
              className={cn("flex gap-2 rounded-lg px-3 py-2 text-[13px] leading-snug", TONE.look.soft)}
            >
              <Icon n="alert" className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <b className="font-medium">{listed(flagged.map((r) => r.run_id))}</b>:{" "}
                {cap(issues.find((i) => i.id.split(".")[0] === flagged[0].run_id)?.why ?? "")}
              </span>
            </M>
          )}
        </div>
      </div>
    </div>
  );
}
