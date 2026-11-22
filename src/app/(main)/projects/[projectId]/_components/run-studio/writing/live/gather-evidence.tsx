"use client";
"use no memo";

/* ===== The evidence ledger (the preview's EvidenceScene, on a live run) =====
   Two kinds of source: the package, whose every printable number gets a ledger entry, and the literature, whose
   references are resolved and whose quotable sentences are kept. The screen opens on what the ledger did: the sources
   by status, the values by kind and its four steps; then what it means for the paper, the ledger itself (chips narrow
   it to a kind of value or a status of source) and the values code recomputed from the records behind them. What is
   missing is named, never filled in. */

import { Fragment, type ReactNode, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { Erp } from "../data/erp";
import { emit, item, reveal, S, sleep, step } from "../engine";
import { afterPaint, cn, Icon, M, q } from "../lib";
import { TABLE_PAD } from "../scenes-gather";
import { cap, human, itemsName, kindMeans, kindTone, listed, lowerFirst, meansOf, plural } from "./gather-data";
import { EvidenceFlow, type Outcome, Receipts, type StepMark } from "./gather-evidence-flow";
import { type Chip, type Conflict, ConflictList, NarrowBar } from "./gather-evidence-hero";
import { keyTone, Pill, SCROLL_TABLE, STICKY_HEAD } from "./gather-kit";
import { need, shown, WorkingHere } from "./kit";
import { scrollSoon } from "./outline-kit";
import { file, LIVE } from "./run";
import type { Tone } from "./stage-kit";
import { type BarRow, Section, type Part as Slice, StageAccent, type Swatch, Takeaway } from "./stage-visual";
import { Term } from "./term";
import type { EvidenceLedgerFile, LedgerValue, Reference } from "./types";

/* ---------- the package's records, by family ---------- */
const FAMILY: { k: string; n: string; sub: string }[] = [
  { k: "comparisons", n: "Comparisons", sub: "estimates and intervals" },
  { k: "descriptives", n: "Descriptives", sub: "shares and values by group" },
  { k: "means", n: "Model means", sub: "each model over its runs" },
  { k: "runs", n: "Run metrics", sub: "one value per run" },
  { k: "spread", n: "Spread by model", sub: "lowest and highest run" },
  { k: "splits", n: "Splits", sub: "training and test parts" },
  { k: "data", n: "Dataset", sub: "rows, columns, classes" },
  { k: "deviations", n: "Deviation checks", sub: "the planned version, rerun" },
  { k: "matrix", n: "Runs and seeds", sub: "the run matrix" },
  { k: "verdicts", n: "Verdicts", sub: "one per hypothesis" },
  { k: "figures", n: "Figures", sub: "the data behind each" },
  { k: "other", n: "Other values", sub: "named in the package" },
];
const FAMILY_AT = Object.fromEntries(FAMILY.map((f, i) => [f.k, i]));

/** Which family a record of the package belongs to, read from the package's own ids. */
function familyOf(erp: Erp | undefined, means: Set<string>, record: string) {
  if (!erp) return "other";
  const r = erp.results;
  if (r.comparisons.some((c) => c.comparison_id === record)) return "comparisons";
  if (means.has(record)) return "means";
  if (r.descriptives.some((d) => d.descriptive_id === record)) return "descriptives";
  if (r.observations.some((o) => o.observation_id === record)) return "runs";
  if (erp.protocol.specification.treatments.some((t) => t.treatment_id === record)) return "spread";
  if (erp.design.randomization.splits.some((s) => s.split_id === record)) return "splits";
  if (erp.provenance.data.some((d) => d.data_id === record)) return "data";
  if (erp.protocol.deviations.some((d) => d.deviation_id === record)) return "deviations";
  if (erp.design.matrix_id === record) return "matrix";
  if (erp.protocol.specification.hypotheses.some((h) => h.hypothesis_id === record)) return "verdicts";
  if (erp.figures.some((f) => f.figure_id === record)) return "figures";
  return "other";
}

/** A row of the ledger: one record (a run's metrics, a model's means, together), with the values it prints. */
interface Group {
  key: string;
  fam: string;
  id: string;
  name: string;
  sub?: string;
  records: string[];
  values: { key: string; facet: string; printed: string; label: string }[];
  /** The index in the streamed order of its last value: it shows once that value is indexed. */
  last: number;
}
const FACET: Record<string, string> = {
  "": "value",
  lo: "low",
  hi: "high",
  ci: "interval",
  n: "out of",
  cases: "cases",
  "cases.lo": "cases, low",
  "cases.hi": "cases, high",
  min: "lowest",
  max: "highest",
  verdict: "verdict",
};
const facetOf = (v: LedgerValue) => {
  const rest = v.key === v.record ? "" : v.key.startsWith(`${v.record}.`) ? v.key.slice(v.record.length + 1) : v.key;
  const tail = rest.replace(/^spread-[^.]+\./, "");
  return FACET[tail] ?? human(tail.replace(/\./g, " "));
};

interface Ledger {
  erp: Erp | undefined;
  led: EvidenceLedgerFile;
  /** The ledger's values in the order they are indexed: family by family. */
  values: (LedgerValue & { fam: string })[];
  groups: Group[];
  refs: Reference[];
  quarantined: Reference[];
  /** References whose lookup failed: neither verified nor quarantined, and never cited. */
  unresolved: Reference[];
  citeOnly: Reference[];
  spanSources: string[];
  /** The family of a record, read once. */
  famOf(record: string): string;
}
/* The ledger is read once per version of its files; the screen re-renders on every event of the run. */
let cache: { led: unknown; erp: unknown; out: Ledger } | null = null;
function readLedger(): Ledger | null {
  const led = file("EvidenceLedger.json");
  if (!led) return null;
  const erp = file("experiment_result.json");
  if (cache && cache.led === led && cache.erp === erp) return cache.out;
  const fam = new Map<string, string>();
  const meanIds = erp ? meansOf(erp).ids : new Set<string>();
  const famOf = (record: string) => {
    if (!fam.has(record)) fam.set(record, familyOf(erp, meanIds, record));
    return fam.get(record) as string;
  };
  const values = led.ledger
    .map((v, i) => ({ ...v, fam: famOf(v.record), i }))
    .sort((a, b) => FAMILY_AT[a.fam] - FAMILY_AT[b.fam] || a.i - b.i);
  const obs = new Map(erp?.results.observations.map((o) => [o.observation_id, o]) ?? []);
  const metricName = (id: string) => erp?.protocol.specification.metrics.find((m) => m.metric_id === id)?.name ?? id;
  const means = erp ? meansOf(erp) : null;
  const groups: Group[] = [];
  values.forEach((v, idx) => {
    const o = obs.get(v.record);
    const mean = means?.cells.find((c) => c.id === v.record);
    const key = o ? `run:${o.run_id}` : mean ? `mean:${mean.t}` : v.record;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = {
        key,
        fam: v.fam,
        id: o ? o.run_id : mean ? mean.t : v.record,
        name: v.label,
        records: [],
        values: [],
        last: idx,
      };
      groups.push(g);
    }
    if (!g.records.includes(v.record)) g.records.push(v.record);
    const facet = o ? metricName(o.metric_id) : mean && v.key === v.record ? metricName(mean.m) : facetOf(v);
    // The same fact printed the same way under one row is shown once ("out of 5 splits" for each mean).
    if (!g.values.some((x) => x.facet === facet && x.printed === v.printed))
      g.values.push({ key: v.key, facet, printed: v.printed, label: v.label });
    g.last = idx;
  });
  // A value's low and high end are not repeated beside the interval that already shows them.
  for (const g of groups) {
    const ci = new Set(g.values.filter((v) => v.key.endsWith(".ci")).map((v) => v.key.slice(0, -3)));
    g.values = g.values.filter((v) => !(/\.(lo|hi)$/.test(v.key) && ci.has(v.key.replace(/\.(lo|hi)$/, ""))));
  }
  // Each row's name, from the package where it names the record.
  for (const g of groups) {
    const r = g.records[0];
    if (!erp) continue;
    if (g.key.startsWith("run:")) {
      const run = erp.execution.runs.find((x) => x.run_id === g.id);
      const job = erp.design.jobs.find((j) => j.job_id === run?.job_id);
      g.name = `Run ${g.id}`;
      g.sub = job ? `${job.treatment_id}${job.seed != null ? `, seed ${job.seed}` : ""}` : undefined;
      continue;
    }
    if (g.key.startsWith("mean:")) {
      g.name = `${g.id}, mean over its runs`;
      g.sub = erp.protocol.specification.treatments.find((t) => t.treatment_id === g.id)?.name;
      continue;
    }
    const c = erp.results.comparisons.find((x) => x.comparison_id === r);
    const d = erp.results.descriptives.find((x) => x.descriptive_id === r);
    const data = erp.provenance.data.find((x) => x.data_id === r);
    const dev = erp.protocol.deviations.find((x) => x.deviation_id === r);
    const t = erp.protocol.specification.treatments.find((x) => x.treatment_id === r);
    const h = erp.protocol.specification.hypotheses.find((x) => x.hypothesis_id === r);
    const s = erp.design.randomization.splits.find((x) => x.split_id === r);
    if (c) [g.name, g.sub] = [c.label, `${human(c.role)} · analysis ${c.analysis_id}`];
    else if (d) [g.name, g.sub] = [d.label, d.analysis_id ? `analysis ${d.analysis_id}` : d.unit];
    else if (data) [g.name, g.sub] = [data.name, data.version];
    else if (dev) [g.name, g.sub] = [dev.description, `${dev.ran}, not ${dev.planned}`];
    else if (t) [g.name, g.sub] = [`${t.name}`, "over its runs"];
    else if (h) [g.name, g.sub] = [h.statement, human(h.priority)];
    else if (s) [g.name, g.sub] = [`${s.split_id} · ${s.method}`, `seed ${s.seed}`];
    else if (r === erp.design.matrix_id) [g.name, g.sub] = ["The run matrix", erp.design.randomization.method];
  }
  const refs = led.references;
  const spanSources = [...new Set(led.spans.map((s) => s.source))];
  const out: Ledger = {
    erp,
    led,
    values,
    groups,
    refs,
    quarantined: refs.filter((r) => r.status === "quarantined"),
    unresolved: refs.filter((r) => r.status !== "verified" && r.status !== "quarantined"),
    citeOnly: refs.filter((r) => r.status === "verified" && !r.quotable),
    spanSources,
    famOf,
  };
  cache = { led, erp, out };
  return out;
}

/* ---------- how far the stage is ---------- */
function progress(l: Ledger) {
  const { led } = l;
  const missingKinds = [...new Set(led.missing.map((m) => m.kind))];
  return {
    refs: shown("S02", "le.refs", l.refs.length),
    vals: shown("S02", "le.vals", l.values.length),
    spans: shown("S02", "le.spans", led.spans.length),
    recomp: shown("S02", "le.recomp", led.recomputed.length),
    missing: shown("S02", "le.missing", missingKinds.length),
    missingKinds,
  };
}
type Progress_ = ReturnType<typeof progress>;
const refAt = (l: Ledger, key: string) => l.refs.findIndex((r) => r.key === key);
const conflicts = (l: Ledger, p: Progress_) =>
  l.led.missing.filter((m, _i) => m.kind === "source_data_conflict" && p.missingKinds.indexOf(m.kind) < p.missing);

/* ---------- what a part of a bar above narrows the ledger to ---------- */
/** A reference's status as the bar shows it: quotable, cite only, quarantined, or unresolved (its lookup failed). */
type RefGroup = "quotable" | "cite" | "quarantined" | "unresolved";
const refGroup = (r: Reference): RefGroup =>
  r.status === "quarantined"
    ? "quarantined"
    : r.status !== "verified"
      ? "unresolved"
      : r.quotable
        ? "quotable"
        : "cite";
/* In the one colour meaning: quotable holds; cite-only is written with care; a quarantined reference failed its
   check (blocked); an unresolved one is simply not cited (not claimed). */
const REF_GROUP: Record<RefGroup, { n: string; tone: Tone; term?: string; list: string; k: string }> = {
  quotable: { n: "Quotable", tone: "ok", list: "Quotable sources", k: "ok" },
  cite: { n: "Cite-only", tone: "look", term: "cite-only", list: "Cite-only sources", k: "warn" },
  quarantined: { n: "Quarantined", tone: "bad", term: "quarantined", list: "Quarantined references", k: "bad" },
  unresolved: { n: "Unresolved", tone: "none", term: "unresolved", list: "Unresolved references", k: "na" },
};
type Narrow = { by: "family"; fam: string } | { by: "refs"; group: RefGroup } | { by: "value"; key: string };

/* ---------- the ledger below: numbers, quotes, sources, and what is missing ---------- */
type Mode = "numbers" | "quotes" | "sources" | "missing";
const MISSING_BADGE: Record<string, [string, string]> = {
  source_data_conflict: ["bad", "Conflict"],
  source_quarantined: ["bad", "Quarantined"],
  source_unresolved: ["na", "Unresolved"],
  cite_only: ["warn", "Cite-only"],
  deferred_hypothesis: ["na", "Deferred"],
  unused_input: ["na", "Not used"],
};
/** What the table follows while the stage plays, until you choose. */
function followMode(p: Progress_, l: Ledger): Mode {
  const st = S.st.S02;
  if (st?.status !== "running") return "numbers";
  if (st.cur === "b1") return "sources";
  if (st.cur === "b2") return p.vals >= l.values.length && p.spans > 0 ? "quotes" : "numbers";
  if (st.cur === "b4") return "missing";
  return "numbers";
}

function LedgerTable({
  l,
  p,
  narrow,
  onClear,
  chosen,
  onChoose,
}: {
  l: Ledger;
  p: Progress_;
  narrow: Narrow | null;
  onClear(): void;
  /** The tab a reader chose in this run, if any. */
  chosen: Mode | null;
  onChoose(mode: Mode): void;
}) {
  const narrowed: Mode | null = narrow ? (narrow.by === "refs" ? "sources" : "numbers") : null;
  const mode: Mode = narrowed ?? chosen ?? followMode(p, l);
  const rec = new Map(l.led.recomputed.slice(0, p.recomp).map((r) => [r.record, r]));
  const conf = new Set(conflicts(l, p).map((m) => m.id));
  const resolved = (key: string) => refAt(l, key) < p.refs;

  // Each mode's rows, narrowed by the part picked above.
  // A row may open a group (a family of the package, a source): the group's name heads its rows once.
  let rows: { key: string; cells: ReactNode[]; group?: { key: string; label: ReactNode } }[] = [];
  let head: { n: string; w?: string; hide?: string; term?: string }[] = [];
  if (mode === "numbers") {
    head = [
      { n: "Record", w: "w-28" },
      { n: "Holds" },
      { n: "Recompute", w: "w-36", hide: "@max-xl:hidden", term: "recompute" },
    ];
    const famGroup = (fam: string) => {
      const f = FAMILY.find((x) => x.k === fam);
      return { key: fam, label: f ? `${f.n} · ${f.sub}` : human(fam) };
    };
    let gs = l.groups.filter((g) => g.last < p.vals);
    if (narrow?.by === "family") gs = gs.filter((g) => g.fam === narrow.fam);
    if (narrow?.by === "value") gs = gs.filter((g) => g.values.some((v) => v.key === narrow.key));
    // Figures are recomputed without a ledger value of their own: their re-check is a row too.
    const figs =
      narrow?.by === "family" && narrow.fam === "figures"
        ? l.led.recomputed.filter((r) => rec.has(r.record) && l.famOf(r.record) === "figures")
        : [];
    rows = [
      ...gs.map((g) => {
        const r = g.records.map((x) => rec.get(x)).find(Boolean);
        const clash = g.values.some((v) => conf.has(v.key));
        const check = clash ? (
          <Pill key="check" k="bad">
            Conflict
          </Pill>
        ) : r ? (
          <Pill key="check" k={r.match ? "ok" : "bad"}>
            {r.match ? "Matches" : "Differs"}
          </Pill>
        ) : null;
        return {
          key: g.key,
          group: famGroup(g.fam),
          cells: [
            <span key="id" className="break-all font-mono text-muted-foreground text-xs leading-5">
              {g.id}
            </span>,
            <span key="holds" className="block min-w-0">
              <span className="block text-pretty leading-5">{g.name}</span>
              {g.sub && <span className="block text-muted-foreground text-xs">{g.sub}</span>}
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {g.values.map((v) => (
                  <span
                    key={v.key}
                    title={`${v.key} · ${v.label}`}
                    className={cn(
                      "inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-md px-1.5 py-0.5 text-xs",
                      conf.has(v.key) ? "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100" : "bg-muted",
                    )}
                  >
                    <span className="shrink-0 text-[11px] text-muted-foreground">{v.facet}</span>
                    <b className="min-w-0 break-words font-medium font-mono tabular-nums">{v.printed}</b>
                  </span>
                ))}
              </span>
              {check && <span className="mt-1.5 block @xl:hidden">{check}</span>}
            </span>,
            check,
          ],
        };
      }),
      ...figs.map((r) => ({
        key: r.record,
        group: famGroup("figures"),
        cells: [
          <span key="id" className="font-mono text-muted-foreground text-xs leading-5">
            {r.record}
          </span>,
          <span key="holds" className="block leading-5">
            {l.erp?.figures.find((f) => f.figure_id === r.record)?.title ?? r.record}
            <span className="block text-muted-foreground text-xs">
              {r.what}: {String(r.recomputed)}
            </span>
          </span>,
          <Pill key="c" k={r.match ? "ok" : "bad"}>
            {r.match ? "Matches" : "Differs"}
          </Pill>,
        ],
      })),
    ];
  } else if (mode === "quotes") {
    head = [{ n: "Sentence", w: "w-28" }, { n: "Holds" }];
    const spans = l.led.spans.slice(0, p.spans);
    rows = spans.map((s) => {
      const ref = l.refs.find((r) => r.key === s.source);
      return {
        key: s.span_id,
        group: {
          key: s.source,
          label: (
            <>
              {ref?.title ?? s.source} <span className="font-mono font-normal text-muted-foreground">· {s.source}</span>
            </>
          ),
        },
        cells: [
          <span key="id" className="break-all font-mono text-muted-foreground text-xs leading-5">
            {s.span_id.startsWith(`${s.source}#`) ? s.span_id.slice(s.source.length + 1) : s.span_id}
          </span>,
          <span key="holds" className="block text-pretty leading-5">
            “{s.text}”
          </span>,
        ],
      };
    });
  } else if (mode === "sources") {
    head = [
      { n: "Source", w: "w-36" },
      { n: "Holds" },
      { n: "Resolved at", w: "w-32", hide: "@max-3xl:hidden" },
      { n: "Check", w: "w-32", hide: "@max-xl:hidden" },
    ];
    let refs = l.refs.filter((r) => resolved(r.key));
    if (narrow?.by === "refs") refs = refs.filter((r) => refGroup(r) === narrow.group);
    const quotes = new Map<string, number>();
    for (const sp of l.led.spans.slice(0, p.spans)) quotes.set(sp.source, (quotes.get(sp.source) ?? 0) + 1);
    rows = refs.map((r) => {
      const ok = r.status === "verified";
      const check = !ok ? (
        <Pill key="check" k={REF_GROUP[refGroup(r)].k}>
          {REF_GROUP[refGroup(r)].n}
        </Pill>
      ) : r.quotable ? (
        <Pill key="check" k="ok">
          Quotable
        </Pill>
      ) : (
        <Pill key="check" k="warn">
          Cite-only
        </Pill>
      );
      return {
        key: r.key,
        cells: [
          <span key="id" className="break-all font-mono text-muted-foreground text-xs leading-5">
            {r.key}
          </span>,
          <span key="holds" className="block min-w-0 leading-5">
            <span className={cn("block text-pretty", !ok && "text-muted-foreground")}>
              {r.title || "No title found"}
            </span>
            {(r.doi || r.url) && (
              <a
                href={r.url || `https://doi.org/${r.doi}`}
                target="_blank"
                rel="noreferrer"
                className="block break-all font-mono text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
              >
                {r.doi || r.url}
              </a>
            )}
            {!ok && r.reason && <span className="block text-muted-foreground text-xs">{cap(r.reason)}</span>}
            {ok && r.quotable && quotes.get(r.key) ? (
              <span className="block text-muted-foreground text-xs">
                {plural(quotes.get(r.key) ?? 0, "quotable sentence")}
              </span>
            ) : null}
            <span className="mt-1.5 block @xl:hidden">{check}</span>
          </span>,
          <span key="via" className="text-muted-foreground leading-5">
            {r.via ? human(r.via) : "—"}
          </span>,
          check,
        ],
      };
    });
  } else {
    head = [{ n: "Item", w: "w-36" }, { n: "Holds" }, { n: "Check", w: "w-36", hide: "@max-xl:hidden" }];
    const items = l.led.missing.filter((m) => p.missingKinds.indexOf(m.kind) < p.missing);
    // The same reason for several items is one row.
    const grouped: { ids: string[]; kind: string; why: string; extra: Record<string, unknown> }[] = [];
    for (const m of items) {
      const extra = Object.fromEntries(Object.entries(m).filter(([k]) => !["id", "kind", "why"].includes(k)));
      const same = grouped.find((g) => g.kind === m.kind && g.why === m.why && !Object.keys(extra).length);
      if (same) same.ids.push(m.id);
      else grouped.push({ ids: [m.id], kind: m.kind, why: m.why, extra });
    }
    rows = grouped.map((g) => {
      const [k, label] = MISSING_BADGE[g.kind] ?? ["warn", human(g.kind)];
      const badge = (
        <Pill key="check" k={k}>
          {label}
        </Pill>
      );
      return {
        key: `${g.kind}:${g.ids[0]}`,
        cells: [
          <span key="id" className="flex flex-wrap gap-1">
            {g.ids.map((id) => (
              <span
                key={id}
                className="break-all rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] leading-tight"
              >
                {id}
              </span>
            ))}
          </span>,
          <span key="holds" className="block leading-5">
            <span className="block text-pretty break-words">{cap(g.why)}</span>
            {Object.keys(g.extra).length > 0 && (
              <span className="mt-1 flex flex-wrap gap-x-3 text-muted-foreground text-xs">
                {Object.entries(g.extra).map(([key, v]) => (
                  <span key={key}>
                    {human(key)} <b className="font-medium text-foreground">{String(v)}</b>
                  </span>
                ))}
              </span>
            )}
            <span className="mt-1.5 block @xl:hidden">{badge}</span>
          </span>,
          badge,
        ],
      };
    });
  }
  const list = rows;
  const counts: Record<Mode, number> = {
    numbers: l.groups.filter((g) => g.last < p.vals).length,
    quotes: p.spans,
    sources: p.refs,
    missing: l.led.missing.filter((m) => p.missingKinds.indexOf(m.kind) < p.missing).length,
  };
  const narrowName = !narrow
    ? ""
    : narrow.by === "family"
      ? `${FAMILY.find((f) => f.k === narrow.fam)?.n ?? human(narrow.fam)} values`
      : narrow.by === "refs"
        ? REF_GROUP[narrow.group].list
        : `The record of ${narrow.key}`;
  return (
    <section data-ledger data-out="EvidenceLedger.json" className="@container scroll-mt-4">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 text-sm sm:px-5">
        {narrow ? (
          <Badge variant="secondary" className="h-6 gap-1.5 pr-1">
            {narrowName}
            <button
              type="button"
              aria-label="Show the whole ledger"
              onClick={onClear}
              className="grid size-4 place-items-center rounded-full hover:bg-foreground/10"
            >
              <Icon n="x" className="size-2.5" sw={3} />
            </button>
          </Badge>
        ) : null}
        {!narrow && (
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={mode}
            onValueChange={(v) => v && onChoose(v as Mode)}
            aria-label="Show"
            className="flex-wrap"
          >
            {(
              [
                ["numbers", "Numbers"],
                ["quotes", "Quotes"],
                ["sources", "Sources"],
                ["missing", "Missing"],
              ] as const
            ).map(([k, label]) => (
              <ToggleGroupItem key={k} value={k} className="h-7 gap-1 px-2.5 text-xs">
                {label}
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{counts[k]}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </header>
      {list.length ? (
        <div className={SCROLL_TABLE}>
          <Table className="table-fixed">
            <TableHeader className={STICKY_HEAD}>
              <TableRow className="hover:bg-transparent">
                {head.map((h, i) => (
                  <TableHead
                    key={h.n}
                    className={cn(
                      h.w,
                      h.hide,
                      i === 0 && "@max-md:hidden pl-4",
                      i === 1 && "@max-md:pl-4",
                      i === head.length - 1 && "pr-4",
                    )}
                  >
                    {h.term ? <Term t={h.term}>{h.n}</Term> : h.n}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r, i) => {
                const g = r.group;
                return (
                  <Fragment key={r.key}>
                    {g && g.key !== list[i - 1]?.group?.key && (
                      // The same cells as a row, so a column hidden on a narrow card never leaves a phantom one; the
                      // name sits in the second cell, where it has the room to wrap in full.
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        {head.map((h, j) => (
                          <TableCell
                            key={h.n}
                            className={cn(
                              "py-1.5 font-medium text-xs",
                              h.hide,
                              j === 0 && "@max-md:hidden pl-4",
                              j === 1 && "@max-md:pl-4",
                            )}
                          >
                            {j === 1 && <span className="block whitespace-normal">{g.label}</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                    <M as={TableRow} data-row={r.key} in="fade" dur={300}>
                      {r.cells.map((c, j) => (
                        <TableCell
                          key={head[j].n}
                          className={cn(
                            TABLE_PAD,
                            head[j].hide,
                            j === 0 && "@max-md:hidden",
                            j === 1 && "@max-md:pl-4",
                          )}
                        >
                          {/* On a narrow card the first column folds into the second, so the record keeps its room. */}
                          {j === 1 && <span className="mb-1 block @md:hidden">{r.cells[0]}</span>}
                          {c}
                        </TableCell>
                      ))}
                    </M>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
      {mode === "numbers" && list.length > 0 && (
        <p className="border-t px-4 py-2 text-muted-foreground text-xs">
          An empty recompute cell: the value was not recomputed; the package's value stands.
        </p>
      )}
    </section>
  );
}

/* The ledger before it is in: the table in its place, its rows as calm lines. */
function LedgerAhead() {
  return (
    <section>
      <div aria-hidden="true" className="flex flex-col gap-4 p-4 sm:px-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="grid grid-cols-[60px_minmax(0,1fr)_110px] gap-4">
            <Skeleton className="h-2.5 w-10 animate-none rounded-full" />
            <span className="flex flex-col gap-1.5">
              <Skeleton className={cn("h-2.5 animate-none rounded-full", i % 2 ? "w-2/3" : "w-full")} />
              <Skeleton className="h-2 w-1/3 animate-none rounded-full" />
            </span>
            <Skeleton className="h-2.5 w-16 animate-none rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

/* One line that says what the ledger's code is doing right now. */
function evidenceNow(l: Ledger, p: Progress_) {
  const st = S.st.S02;
  if (st?.status !== "running") return null;
  if (st.cur === "b1") {
    const r = l.refs[Math.max(0, p.refs - 1)];
    return r ? `Resolving the references · ${p.refs} of ${l.refs.length} · ${r.key}` : null;
  }
  if (st.cur === "b2") {
    if (p.vals < l.values.length) {
      const fam = l.values[Math.max(0, p.vals - 1)]?.fam;
      return `Indexing the package's values · ${FAMILY.find((f) => f.k === fam)?.n ?? ""}`;
    }
    const src = l.led.spans[Math.max(0, p.spans - 1)]?.source;
    return `Keeping the quotable sentences · ${l.refs.find((r) => r.key === src)?.title ?? src ?? ""}`;
  }
  if (st.cur === "b3") {
    const r = l.led.recomputed[Math.max(0, p.recomp - 1)];
    return r ? `Recomputing ${r.record} · ${r.what}` : null;
  }
  if (st.cur === "b4") return "Naming what the paper cannot use";
  return null;
}

/** The kinds of missing item that are about a source: the references say them already. */
const SOURCE_KINDS = new Set(["source_quarantined", "source_unresolved", "cite_only"]);
/** A reference's status as a mark of the one colour system, for the chart and the chips. */
const REF_SWATCH: Record<RefGroup, Exclude<Swatch, "accent">> = {
  quotable: "ok",
  cite: "look",
  quarantined: "bad",
  unresolved: "none",
};
/** The ledger's steps, as the track names them, the part of the screen each one fills and the tab it shows. */
const STEPS: { k: string; title: string; sel: string; mode?: Mode }[] = [
  { k: "b1", title: "Resolve every reference", sel: "[data-ledger]", mode: "sources" },
  { k: "b2", title: "Index the numbers and the quotable sentences", sel: "[data-ledger]", mode: "numbers" },
  { k: "b3", title: "Recompute the numbers from their records", sel: "[data-recheck]" },
  { k: "b4", title: "Name what is missing", sel: "[data-ledger]", mode: "missing" },
];
/** What each step came to, from what has streamed so far. */
function stepResult(k: string, l: Ledger | null, p: Progress_ | null): { tone: Tone | "wait" | "now"; label: string } {
  const st = S.st.S02;
  const now = st?.status === "running" && st.cur === k;
  const over = st?.status === "done";
  const wait = (busy: string, idle: string) => ({
    tone: now ? ("now" as const) : ("wait" as const),
    label: now ? busy : idle,
  });
  if (!l || !p) return wait("Working", "Not started yet");
  const { led } = l;
  if (k === "b1") {
    if (!over && p.refs < l.refs.length) return wait(`${p.refs} of ${l.refs.length} resolved`, "Not resolved yet");
    const bad = l.quarantined.length;
    const open = l.unresolved.length;
    const verified = l.refs.length - bad - open;
    const rest = [bad && `${bad} quarantined`, open && `${open} unresolved`].filter(Boolean).join(" · ");
    return {
      tone: bad ? "bad" : open ? "look" : "ok",
      label: `${verified} of ${l.refs.length} verified${rest ? ` · ${rest}` : ""}`,
    };
  }
  if (k === "b2") {
    if (!over && (p.vals < l.values.length || p.spans < led.spans.length))
      return wait(`${p.vals} of ${plural(l.values.length, "value")} indexed`, "Not indexed yet");
    return { tone: "ok", label: `${plural(led.ledger.length, "value")} · ${plural(led.spans.length, "sentence")}` };
  }
  if (k === "b3") {
    const rec = led.recomputed;
    if (!over && p.recomp < rec.length) return wait(`${p.recomp} of ${rec.length} recomputed`, "Not recomputed yet");
    if (!rec.length) return { tone: "none", label: "Nothing to recompute" };
    const match = rec.filter((r) => r.match).length;
    return { tone: match < rec.length ? "bad" : "ok", label: `${match} of ${rec.length} match the package` };
  }
  if (!over && p.missing < p.missingKinds.length)
    return wait(`${p.missing} of ${plural(p.missingKinds.length, "kind")} named`, "Not named yet");
  if (!led.missing.length) return { tone: "ok", label: "Nothing is missing" };
  const bad = led.missing.some((m) => m.kind === "source_data_conflict");
  return { tone: bad ? "bad" : "look", label: `${plural(led.missing.length, "item")} named, none filled in` };
}

export function EvidenceLive({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  // The reader's choices in this run: a chip picked, a tab of the ledger.
  const [narrowed, setNarrowed] = useState<{ run: unknown; n: Narrow | null } | null>(null);
  const [tab, setTab] = useState<{ run: unknown; mode: Mode } | null>(null);
  const l = readLedger();
  const st = S.st.S02;
  const p = l ? progress(l) : null;
  const narrow = narrowed?.run === S ? narrowed.n : null;
  const toLedger = (n: Narrow) => {
    setNarrowed({ run: S, n });
    afterPaint(() => {
      q("[data-ledger] [data-slot=table-container]")?.scrollTo({ top: 0 });
    });
    scrollSoon("[data-ledger]");
  };
  const showTab = (mode: Mode) => {
    setNarrowed({ run: S, n: null });
    setTab({ run: S, mode });
    scrollSoon("[data-ledger]");
  };
  const done = st?.status === "done";
  const failed = S.lifecycle === "failed" && st?.status === "running";
  const led = l?.led;
  const rec = led?.recomputed ?? [];
  const recomp = done ? rec.length : (p?.recomp ?? 0);
  const playing = live && st?.status === "running";
  const now = l && p && playing ? evidenceNow(l, p) : null;

  /* ----- the takeaway: what the paper may draw on, and what it may not ----- */
  const ready = Boolean(l && p) && (done || (st?.status === "running" && st.cur === "b4"));
  const refs = l?.refs ?? [];
  const nOf = (g: RefGroup) => refs.filter((r) => refGroup(r) === g);
  const sources = led ? new Set(led.spans.map((s) => s.source)).size : 0;
  const records = led ? new Set(led.ledger.map((v) => v.record)).size : 0;
  const match = rec.filter((r) => r.match).length;
  const _matchSoFar = rec.slice(0, recomp).filter((r) => r.match).length;
  const named = l && p ? conflicts(l, p) : [];
  const callouts: Conflict[] = named.map((m) => {
    const x = m as { id: string; why: string; owner?: string };
    return { id: x.id, why: x.why, owner: x.owner };
  });
  let headline: ReactNode = led
    ? `The paper may print ${plural(led.ledger.length, "value")} and quote ${plural(led.spans.length, "sentence")} from ${plural(sources, "source")}; ${
        match < rec.length
          ? `${rec.length - match} of ${rec.length} recomputed values differ from the package.`
          : "every recomputed value matches the package."
      }`
    : "";
  if (callouts.length)
    headline = `${headline} ${plural(callouts.length, "value")} ${callouts.length === 1 ? "conflicts" : "conflict"} with the package and ${callouts.length === 1 ? "is" : "are"} held.`;
  if (failed) headline = `The evidence ledger stopped: ${S.failure}`;

  /* ----- what it means for the paper: what is printed, what is cited, what is named and never filled in ----- */
  const effects: { key: string; item: string; effect: string; tone: Tone }[] = led
    ? [
        {
          key: "ledger",
          item: "Numbers and quotes",
          effect: "only what this ledger holds is printed or quoted; nothing outside it.",
          tone: "ok",
        },
      ]
    : [];
  const refEffect = (g: RefGroup, kind: string, effect: string) => {
    const xs = nOf(g);
    if (xs.length)
      effects.push({
        key: g,
        item: itemsName(
          kind,
          xs.map((r) => r.key),
        ),
        effect,
        tone: keyTone(REF_GROUP[g].k),
      });
  };
  refEffect("quarantined", "source_quarantined", "never cited.");
  refEffect("unresolved", "source_unresolved", `${lowerFirst(kindMeans("source_unresolved"))}.`);
  refEffect("cite", "cite_only", "cited, never quoted.");
  // What else is missing, by kind: named in the paper, never filled in.
  for (const kind of [...new Set((led?.missing ?? []).map((m) => m.kind))].filter((k) => !SOURCE_KINDS.has(k))) {
    const ids = (led?.missing ?? []).filter((m) => m.kind === kind).map((m) => m.id);
    effects.push({
      key: kind,
      item: itemsName(kind, ids),
      effect: kind === "source_data_conflict" ? `${lowerFirst(kindMeans(kind))}.` : "named, never filled in.",
      tone: kindTone(kind),
    });
  }

  /* ----- the charts: the references by status, the values by kind; each fills as the ledger streams ----- */
  const refsSeen = l && p ? l.refs.slice(0, done ? l.refs.length : p.refs) : [];
  const groupsOf = (["quotable", "cite", "quarantined", "unresolved"] as const).map((g) => ({ g, refs: nOf(g) }));
  const _refSlices: Slice[] = groupsOf
    .filter((x) => x.refs.length)
    .map((x) => ({
      key: x.g,
      label: REF_GROUP[x.g].n,
      value: refsSeen.filter((r) => refGroup(r) === x.g).length,
      swatch: REF_SWATCH[x.g],
    }));
  const vals = l && p ? (done ? l.values.length : p.vals) : 0;
  const families = l
    ? FAMILY.map((f) => {
        const all = l.values.filter((v) => v.fam === f.k);
        return { f, all, done: l.values.slice(0, vals).filter((v) => v.fam === f.k).length };
      })
        .filter((x) => x.all.length > 0)
        .sort((a, b) => b.all.length - a.all.length)
    : [];
  const _valueRows: BarRow[] = families.map(({ f, all, done: d }) => ({
    key: f.k,
    name: f.n,
    label: f.n,
    sub: f.sub,
    parts: [{ key: "in", label: "Indexed", value: d, swatch: "accent" }],
    total: all.length,
    end: plural(all.length, "value"),
  }));
  // The ledger's two ways in, as chips that narrow it.
  const valueChips: Chip[] | null = l
    ? families.map(({ f, all }) => ({
        key: f.k,
        name: f.n,
        n: all.length,
        tip: `${plural(new Set(all.map((v) => v.record)).size, "record")}: ${f.sub}`,
      }))
    : null;
  const refChips: Chip[] | null = l
    ? groupsOf
        .filter((x) => x.refs.length)
        .map((x) => ({
          key: x.g,
          name: REF_GROUP[x.g].n,
          n: x.refs.length,
          swatch: REF_SWATCH[x.g],
          term: REF_GROUP[x.g].term,
          tip:
            x.g === "quotable"
              ? "Verified at its registry, with a text to quote"
              : x.g === "cite"
                ? "Verified, no text: cited by title, never quoted"
                : x.g === "quarantined"
                  ? `${listed(x.refs.map((r) => r.key))}: never cited`
                  : `${listed(x.refs.map((r) => r.key))}: never cited until ${x.refs.length === 1 ? "it resolves" : "they resolve"}`,
        }))
    : null;
  const active = narrow?.by === "family" ? narrow.fam : narrow?.by === "refs" ? narrow.group : null;
  /* ----- the drawing: each step of the stage as the box it fills, and where the evidence ends up ----- */
  const stepMark = (i: number): StepMark => {
    const x = STEPS[i];
    const r = stepResult(x.k, l, p);
    return {
      n: i + 1,
      title: x.title,
      tone: r.tone,
      label: r.label,
      onPick: () => (x.mode ? showTab(x.mode) : scrollSoon(x.sel)),
    };
  };
  const never = [...nOf("quarantined"), ...nOf("unresolved")];
  const missingOther = (led?.missing ?? []).filter((m) => !SOURCE_KINDS.has(m.kind));
  const outcomes: Outcome[] = led
    ? [
        {
          key: "print",
          tone: "ok",
          title: "Printed as the ledger writes them",
          n: led.ledger.length,
          unit: led.ledger.length === 1 ? "value" : "values",
          why: "Every number in the paper is one of these; nothing outside the ledger is printed.",
          onPick: () => showTab("numbers"),
        },
        {
          key: "quote",
          tone: "ok",
          title: "May be quoted word for word",
          n: led.spans.length,
          unit: led.spans.length === 1 ? "sentence" : "sentences",
          why: `From ${plural(sources, "source")} whose text was found.`,
          onPick: () => showTab("quotes"),
        },
        ...(nOf("cite").length
          ? [
              {
                key: "cite",
                tone: "look" as const,
                title: "Cited, never quoted",
                n: nOf("cite").length,
                unit: nOf("cite").length === 1 ? "source" : "sources",
                why: "Verified at their registry, but no text was found: the paper names them, never quotes them.",
                onPick: () => toLedger({ by: "refs", group: "cite" }),
              },
            ]
          : []),
        ...(never.length
          ? [
              {
                key: "never",
                tone: "bad" as const,
                title: "Never cited",
                n: never.length,
                unit: never.length === 1 ? "reference" : "references",
                why: `${listed(never.map((r) => r.key))}: ${never.length === 1 ? "it" : "they"} could not be verified at a registry.`,
                onPick: () => toLedger({ by: "refs", group: nOf("quarantined").length ? "quarantined" : "unresolved" }),
              },
            ]
          : []),
        ...(missingOther.length
          ? [
              {
                key: "missing",
                tone: callouts.length ? ("bad" as const) : ("look" as const),
                title: "Named in the paper, never filled in",
                n: missingOther.length,
                unit: missingOther.length === 1 ? "item" : "items",
                why: `${cap(listed([...new Set(missingOther.map((m) => human(m.kind).toLowerCase()))]))}: the paper says what is missing and writes nothing in its place.`,
                onPick: () => showTab("missing"),
              },
            ]
          : []),
      ]
    : [];
  const missingKinds = p ? (done ? p.missingKinds.length : p.missing) : 0;
  const _missingSoFar = led ? led.missing.filter((m) => p && p.missingKinds.indexOf(m.kind) < missingKinds).length : 0;
  return (
    <StageAccent accent="sky">
      <div ref={host} className="relative flex min-w-0 flex-col gap-5">
        {!done && !l && <WorkingHere sid="S02" />}
        <Section
          icon="target"
          title="What this stage did"
          tells="The ledger lists every number the paper may print and every sentence it may quote, checks each source, and recomputes the package's numbers from the records behind them."
          data-hero
          data-overview
          data-out="ReadinessReport.md"
        >
          <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
            <Takeaway ready={ready || failed}>{headline}</Takeaway>
            <EvidenceFlow
              pkg={{
                figure: records,
                unit: records === 1 ? "record" : "records",
                parts: families.slice(0, 5).map(({ f, all }) => ({
                  key: f.k,
                  n: all.length,
                  label: `${f.n.toLowerCase()} (${f.sub})`,
                })),
                ready: Boolean(l),
                step: stepMark(2),
              }}
              lit={{
                figure: refsSeen.length,
                unit: refsSeen.length === 1 ? "reference" : "references",
                parts: groupsOf
                  .filter((x) => x.refs.length)
                  .map((x) => ({
                    key: x.g,
                    n: refsSeen.filter((r) => refGroup(r) === x.g).length,
                    label: REF_GROUP[x.g].n.toLowerCase(),
                    tone: REF_GROUP[x.g].tone,
                  })),
                ready: refsSeen.length > 0,
                step: stepMark(0),
              }}
              ledger={{
                figure: vals,
                unit: "values the paper may print",
                parts: [
                  { key: "records", n: records, label: "records of the package they come from" },
                  {
                    key: "spans",
                    n: done ? (led?.spans.length ?? 0) : (p?.spans ?? 0),
                    label: `sentences that may be quoted, from ${plural(sources, "source")}`,
                  },
                ],
                ready: vals > 0,
                step: stepMark(1),
              }}
              outcomes={outcomes}
              outcomesReady={ready}
              outcomeStep={stepMark(3)}
            />
            {ready && callouts.length > 0 && (
              <ConflictList conflicts={callouts} onConflict={(key) => toLedger({ by: "value", key })} />
            )}
          </div>
        </Section>

        <Section
          icon="table"
          title="The ledger: every number, quote, source and gap"
          tells="The writers may print only what it holds. Pick a kind of value or a status of source to narrow it."
          now={st?.cur !== "b3" ? now : null}
          aside={l ? plural(l.values.length, "value") : undefined}
        >
          <NarrowBar
            values={valueChips}
            refs={refChips}
            active={active}
            onValues={(fam) => toLedger({ by: "family", fam })}
            onRefs={(group) => toLedger({ by: "refs", group: group as RefGroup })}
          />
          {l && p ? (
            <LedgerTable
              l={l}
              p={p}
              narrow={narrow}
              onClear={() => setNarrowed({ run: S, n: null })}
              chosen={tab?.run === S ? tab.mode : null}
              onChoose={(mode) => setTab({ run: S, mode })}
            />
          ) : (
            <LedgerAhead />
          )}
        </Section>

        <Section
          icon="compare"
          title="Recomputed values"
          tells="Each value code recomputed from the records behind it, beside the value the package states. One that differs is never printed."
          now={st?.cur === "b3" ? now : null}
          aside={
            rec.length
              ? recomp < rec.length && !done
                ? `${recomp} of ${rec.length}`
                : `${match} of ${rec.length} match`
              : undefined
          }
        >
          <Receipts rec={rec} n={recomp} active={st?.status === "running" && st.cur === "b3"} />
        </Section>
      </div>
    </StageAccent>
  );
}

/* ---------- how the stage plays: resolve, index, re-check, name what is missing ---------- */
export async function playEvidence() {
  // The ledger and the readiness report are published together, when the step's code is done.
  if (!(await need("S02", "EvidenceLedger.json"))) return;
  reveal("[data-hero]");
  const l = readLedger();
  if (!l) return;
  const { led } = l;
  const vias = [
    ...new Set(
      l.refs
        .filter((r) => r.status === "verified")
        .map((r) => r.via)
        .filter(Boolean),
    ),
  ];
  await step(
    "S02",
    "b1",
    async () => {
      for (let i = 0; i < l.refs.length; i++) {
        S.n["le.refs"] = i + 1;
        emit();
        await sleep(l.refs[i].status !== "verified" ? 520 : 60);
      }
    },
    {
      text: `${plural(l.refs.length, "reference")}. ${l.refs.length - l.quarantined.length - l.unresolved.length} verified at ${listed(vias.map(human))}${
        l.quarantined.length ? `; ${listed(l.quarantined.map((r) => `${r.key} is quarantined: ${r.reason}`))}` : ""
      }${l.unresolved.length ? `; ${listed(l.unresolved.map((r) => r.key))} could not be resolved` : ""}. ${
        l.citeOnly.length
          ? `${plural(l.citeOnly.length, "source")} without a text to quote may be cited, never quoted.`
          : ""
      }`.trim(),
    },
  );
  const fams = FAMILY.filter((f) => l.values.some((v) => v.fam === f.k));
  const records = new Set(led.ledger.map((v) => v.record)).size;
  await step(
    "S02",
    "b2",
    async () => {
      for (const f of fams) {
        const last = l.values.map((v) => v.fam).lastIndexOf(f.k);
        await item("le.vals", last, { id: f.k, wait: 360 });
      }
      for (const src of l.spanSources) {
        const last = led.spans.map((s) => s.source).lastIndexOf(src);
        await item("le.spans", last, { id: src, wait: 170 });
      }
    },
    {
      text: `${plural(led.ledger.length, "value")} from ${plural(records, "record")} of the package, each printed the way the paper prints it, and ${plural(led.spans.length, "quotable sentence")} from ${plural(l.spanSources.length, "source")}.`,
    },
  );
  const differ = led.recomputed.filter((r) => !r.match);
  await step(
    "S02",
    "b3",
    async () => {
      reveal("[data-recheck]");
      for (let i = 0; i < led.recomputed.length; i++)
        await item("le.recomp", i, { id: led.recomputed[i].record, wait: led.recomputed[i].match ? 480 : 1200 });
    },
    {
      text: `${plural(led.recomputed.length, "value")} of the package recomputed from the records behind them: ${
        differ.length
          ? `${listed(differ.map((r) => r.record))} ${differ.length === 1 ? "differs" : "differ"}`
          : "every one matches"
      }.`,
    },
  );
  const kinds = [...new Set(led.missing.map((m) => m.kind))];
  await step(
    "S02",
    "b4",
    async () => {
      reveal(
        led.missing.some((m) => m.kind === "source_data_conflict") ? "[data-conflict]" : "[data-ledger]",
        "center",
      );
      for (let i = 0; i < kinds.length; i++) await item("le.missing", i, { id: kinds[i], wait: 300 });
    },
    {
      text: led.missing.length
        ? `${plural(led.missing.length, "item")} the paper cannot use: ${kinds
            .map((k) => `${led.missing.filter((m) => m.kind === k).length} ${human(k).toLowerCase()}`)
            .join(", ")}. Nothing is written to fill them.`
        : "Nothing is missing.",
    },
  );
}
export function evidenceSummary() {
  const led = file("EvidenceLedger.json");
  if (!led) {
    const r = LIVE.summary.S02 as
      | { values?: number; spans?: number; recomputed?: number; mismatched?: number; references?: number }
      | undefined;
    if (r?.values == null) return "The evidence ledger is built.";
    return `${plural(r.references ?? 0, "reference")}, ${plural(r.values, "ledger value")}, ${plural(r.spans ?? 0, "quotable sentence")}; ${r.recomputed ?? 0} values recomputed, ${r.mismatched ?? 0} differ.`;
  }
  const differ = led.recomputed.filter((r) => !r.match).length;
  return `${plural(led.references.length, "reference")}, ${plural(led.ledger.length, "ledger value")}, ${plural(led.spans.length, "quotable sentence")}; ${led.recomputed.length} values recomputed, ${differ ? `${differ} differ` : "none differ"}.`;
}
