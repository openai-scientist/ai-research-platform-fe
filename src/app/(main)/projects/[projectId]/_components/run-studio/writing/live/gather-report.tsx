"use client";
"use no memo";

/* ===== The data report: the record in one standard frame (the preview's DataReportScene, on a live run) =====
   The Data Steward lays the record into the frame field by field; code reads the study's profile, applies the frame's
   rules, checks the order of events, links each hypothesis to its results, compares the runs with the plan and sets
   the claim ceiling. Every value, status and rule shown is the data report's own. */

import { Fragment, type ReactNode, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { FRAME, FRAME_FIELDS, RESULTS_ONLY, STANDARDS } from "../data/frame";
import { ENTITY } from "../data/meta";
import { item, reveal, S, step } from "../engine";
import { AgentCursor, cn, Icon, M } from "../lib";
import { Slot, TABLE_PAD } from "../scenes-gather";
import {
  type AnalysisLink,
  byId,
  type ChainEntry,
  cap,
  ceilingWhy,
  chainOf,
  fmtTime,
  human,
  idRange,
  isHypLink,
  LADDER,
  listed,
  planEvents,
  plural,
  span,
  verdictText,
} from "./gather-data";
import { FoundChart } from "./gather-handoff-board";
import { LiveTyped, Pill, paceFor } from "./gather-kit";
import { CeilingLadder } from "./gather-report-hero";
import { need, pending as notIn, shown, streaming, WorkingHere } from "./kit";
import { Bars, scrollSoon } from "./outline-kit";
import { agentKey, file, fill, LIVE } from "./run";
import type { Tone } from "./stage-kit";
import {
  type BarRow,
  EffectList,
  type Part,
  Section,
  StageAccent,
  StatusStrip,
  SubHead,
  type Swatch,
  Takeaway,
} from "./stage-visual";
import { Term } from "./term";
import type { ClaimCeilingFile, DataReportFile, ReportField, RunFileName } from "./types";

/* How long each kind of item takes to stream, in ms at speed 1: the stage plays in well under a minute. */
const PACE = { field: 300, profile: 90, rule: 380, event: 330, chain: 320, plan: 340, ceil: 420 };

const LEVEL_TEXT: Record<string, string> = { must: "Must", should: "Should", may: "May" };
/* How much a field is asked for is not a status: one neutral badge, stronger for what must be there. */
const LEVEL_TONE: Record<string, string> = {
  must: "ring-foreground/35 text-foreground",
  should: "ring-foreground/20 text-foreground",
  may: "ring-foreground/15 text-muted-foreground",
};
const FIELD_STATE: Record<string, [string, string]> = {
  ok: ["ok", "Present"],
  partial: ["warn", "Partial"],
  warn: ["warn", "Qualified"],
  bad: ["bad", "Missing"],
  na: ["na", "Not applicable"],
};
const becomes = (to: string) =>
  to.trim() === "-" || !to.trim()
    ? "—"
    : to
        .split(" · ")
        .map((x) => ENTITY[x]?.name ?? x)
        .join(" · ");
const partName = (p: string) => FRAME.find((x) => x.p === p)?.n ?? `Part ${p}`;
const partOf = (f: ReportField) => f.field_id.split(".")[0];

/* ---------- the frame before the report is in ---------- */
/** The file each streamed list of this screen is read from. */
const FILE_OF: Record<string, RunFileName> = {
  "lr.fields": "DataReport.json",
  "lr.profile": "DataReport.json",
  "lr.rules": "DataReport.json",
  "lr.tl": "DataReport.json",
  "lr.verdict": "DataReport.json",
  "lr.chain": "LinkChain.json",
  "lr.plan": "DataReport.json",
  "lr.ceil": "ClaimCeiling.json",
};
/** How many items of a list show: none while its file is not in, the skeleton standing in their place. */
const seen = (list: string, total: number) => (notIn(FILE_OF[list]) ? 0 : shown("S01", list, total));
/**
 * The report before the Data Steward publishes it: the frame's 51 fields, the plan's lock and first run and its
 * declared deviations from the package, and the profile's questions. Nothing is laid in; every value is a skeleton.
 */
function frameOnly(): DataReportFile {
  const erp = file("experiment_result.json");
  return {
    fields: FRAME_FIELDS.map((f) => ({
      field_id: f.id,
      label: f.label,
      level: f.level,
      asked_by: f.std,
      becomes: f.to,
      status: "na",
      value: "",
      na: null,
    })),
    plan_vs_runs: {
      deviations: (erp?.protocol.deviations ?? []).map((d) => ({
        deviation_id: d.deviation_id,
        planned: d.planned,
        ran: d.ran,
      })),
      first_run_at: erp?.execution.started_at ?? "",
      locked_at: erp?.protocol.lock?.frozen_at ?? "",
    },
    profile: Object.fromEntries(Object.keys(PROFILE_LABEL).map((k) => [k, ""])),
    profile_reasons: {},
    rules: [],
  };
}

/* ---------- the stage's objects, read from its files ---------- */
interface Ev {
  at: string;
  x: string;
  sub?: string;
  k: string;
}
function events(rep: DataReportFile): Ev[] {
  const erp = file("experiment_result.json");
  const { locked_at, first_run_at } = rep.plan_vs_runs;
  if (erp) return planEvents(erp, locked_at, first_run_at);
  return [
    { at: locked_at, x: "Protocol locked", k: "plan" },
    { at: first_run_at, x: "First run", k: "run" },
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
const lockedBefore = (rep: DataReportFile) =>
  Date.parse(rep.plan_vs_runs.locked_at) < Date.parse(rep.plan_vs_runs.first_run_at);
/**
 * What the lock makes of the analyses. `brief` leaves out what the screen says elsewhere (when the plan was locked, and
 * which analyses count as tested): only what stays exploratory, and why.
 */
function lockVerdict(rep: DataReportFile, ceil: ClaimCeilingFile | undefined, brief = false) {
  const erp = file("experiment_result.json");
  const { locked_at, first_run_at } = rep.plan_vs_runs;
  const before = lockedBefore(rep);
  let v = brief
    ? ""
    : `The protocol was locked ${span(locked_at, first_run_at)} ${before ? "before" : "after"} the first run.`;
  if (!erp) return v;
  const spec = erp.protocol.specification;
  const conf = spec.analyses.filter((a) => a.analysis_class === "confirmatory").map((a) => a.analysis_id);
  const expl = spec.analyses.filter((a) => a.analysis_class !== "confirmatory").map((a) => a.analysis_id);
  const added = erp.results.added_analyses.map((a) => a.analysis_id);
  if (ceil?.ceiling.confirmatory === false) v += " Every analysis is read as exploratory.";
  else if (conf.length && !brief) v += ` ${listed(conf)} ${conf.length === 1 ? "stays" : "stay"} confirmatory.`;
  if (expl.length) v += ` ${listed(expl)} ${expl.length === 1 ? "is" : "are"} exploratory in the plan.`;
  if (added.length)
    v += ` ${listed(added)} came after the lock, so ${added.length === 1 ? "it stays" : "they stay"} exploratory.`;
  return v.trim();
}

interface ChainRow {
  key: string;
  id: string | null;
  text: string;
  sub: string;
  analyses: string[];
  results: string[];
  traces: string;
  status: [string, string];
}
/** The chain's rows: the hypotheses in natural order (H1, H2, H3 …), then the analyses with no hypothesis. */
function chainRows(): ChainRow[] {
  const rows = chainRowsAsPublished();
  return [...rows.filter((r) => r.id).sort((a, b) => byId(a.id ?? "", b.id ?? "")), ...rows.filter((r) => !r.id)];
}
function chainRowsAsPublished(): ChainRow[] {
  const erp = file("experiment_result.json");
  const spec = erp?.protocol.specification;
  const runsOf = (ids: string[]) => {
    const runs = new Set<string>();
    for (const c of erp?.results.comparisons ?? [])
      if (ids.includes(c.comparison_id)) for (const r of c.run_ids) runs.add(r);
    for (const d of erp?.results.descriptives ?? [])
      if (ids.includes(d.descriptive_id)) for (const r of d.run_ids) runs.add(r);
    return [...runs].sort();
  };
  if (notIn("LinkChain.json")) {
    if (!spec || !erp) return [];
    const planned = spec.hypotheses.filter((h) => h.status !== "deferred");
    const deferred = spec.hypotheses.filter((h) => h.status === "deferred");
    const loose = [...spec.analyses, ...erp.results.added_analyses].filter((a) => !a.hypothesis_ids.length);
    return [
      ...[...planned, ...deferred].map((h) => ({
        key: h.hypothesis_id,
        id: h.hypothesis_id,
        text: h.statement,
        sub: [human(h.priority), human(h.status), h.status === "deferred" ? h.reason : null]
          .filter(Boolean)
          .join(" · "),
        analyses: [],
        results: [],
        traces: "",
        status: ["na", ""] as [string, string],
      })),
      ...loose.map((a) => ({
        key: a.analysis_id,
        id: null,
        text: a.estimand,
        sub: "added_at" in a ? "Added after the lock" : `${human(a.analysis_class)} in the plan`,
        analyses: [a.analysis_id],
        results: [],
        traces: "",
        status: ["na", ""] as [string, string],
      })),
    ];
  }
  return chainOf(file("LinkChain.json")).map((c: ChainEntry): ChainRow => {
    if (isHypLink(c)) {
      const h = spec?.hypotheses.find((x) => x.hypothesis_id === c.hypothesis_id);
      const runs = [...new Set(c.runs.map((r) => r.run_id))].sort();
      return {
        key: c.hypothesis_id,
        id: c.hypothesis_id,
        text: h?.statement ?? c.hypothesis_id,
        sub: [h ? human(h.priority) : null, human(c.status), c.status === "deferred" ? h?.reason : null]
          .filter(Boolean)
          .join(" · "),
        analyses: c.analyses,
        results: c.comparisons,
        traces: runs.length ? idRange(runs) : "",
        status: [verdictText(c.verdict)[1], verdictText(c.verdict)[0]],
      };
    }
    const a = c as AnalysisLink;
    const plan =
      erp &&
      [...erp.protocol.specification.analyses, ...erp.results.added_analyses].find(
        (x) => x.analysis_id === a.analysis_id,
      );
    const added = erp?.results.added_analyses.find((x) => x.analysis_id === a.analysis_id);
    const results = [...a.comparisons, ...a.descriptives];
    return {
      key: a.analysis_id,
      id: null,
      text: plan?.estimand ?? a.analysis_id,
      sub: a.added_after_lock
        ? `Added after the lock${added?.reason ? ` · ${added.reason}` : ""}`
        : `${human(a.class)} in the plan`,
      analyses: [a.analysis_id],
      results: results.length > 3 ? [`${results.length} by group`] : results,
      traces: idRange(runsOf(results)),
      status: ["na", human(a.class)],
    };
  });
}

interface PlanRow {
  k: string;
  sub?: string;
  plan: string;
  ran: string;
  note?: string;
  s: "ok" | "dev" | "bad";
}
const PLAN_STATE: Record<string, [string, string]> = {
  ok: ["ok", "Matches"],
  dev: ["warn", "Declared deviation"],
  bad: ["bad", "Not run"],
};
function planRows(rep: DataReportFile): PlanRow[] {
  const erp = file("experiment_result.json");
  const rows: PlanRow[] = [];
  if (erp) {
    const done = erp.execution.runs.filter((r) => r.status === "completed");
    const jobs = done.map((r) => erp.design.jobs.find((j) => j.job_id === r.job_id)).filter(Boolean);
    const treatments = erp.protocol.specification.treatments.map((t) => t.treatment_id);
    const ranT = treatments.filter((t) => jobs.some((j) => j?.treatment_id === t));
    const seeds = erp.design.randomization.seeds;
    const ranS = seeds.filter((s) => jobs.some((j) => j?.seed === s));
    const failed = erp.execution.runs.length - done.length;
    rows.push(
      {
        k: "Treatments",
        plan: treatments.join(", "),
        ran: ranT.join(", ") || "none",
        s: ranT.length === treatments.length ? "ok" : "bad",
      },
      {
        k: "Seeds",
        plan: plural(seeds.length, "seed"),
        ran: plural(ranS.length, "seed"),
        s: ranS.length === seeds.length ? "ok" : "bad",
      },
      {
        k: "Jobs",
        plan: plural(erp.design.jobs.length, "job"),
        ran: `${done.length} completed${failed ? `, ${failed} not completed` : ""}`,
        s: done.length === erp.design.jobs.length ? "ok" : "bad",
      },
    );
  }
  for (const d of rep.plan_vs_runs.deviations) {
    const full = erp?.protocol.deviations.find((x) => x.deviation_id === d.deviation_id);
    rows.push({
      k: d.deviation_id,
      sub: full?.description,
      plan: d.planned,
      ran: d.ran,
      note: full
        ? [
            `declared ${fmtTime(full.declared_at)}`,
            full.severity,
            full.check
              ? full.check.verdicts_unchanged
                ? "rerun as planned, verdicts unchanged"
                : "rerun as planned, verdicts changed"
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : undefined,
      s: "dev",
    });
  }
  return rows;
}

interface CeilRow {
  k: string;
  t: string;
  v: string;
  why: string;
  tone: [string, string];
}
function ceilRows(ceil: ClaimCeilingFile): CeilRow[] {
  const c = ceil.ceiling as Record<string, unknown>;
  const rows: CeilRow[] = [];
  if (ceil.blocked)
    rows.push({
      k: "blocked",
      t: "The record",
      v: "Blocked",
      why: "Nothing may be claimed from it.",
      tone: ["bad", "Blocked"],
    });
  const never = (v: unknown) => String(v) === "never";
  if ("strength" in c)
    rows.push({
      k: "strength",
      t: "Strength of a finding",
      v: `At most “${String(c.strength)}”`,
      why: "The strongest verb a finding may take in the paper.",
      tone: ["warn", "Limited"],
    });
  if ("confirmatory" in c)
    rows.push({
      k: "confirmatory",
      t: "Confirmatory findings",
      v: c.confirmatory ? "Allowed for the planned analyses" : "None: every analysis is exploratory",
      why: "Whether a planned finding may be stated as tested, not as explored.",
      tone: c.confirmatory ? ["ok", "Allowed"] : ["bad", "Never"],
    });
  if ("significant" in c)
    rows.push({
      k: "significant",
      t: "“Significant”",
      v: never(c.significant) ? "Never" : human(String(c.significant)),
      why: "Whether a finding may be called significant.",
      tone: never(c.significant) ? ["bad", "Never"] : ["warn", "Limited"],
    });
  if ("causes" in c)
    rows.push({
      k: "causes",
      t: "Causes",
      v: never(c.causes) ? "Never" : human(String(c.causes)),
      why: "Whether a sentence may say what causes the outcome.",
      tone: never(c.causes) ? ["bad", "Never"] : ["warn", "Limited"],
    });
  for (const [k, v] of Object.entries(c))
    if (!["strength", "confirmatory", "significant", "causes"].includes(k))
      rows.push({ k, t: human(k), v: String(v), why: "", tone: ["na", "Set"] });
  return rows;
}

const PROFILE_LABEL: Record<string, string> = {
  claim: "Claim",
  design: "Design",
  task: "Task",
  metric: "Metric",
  phase: "Phase",
  plan: "Plan lock",
  split: "Split",
  sites: "Sites",
  groups: "Groups",
  time: "Order in time",
  uncertainty: "Uncertainty",
  tests: "Tests",
  deviations: "Deviations",
  cite_only: "Cite-only sources",
};
const profileValue = (v: string | number | boolean) => {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return cap(String(v));
};
const profileEntries = (rep: DataReportFile) => Object.entries(rep.profile);

/* ---------- what each check came to ---------- */
function stepResult(k: string, rep: DataReportFile, ceil?: ClaimCeilingFile): { k: string; label: string } {
  const st = S.st.S01;
  const now = st?.status === "running" && st.cur === k;
  const pending = (busy: string, idle: string) => ({ k: now ? "now" : "wait", label: now ? busy : idle });
  const fields = rep.fields;
  if (k === "r1") {
    // Before the report is in, the Data Steward is at work on it.
    if (notIn("DataReport.json") && LIVE.calls.some((c) => c.stage === "S01" && !c.done))
      return { k: "now", label: "Being laid out" };
    const n = seen("lr.fields", fields.length);
    if (n < fields.length) return pending(`${n} of ${fields.length} fields`, `${fields.length} fields`);
    const partial = fields.filter((f) => f.status === "partial").length;
    const qual = fields.filter((f) => f.status === "warn").length;
    const bad = fields.filter((f) => f.status === "bad").length;
    if (bad) return { k: "bad", label: `${bad} missing` };
    if (partial || qual)
      return {
        k: "warn",
        label: [partial && `${partial} partial`, qual && `${qual} qualified`].filter(Boolean).join(" · "),
      };
    return { k: "ok", label: "Complete" };
  }
  if (k === "r2") {
    if (seen("lr.rules", rep.rules.length) < rep.rules.length || seen("lr.profile", 1) < 1)
      return pending("Reading the profile", "Not read yet");
    const bad = rep.rules.some((r) => r.status === "bad");
    return rep.rules.length
      ? { k: bad ? "bad" : "warn", label: `${plural(rep.rules.length, "rule")} fired` }
      : { k: "ok", label: "No rule fired" };
  }
  if (k === "r3") {
    if (seen("lr.verdict", 1) < 1) return pending("Comparing times", "Not checked yet");
    return lockedBefore(rep) ? { k: "ok", label: "Before the runs" } : { k: "bad", label: "After the runs" };
  }
  if (k === "r4") {
    const rows = chainRows();
    const n = seen("lr.chain", rows.length);
    if (!rows.length) return { k: "wait", label: "No link chain" };
    if (n < rows.length) return pending(`${n} of ${rows.length} linked`, "Not linked yet");
    const hyps = chainOf(file("LinkChain.json")).filter(isHypLink);
    const deferred = hyps.filter((h) => h.status === "deferred").length;
    return { k: "ok", label: `${hyps.length - deferred} linked · ${deferred} deferred` };
  }
  if (k === "r5") {
    const rows = planRows(rep);
    if (seen("lr.plan", rows.length) < rows.length) return pending("Comparing", "Not compared yet");
    if (rows.some((r) => r.s === "bad")) return { k: "bad", label: "Runs missing" };
    const dev = rows.filter((r) => r.s === "dev").length;
    return dev
      ? { k: "warn", label: `${plural(dev, "deviation")}, declared` }
      : { k: "ok", label: "No deviation declared" };
  }
  if (!ceil) return { k: "wait", label: "Not set yet" };
  const rows = ceilRows(ceil);
  if (seen("lr.ceil", rows.length) < rows.length) return pending("Setting it", "Not set yet");
  return ceil.blocked ? { k: "bad", label: "Blocked" } : { k: "ok", label: `At most “${ceil.ceiling.strength}”` };
}

/* One line that says what the Data Steward or the code is doing right now. */
function reportNow(rep: DataReportFile, ceil?: ClaimCeilingFile) {
  const st = S.st.S01;
  if (st?.status !== "running") return null;
  const last = (list: string) => Math.max(0, (S.n[list] ?? 0) - 1);
  if (st.cur === "r1") {
    const f = rep.fields[last("lr.fields")];
    return f ? `${partName(partOf(f))} · ${f.field_id} ${f.label}` : null;
  }
  if (st.cur === "r2") {
    const r = rep.rules[last("lr.rules")];
    if (r && S.n["lr.rules"]) return `Rule ${r.code} fires on ${r.field}`;
    const [k, v] = profileEntries(rep)[last("lr.profile")] ?? [];
    return k ? `Reading the study's profile · ${PROFILE_LABEL[k] ?? human(k)}: ${profileValue(v)}` : null;
  }
  if (st.cur === "r3") return `Comparing the protocol lock with the first run · ${events(rep)[last("lr.tl")]?.x ?? ""}`;
  if (st.cur === "r4") {
    const c = chainRows()[last("lr.chain")];
    return c
      ? c.id
        ? `Linking ${c.id} to its analyses, results and runs`
        : `Linking ${c.analyses[0]}, which has no hypothesis`
      : null;
  }
  if (st.cur === "r5") {
    const r = planRows(rep)[last("lr.plan")];
    return r ? `${r.k} · planned ${r.plan}, ran ${r.ran}` : null;
  }
  if (st.cur === "r6" && ceil) return `Setting what the paper may say · ${ceilRows(ceil)[last("lr.ceil")]?.t ?? ""}`;
  return null;
}

/** The data report's counts, one definition for every screen: a field is present when it states a value (a rule may
 *  qualify it); partial when it states that the record lacks it. */
export function fieldCounts(fields: ReportField[]) {
  const present = fields.filter((f) => f.status === "ok" || f.status === "warn").length;
  const partial = fields.filter((f) => f.status === "partial").length;
  const qualified = fields.filter((f) => f.status === "warn").length;
  const missing = fields.filter((f) => f.status === "bad").length;
  return { present, partial, qualified, missing };
}

/* ----- the standard frame, field by field, every part open ----- */
/** How much a field is asked for, as a quiet outline badge: it is not a status. */
function FieldLevel({ f }: { f: ReportField }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-1.5 font-medium text-[11px] ring-1 ring-inset",
        LEVEL_TONE[f.level],
      )}
    >
      {LEVEL_TEXT[f.level] ?? f.level}
    </span>
  );
}
const ATTENTION = new Set(["partial", "warn", "bad"]);
/** A field that needs attention: partial, qualified by a rule, or missing. */
const needsCare = (f: ReportField) => ATTENTION.has(f.status);
/** A field's status as a mark of the one colour system: present, qualified, partial, missing, not applicable. */
const FIELD_SWATCH: Partial<Record<string, Swatch>> = {
  ok: "ok",
  warn: "lookSoft",
  partial: "look",
  bad: "bad",
  na: "none",
};
const FIELD_CARD: Record<string, string> = {
  partial: "bg-amber-50/60 ring-amber-600/25 dark:bg-amber-950/20 dark:ring-amber-400/20",
  warn: "bg-amber-50/40 ring-amber-600/20 dark:bg-amber-950/15 dark:ring-amber-400/15",
  bad: "bg-rose-50/60 ring-rose-600/25 dark:bg-rose-950/20 dark:ring-rose-400/20",
};
/** The fields by status, in the order of the chart: present in full, present with a rule, partial, missing, n/a. */
function fieldParts(fields: ReportField[]): Part[] {
  const by = (s: string) => fields.filter((f) => f.status === s).length;
  return [
    { key: "ok", label: "Present", value: by("ok"), swatch: "ok" },
    { key: "warn", label: "Present, qualified by a rule", value: by("warn"), swatch: "lookSoft" },
    { key: "partial", label: "Partial", value: by("partial"), swatch: "look" },
    { key: "bad", label: "Missing", value: by("bad"), swatch: "bad" },
    { key: "na", label: "Not applicable", value: by("na"), swatch: "none" },
  ];
}

function FieldCard({
  f,
  i,
  n,
  filling,
  rulesOn,
  rep,
}: {
  f: ReportField;
  i: number;
  n: number;
  filling: boolean;
  rulesOn: number;
  rep: DataReportFile;
}) {
  const on = i < n;
  const [tone, label] = FIELD_STATE[f.status] ?? ["na", human(f.status)];
  const rules = rep.rules.filter((r, ri) => r.field === f.field_id && ri < rulesOn);
  const value = fill(f.value);
  const cps = paceFor(value, PACE.field);
  return (
    <li
      data-field={f.field_id}
      data-cursor={`field:${f.field_id}`}
      className={cn(
        "flex min-w-0 scroll-mt-4 flex-col gap-2 rounded-lg px-3.5 py-3 ring-1 ring-inset transition-shadow duration-300",
        on && FIELD_CARD[f.status] ? FIELD_CARD[f.status] : "ring-foreground/10",
        filling && i === n - 1 && "ring-2 ring-sky-500/60",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-[13.5px] leading-5">
          <b className="font-semibold">{f.label}</b>{" "}
          <span className="whitespace-nowrap font-mono text-[11.5px] text-muted-foreground">{f.field_id}</span>
        </span>
        <span className="shrink-0">
          <Slot on={on} w="w-16">
            <Pill k={tone}>{label}</Pill>
          </Slot>
        </span>
      </span>
      <Slot on={on} w={i % 3 ? "w-2/3" : "w-5/6"}>
        <span
          className={cn(
            "block text-pretty break-words text-[13.5px] leading-[1.45]",
            f.status === "na" && "text-muted-foreground",
          )}
        >
          <LiveTyped text={value} on={streaming("lr.fields", f.field_id)} cps={cps} />
        </span>
        {f.status === "na" && f.na && (
          <span className="mt-1 block text-[12.5px] text-muted-foreground">Not applicable: {f.na}</span>
        )}
        {rules.map((r) => (
          <M
            as="span"
            key={r.code}
            in="fade"
            dur={300}
            className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-100/70 px-2 py-1.5 text-[12.5px] text-amber-950 leading-snug dark:bg-amber-900/30 dark:text-amber-100"
          >
            <Icon n="alert" className="mt-px size-3.5 shrink-0" />
            <span>
              Rule <b className="font-semibold font-mono">{r.code}</b>: {r.text}
            </span>
          </M>
        ))}
      </Slot>
      <span className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-foreground/10 pt-2 text-[12px] text-muted-foreground">
        <span>
          Goes into <span className="text-foreground">{becomes(f.becomes)}</span>
        </span>
        <FieldLevel f={f} />
        {RESULTS_ONLY.has(f.field_id) && <span>With results</span>}
        {f.asked_by.length > 0 && <span className="font-mono text-[11.5px]">{f.asked_by.join(" · ")}</span>}
      </span>
    </li>
  );
}

function ReportFrame({ live, rep }: { live: boolean; rep: DataReportFile }) {
  const st = S.st.S01;
  const n = seen("lr.fields", rep.fields.length);
  const filling = live && st?.status === "running" && st.cur === "r1";
  const rulesOn = seen("lr.rules", rep.rules.length);
  const parts = [...new Set(rep.fields.map(partOf))];
  const asked = new Set(rep.fields.flatMap((f) => f.asked_by.map((a) => a.split(" ")[0])));
  return (
    <div data-frame data-out="DataReport.json" className="@container scroll-mt-4">
      {/* The codes under each field name the checklists that ask for it. */}
      <dl className="flex flex-wrap gap-x-4 gap-y-1 border-b px-4 py-2.5 text-[12.5px] text-muted-foreground sm:px-5">
        <dt className="font-medium text-foreground">Asked by</dt>
        {Object.keys(STANDARDS)
          .filter((k) => asked.has(k))
          .map((k) => (
            <div key={k} className="flex gap-1.5" title={STANDARDS[k].x}>
              <dt className="font-medium font-mono text-foreground">{k}</dt>
              <dd>{STANDARDS[k].n}</dd>
            </div>
          ))}
        <div className="flex gap-1.5">
          <dt className="font-medium text-foreground">With results</dt>
          <dd>not asked of a study proposal</dd>
        </div>
      </dl>
      <ul className="flex flex-col">
        {parts.map((p) => {
          const all = rep.fields.filter((f) => partOf(f) === p);
          const laid = all.filter((f) => rep.fields.indexOf(f) < n);
          const care = laid.filter(needsCare);
          return (
            <li
              key={p}
              data-part={p}
              className="flex scroll-mt-4 flex-col gap-3 border-t px-4 py-4 first:border-t-0 sm:px-5"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono font-semibold text-xs">
                  {p}
                </span>
                <h4 className="min-w-0 font-semibold text-[14px]">{partName(p)}</h4>
                <StatusStrip
                  label={`The fields of ${partName(p)}`}
                  items={all.map((f) => ({
                    key: f.field_id,
                    swatch: rep.fields.indexOf(f) < n ? (FIELD_SWATCH[f.status] ?? "none") : "wait",
                    text:
                      rep.fields.indexOf(f) < n
                        ? `${f.label} (${f.field_id}): ${(FIELD_STATE[f.status] ?? ["", human(f.status)])[1].toLowerCase()}`
                        : `${f.label} (${f.field_id}): not laid yet`,
                  }))}
                />
                <span className="ml-auto flex items-center gap-2 text-[12.5px] text-muted-foreground tabular-nums">
                  {care.length > 0 && <Pill k="warn">{plural(care.length, "needs attention", "need attention")}</Pill>}
                  {laid.length < all.length ? `${laid.length} of ${all.length} laid` : plural(all.length, "field")}
                </span>
              </div>
              <ul className="grid @3xl:grid-cols-2 gap-2.5">
                {all.map((f) => (
                  <FieldCard
                    key={f.field_id}
                    f={f}
                    i={rep.fields.indexOf(f)}
                    n={n}
                    filling={filling}
                    rulesOn={rulesOn}
                    rep={rep}
                  />
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ----- r3 · was the plan locked before the first run? ----- */
/* The lock takes its verdict's colour; a deviation is to look at; the rest are plain marks on the line. */
const EVENT_DOT: Record<string, string> = {
  run: "bg-foreground/40",
  dev: "bg-amber-500",
  ana: "bg-foreground/40",
  pkg: "bg-foreground/40",
};
/** Whether the plan was locked before the runs, in a few words, once the step has told it. */
function lockAside(rep: DataReportFile) {
  if (seen("lr.verdict", 1) < 1) return null;
  const gap = span(rep.plan_vs_runs.locked_at, rep.plan_vs_runs.first_run_at);
  const before = lockedBefore(rep);
  return (
    <Pill k={before ? "ok" : "bad"}>
      {before ? `Yes, ${gap} before the first run` : `No, ${gap} after the first run`}
    </Pill>
  );
}
function Timeline({ rep, ceil }: { rep: DataReportFile; ceil?: ClaimCeilingFile }) {
  const evs = events(rep);
  const n = seen("lr.tl", evs.length);
  const told = seen("lr.verdict", 1) > 0;
  const before = lockedBefore(rep);
  const verdict = lockVerdict(rep, ceil, true);
  return (
    <div data-timeline className="scroll-mt-4">
      <div className="px-4 pt-5 pb-4 sm:px-5">
        <ol
          className="relative grid gap-3 sm:grid-cols-[repeat(var(--n),minmax(0,1fr))] sm:gap-2"
          style={{ "--n": evs.length } as React.CSSProperties}
        >
          <span
            aria-hidden="true"
            className="absolute top-[6px] h-0.5 rounded-full bg-border max-sm:hidden"
            style={{ left: `${50 / evs.length}%`, right: `${50 / evs.length}%` }}
          />
          {evs.map((e, i) => {
            const on = i < n;
            const writing = streaming("lr.tl", String(i));
            const plan = e.k === "plan";
            return (
              <li
                key={`${e.k}:${e.x}`}
                data-cursor={`tl:${i}`}
                className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
              >
                <span
                  className={cn(
                    "relative size-3.5 shrink-0 rounded-full ring-4 ring-card transition-colors duration-300",
                    !on && "bg-muted",
                    on && (plan ? (before ? "bg-emerald-500" : "bg-rose-500") : EVENT_DOT[e.k]),
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:items-center">
                  <Slot on={on} w="w-20">
                    <b
                      className={cn(
                        "block font-medium text-[13.5px] leading-tight",
                        plan && !before && "text-rose-700 dark:text-rose-300",
                        plan && before && "text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      <LiveTyped text={e.x} on={writing} />
                    </b>
                  </Slot>
                  <Slot on={on} w="w-16">
                    <span className="block font-mono text-[11.5px] text-muted-foreground tabular-nums">
                      {fmtTime(e.at, true)}
                    </span>
                    {e.sub && (
                      <span className="block text-[12px] text-muted-foreground leading-snug">
                        <LiveTyped text={e.sub} on={writing} after={e.x.length} />
                      </span>
                    )}
                  </Slot>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {verdict && (
        <p
          aria-hidden={told ? undefined : true}
          className={cn(
            "border-t bg-muted/30 px-4 py-2.5 text-[13.5px] transition-opacity duration-300 sm:px-5",
            !told && "opacity-0",
          )}
        >
          <LiveTyped text={verdict} on={streaming("lr.verdict", "0")} />
        </p>
      )}
    </div>
  );
}

/* ----- r4 · each hypothesis to its analyses, its results and its runs ----- */
const ids = (xs: string[]) =>
  xs.length ? (
    xs.map((id, i) => (
      // A list of ids wraps between ids, never inside one ("A2-below").
      <Fragment key={id}>
        <span className="whitespace-nowrap">{id}</span>
        {i < xs.length - 1 && ", "}
      </Fragment>
    ))
  ) : (
    <span className="text-muted-foreground">—</span>
  );
function ChainView() {
  const st = S.st.S01;
  const rows = chainRows();
  const n = seen("lr.chain", rows.length);
  const linking = st?.status === "running" && st.cur === "r4";
  return (
    <div data-chain data-out="LinkChain.json" className="@container scroll-mt-4">
      {rows.length ? (
        <Table className="table-fixed text-[13.5px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 sm:pl-5">Hypothesis</TableHead>
              <TableHead className="@max-3xl:hidden w-20">Analysis</TableHead>
              <TableHead className="@max-3xl:hidden w-36">Results</TableHead>
              <TableHead className="@max-3xl:hidden w-24">Runs</TableHead>
              <TableHead className="@max-xl:hidden w-32 pr-4 sm:pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c, i) => {
              const on = i < n;
              const status = <Pill k={c.status[0]}>{c.status[1]}</Pill>;
              return (
                <TableRow
                  key={c.key}
                  data-cursor={`chain:${c.key}`}
                  data-state={linking && i === n - 1 ? "selected" : undefined}
                  className="duration-300"
                >
                  <TableCell className={cn(TABLE_PAD, "sm:first:pl-5")}>
                    <span className="flex gap-2.5">
                      <span className="w-7 shrink-0 font-mono text-[11.5px] text-muted-foreground leading-5">
                        {c.id ?? ""}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-pretty font-medium leading-5">{c.text}</span>
                        {c.sub && <span className="text-pretty text-[12.5px] text-muted-foreground">{c.sub}</span>}
                        <span className="@3xl:hidden">
                          <Slot on={on} w="w-1/2">
                            <span className="block font-mono text-xs">
                              {c.analyses.length
                                ? [c.analyses.join(", "), c.results.join(", "), c.traces].filter(Boolean).join(" → ")
                                : "No analysis"}
                            </span>
                            <span className="mt-1.5 block @xl:hidden">{status}</span>
                          </Slot>
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  {[c.analyses, c.results, c.traces ? [c.traces] : []].map((v, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: the three links of a chain, always in this order
                    <TableCell key={j} className={cn(TABLE_PAD, "@max-3xl:hidden font-mono text-xs leading-5")}>
                      <Slot on={on} w="w-10">
                        {ids(v)}
                      </Slot>
                    </TableCell>
                  ))}
                  <TableCell className={cn(TABLE_PAD, "@max-xl:hidden sm:last:pr-5")}>
                    <Slot on={on} w="w-20">
                      {status}
                    </Slot>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : notIn("LinkChain.json") ? (
        <div aria-hidden="true" className="flex flex-col gap-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2.5">
              <Skeleton className="h-2.5 w-5 animate-none rounded-full" />
              <Skeleton className={cn("h-2.5 animate-none rounded-full", i % 2 ? "w-1/2" : "w-3/4")} />
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-[13.5px] text-muted-foreground">The run published no link chain.</p>
      )}
    </div>
  );
}

/* ----- r5 · the runs against the plan ----- */
function PlanRun({ rep }: { rep: DataReportFile }) {
  const st = S.st.S01;
  const rows = planRows(rep);
  const n = seen("lr.plan", rows.length);
  const comparing = st?.status === "running" && st.cur === "r5";
  return (
    <div data-planrun className="@container scroll-mt-4">
      <Table className="table-fixed text-[13.5px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="@max-xl:w-[40%] w-[30%] pl-4 sm:pl-5">Setting</TableHead>
            <TableHead className="@max-xl:hidden">Planned</TableHead>
            <TableHead>Ran</TableHead>
            <TableHead className="@max-xl:hidden w-44 pr-4 sm:pr-5">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const on = i < n;
            const [mk, label] = PLAN_STATE[r.s];
            const status = <Pill k={mk}>{label}</Pill>;
            return (
              <TableRow
                key={r.k}
                data-cursor={`plan:${r.k}`}
                data-state={comparing && i === n - 1 ? "selected" : undefined}
                className="duration-300"
              >
                <TableCell className={cn(TABLE_PAD, "sm:first:pl-5")}>
                  <span className="block font-medium leading-5">{r.k}</span>
                  {r.sub && (
                    <span className="mt-0.5 block text-pretty text-[12.5px] text-muted-foreground">{r.sub}</span>
                  )}
                  <span className="mt-1 block @xl:hidden text-[12.5px] text-muted-foreground">Planned {r.plan}</span>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-xl:hidden text-pretty text-muted-foreground leading-5")}>
                  {r.plan}
                </TableCell>
                <TableCell className={TABLE_PAD}>
                  <Slot on={on} w="w-1/2">
                    <span
                      className={cn(
                        "block text-pretty leading-5",
                        r.s === "bad" && "font-medium text-destructive",
                        r.s === "dev" && "text-amber-800 dark:text-amber-300",
                      )}
                    >
                      <LiveTyped text={r.ran} on={streaming("lr.plan", r.k)} />
                    </span>
                    {r.note && <span className="mt-1 block text-[12.5px] text-muted-foreground">{r.note}</span>}
                    <span className="mt-1.5 block @xl:hidden">{status}</span>
                  </Slot>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-xl:hidden sm:last:pr-5")}>
                  <Slot on={on} w="w-20">
                    {status}
                  </Slot>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ----- r2 · the study's profile, and the rules of the frame it sets off ----- */
function ProfileCard({ rep }: { rep: DataReportFile }) {
  const entries = profileEntries(rep);
  const n = seen("lr.profile", entries.length);
  const rulesOn = seen("lr.rules", rep.rules.length);
  return (
    <div data-profile className="flex scroll-mt-4 flex-col gap-4 px-4 py-4 sm:px-5">
      <dl className="columns-2 gap-2 md:columns-3 xl:columns-4">
        {entries.map(([k, v], i) => {
          const on = i < n;
          const reason = rep.profile_reasons[k];
          // A reason that only repeats the value says nothing more.
          const why = reason && reason.trim().toLowerCase() !== String(v).toLowerCase() ? cap(reason) : "";
          return (
            <div
              key={k}
              data-cursor={`profile:${k}`}
              className="mb-2 min-w-0 break-inside-avoid rounded-lg bg-muted/40 px-3 py-2.5"
            >
              <dt className="text-[12px] text-muted-foreground">{PROFILE_LABEL[k] ?? human(k)}</dt>
              <dd className="min-w-0">
                <Slot on={on} w="w-20">
                  <b className="block font-semibold text-[14px] leading-5">{profileValue(v)}</b>
                  {why && (
                    <span className="block text-pretty text-[12px] text-muted-foreground leading-snug">
                      <LiveTyped text={why} on={streaming("lr.profile", k)} cps={paceFor(why, PACE.profile * 3)} />
                    </span>
                  )}
                </Slot>
              </dd>
            </div>
          );
        })}
      </dl>
      <div className="flex flex-col gap-2">
        <SubHead
          title="Rules of the frame this profile sets off"
          tells="A rule that fires qualifies a field: the paper must say the limit it names."
          aside={rep.rules.length ? plural(rep.rules.length, "rule") : undefined}
        />
        {rep.rules.length ? (
          <ul className="flex flex-wrap gap-2">
            {rep.rules.map((r, i) => {
              const f = rep.fields.find((x) => x.field_id === r.field);
              return (
                <li
                  key={r.code}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] ring-1 ring-inset transition-opacity duration-300",
                    i < rulesOn
                      ? "bg-amber-50/60 ring-amber-600/20 dark:bg-amber-950/20 dark:ring-amber-400/20"
                      : "opacity-40 ring-foreground/10",
                  )}
                >
                  <Icon n="alert" className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <b className="font-mono font-semibold text-[12.5px]">{r.code}</b>
                  <span className="text-muted-foreground">on</span>
                  <span className="min-w-0 truncate">{f?.label ?? r.field}</span>
                  <span className="font-mono text-[11.5px] text-muted-foreground">{r.field}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13.5px] text-muted-foreground">
            {rulesOn || seen("lr.profile", entries.length) === entries.length ? "No rule of the frame fired." : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/** The Data Steward, if the engine named it for this stage's model call. */
const steward = () => {
  const c = LIVE.calls.find((x) => x.stage === "S01" && x.agent);
  return c ? agentKey(c.agent) : null;
};

/* ---------- what the stage did: the takeaway, its figures and charts, and its six checks ---------- */
/** A ceiling's reason, said after a name: "never written: the claim is predictive, not causal." */
const because = (why: string | undefined, fallback: string) =>
  why ? `${fallback}: ${why.charAt(0).toLowerCase()}${why.slice(1).replace(/\.?$/, ".")}` : `${fallback}.`;
/** Whether the ceiling is set and shown: every row of it streamed, or the stage over. */
function ceilingReady(ceil?: ClaimCeilingFile) {
  if (!ceil) return false;
  return S.st.S01?.status === "done" || seen("lr.ceil", ceilRows(ceil).length) === ceilRows(ceil).length;
}
/** The hypotheses the experiment tested, and what the link chain says of each. */
function tested() {
  const all = chainOf(file("LinkChain.json")).filter(isHypLink);
  const hyps = all.filter((h) => h.status !== "deferred");
  const by = (v: string) => hyps.filter((h) => h.verdict === v).length;
  return {
    all,
    hyps,
    supported: by("supported"),
    contradicted: by("contradicted"),
    others: hyps.length - by("supported") - by("contradicted"),
    deferred: all.length - hyps.length,
  };
}
const CHECKS: { k: string; title: string; sel: string }[] = [
  { k: "r1", title: "Lay the record into the frame", sel: "[data-frame]" },
  { k: "r2", title: "Read the profile, apply the rules", sel: "[data-profile]" },
  { k: "r3", title: "Was the plan locked first?", sel: "[data-timeline]" },
  { k: "r4", title: "Link each hypothesis to its result", sel: "[data-chain]" },
  { k: "r5", title: "Compare the runs with the plan", sel: "[data-planrun]" },
  { k: "r6", title: "Set the claim ceiling", sel: "[data-ceiling]" },
];
const CHECK_TONE: Record<string, Tone | "wait" | "now"> = {
  ok: "ok",
  warn: "look",
  bad: "bad",
  now: "now",
  wait: "wait",
};

/* ---------- the record laid into the standard frame: one square per field, part by part ---------- */
const SQUARE: Record<string, string> = {
  ok: "bg-emerald-500 dark:bg-emerald-400",
  warn: "bg-amber-300 dark:bg-amber-200",
  partial: "bg-amber-500 dark:bg-amber-400",
  bad: "bg-rose-500 dark:bg-rose-400",
  na: "bg-stone-300 dark:bg-stone-600",
};
function CoverageMap({ rep, n, onPick }: { rep: DataReportFile; n: number; onPick(): void }) {
  const parts = [...new Set(rep.fields.map(partOf))];
  return (
    <ul className="flex flex-col gap-1">
      {parts.map((p) => {
        const all = rep.fields.filter((f) => partOf(f) === p);
        const care = all.filter((f) => rep.fields.indexOf(f) < n && needsCare(f)).length;
        return (
          <li key={p} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] items-center gap-3">
            <span className="min-w-0 truncate text-[13px]">
              {partName(p)} <span className="font-mono text-[11px] text-muted-foreground">{p}</span>
            </span>
            <button
              type="button"
              onClick={onPick}
              className="flex flex-wrap gap-1"
              aria-label={`${partName(p)}: open its fields`}
            >
              {all.map((f) => {
                const laid = rep.fields.indexOf(f) < n;
                return (
                  <span
                    key={f.field_id}
                    title={`${f.label}: ${laid ? (fieldParts([f]).find((x) => x.value)?.label ?? f.status).toLowerCase() : "not laid yet"}`}
                    className={cn(
                      "size-4 rounded-[4px] transition-colors duration-300",
                      laid ? (SQUARE[f.status] ?? SQUARE.na) : "ring-1 ring-foreground/20 ring-inset",
                    )}
                  />
                );
              })}
            </button>
            <span
              className={cn(
                "text-right text-[12px] tabular-nums",
                care ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground",
              )}
            >
              {care ? `${care} to look at` : plural(all.length, "field")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- the six checks as the order they ran in: a line of steps, each with what it found ---------- */
const STEP_MARK: Record<string, { n: string; c: string }> = {
  ok: { n: "check", c: "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-emerald-950" },
  look: { n: "alert", c: "bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950" },
  bad: { n: "x", c: "bg-rose-500 text-white dark:bg-rose-400 dark:text-rose-950" },
  none: { n: "minus", c: "bg-muted text-muted-foreground" },
  wait: { n: "minus", c: "bg-muted text-muted-foreground" },
  now: { n: "play", c: "bg-sky-500 text-white dark:bg-sky-400 dark:text-sky-950" },
};
function CheckLine({
  items,
}: {
  items: { key: string; title: string; result: string; tone: string; onPick(): void }[];
}) {
  return (
    <ol className="relative grid gap-3 @3xl:grid-cols-6">
      <span
        aria-hidden="true"
        className="absolute top-3 right-[8%] left-[8%] hidden h-px bg-foreground/15 @3xl:block"
      />
      {items.map((x, i) => {
        const m = STEP_MARK[x.tone] ?? STEP_MARK.none;
        return (
          <li key={x.key} className="relative">
            <button
              type="button"
              onClick={x.onPick}
              className="flex w-full items-start gap-2.5 rounded-lg p-1 text-left hover:bg-muted/50 @3xl:flex-col @3xl:items-center @3xl:text-center"
            >
              <span
                className={cn(
                  "relative z-10 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-background",
                  m.c,
                )}
              >
                <Icon n={m.n} className="size-3.5" sw={3} />
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                <span className="block text-pretty font-medium text-[12.5px] leading-snug">{x.title}</span>
                <span className="block text-pretty text-[12px] text-muted-foreground leading-snug">{x.result}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ReportOverview({ rep, ceil }: { rep: DataReportFile; ceil?: ClaimCeilingFile }) {
  const st = S.st.S01;
  const done = st?.status === "done";
  const failed = S.lifecycle === "failed" && st?.status === "running";
  const ready = ceilingReady(ceil);
  const c = ceil?.ceiling;
  const blocked = Boolean(ceil?.blocked);
  const why = ceil && !notIn("DataReport.json") ? ceilingWhy(rep, ceil) : {};
  // The figures grow with the fields laid so far; once laid, they are the report's own counts.
  const n = seen("lr.fields", rep.fields.length);
  const laid = rep.fields.slice(0, n);
  const counts = fieldCounts(laid);
  const _care = laid.filter(needsCare);
  const total = rep.fields.length;
  const t = tested();
  const chain = chainRows();
  const chainIn = done || (chain.length > 0 && seen("lr.chain", chain.length) === chain.length);
  let headline: ReactNode = blocked
    ? "The record is blocked: the paper may claim nothing from it."
    : (why.strength ?? `A finding may say at most “${c?.strength}”.`);
  if (!blocked && t.hyps.length)
    headline = `${headline} ${t.supported} of ${plural(t.hyps.length, "tested hypothesis", "tested hypotheses")} ${t.supported === 1 ? "is" : "are"} supported.`;
  if (failed) headline = `The data report stopped: ${S.failure}`;
  const parts = [...new Set(rep.fields.map(partOf))];
  const _rows: BarRow[] = parts.map((p) => {
    const all = rep.fields.filter((f) => partOf(f) === p);
    const laidHere = all.filter((f) => rep.fields.indexOf(f) < n);
    const careHere = laidHere.filter(needsCare).length;
    return {
      key: p,
      name: `${partName(p)} (${p})`,
      label: (
        <>
          {partName(p)} <span className="font-mono text-[11px] text-muted-foreground">{p}</span>
        </>
      ),
      parts: fieldParts(laidHere),
      total: all.length,
      end: careHere ? (
        <span className="font-medium text-amber-700 dark:text-amber-300">{careHere} to look at</span>
      ) : (
        plural(all.length, "field")
      ),
    };
  });
  const _hypStrip = t.all.map((h) => {
    const [word, tone] = verdictText(h.status === "deferred" ? "deferred" : h.verdict);
    const sw: Swatch = tone === "ok" ? "ok" : tone === "warn" ? "look" : tone === "bad" ? "bad" : "none";
    return { key: h.hypothesis_id, swatch: sw, text: `${h.hypothesis_id}: ${word.toLowerCase()}` };
  });
  return (
    <Section
      icon="target"
      title="What this stage did"
      tells="Six checks on the record, and from them how strongly the paper may claim."
      data-overview
    >
      <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
        <Takeaway ready={ready || failed}>{headline}</Takeaway>
        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-muted/25 p-4 ring-1 ring-foreground/5">
            <SubHead
              title={`The record in the standard frame: ${plural(total, "field")}`}
              tells="One square per field the frame asks of a study's record, part by part. Green: stated; light amber: stated, with a rule; amber: partial; red: missing. Hover a square for its name."
              aside={n < total ? `${n} of ${total} laid` : `${counts.present} of ${total} present`}
            />
            <CoverageMap rep={rep} n={n} onPick={() => scrollSoon("[data-frame]")} />
          </div>
          <div className="flex min-w-0 flex-col gap-4 rounded-lg bg-muted/25 p-4 ring-1 ring-foreground/5">
            {!ready ? (
              <Bars n={3} last="w-1/2" />
            ) : blocked ? (
              <p className="font-medium text-[14px] text-rose-700 dark:text-rose-300">
                The record is blocked: no claim verb is allowed.
              </p>
            ) : (
              c && <CeilingLadder strength={c.strength} />
            )}
            {chainIn && t.all.length > 0 && (
              <div className="flex flex-col gap-2">
                <SubHead
                  title="Each hypothesis, by what the record decided"
                  tells="From the link chain: hypothesis to analysis to result."
                />
                <ul className="flex flex-wrap gap-1.5">
                  {t.all.map((h) => {
                    const [word, tone] = verdictText(h.status === "deferred" ? "deferred" : h.verdict);
                    return (
                      <li
                        key={h.hypothesis_id}
                        className={cn(
                          "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] ring-1 ring-inset",
                          tone === "ok"
                            ? "bg-emerald-50 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-800"
                            : tone === "warn"
                              ? "bg-amber-50 ring-amber-300 dark:bg-amber-950/40 dark:ring-amber-800"
                              : tone === "bad"
                                ? "bg-rose-50 ring-rose-300 dark:bg-rose-950/40 dark:ring-rose-800"
                                : "bg-muted ring-foreground/10",
                        )}
                      >
                        <b className="font-mono font-semibold">{h.hypothesis_id}</b>
                        <span>{word.toLowerCase()}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <SubHead title="The six checks, in the order they ran" tells="Click one to read it in full." />
          <CheckLine
            items={CHECKS.map((x) => {
              const r = stepResult(x.k, rep, ceil);
              return {
                key: x.k,
                title: x.title,
                result: r.label,
                tone: CHECK_TONE[r.k] ?? "none",
                onPick: () => scrollSoon(x.sel),
              };
            })}
          />
        </div>
      </div>
    </Section>
  );
}

/* ---------- what it means for the paper: the claim verbs it may use, and the fields it must write with care ---------- */
function ReportPaper({ rep, ceil }: { rep: DataReportFile; ceil?: ClaimCeilingFile }) {
  const c = ceil?.ceiling;
  const blocked = Boolean(ceil?.blocked);
  const why = ceil && !notIn("DataReport.json") ? ceilingWhy(rep, ceil) : {};
  const at = c ? LADDER.findIndex((r) => r.k === c.strength) : -1;
  const erp = file("experiment_result.json");
  const conf = (erp?.protocol.specification.analyses ?? [])
    .filter((a) => a.analysis_class === "confirmatory")
    .map((a) => a.analysis_id);
  // The rules for every sentence stream with the ceiling's rows, in their order.
  const crows = ceil ? ceilRows(ceil) : [];
  const on = ceil ? (S.st.S01?.status === "done" ? crows.length : seen("lr.ceil", crows.length)) : 0;
  const shownRows = new Set(crows.slice(0, on).map((r) => r.k));
  const rules: { key: string; item: string; effect: string; tone: Tone }[] = [];
  if (blocked && shownRows.has("blocked"))
    rules.push({
      key: "blocked",
      item: "The record",
      effect: "is blocked: nothing may be claimed from it.",
      tone: "bad",
    });
  if (c && !blocked && at >= 0 && shownRows.has("strength"))
    rules.push({
      key: "strength",
      item: "Every finding",
      effect: `takes “${LADDER[at].verb}” or a weaker verb${
        at < LADDER.length - 1 ? `; ${listed(LADDER.slice(at + 1).map((r) => `“${r.verb}”`))} is never used` : ""
      }.`,
      tone: "look",
    });
  if (c && shownRows.has("confirmatory"))
    rules.push(
      c.confirmatory
        ? {
            key: "confirmatory",
            item: "Confirmatory findings",
            effect: `${conf.length ? `${listed(conf)} ${conf.length === 1 ? "is" : "are"} reported as tested` : "allowed"}${
              why.confirmatory ? `; ${why.confirmatory.charAt(0).toLowerCase()}${why.confirmatory.slice(1)}` : "."
            }`,
            tone: "ok",
          }
        : {
            key: "confirmatory",
            item: "Confirmatory findings",
            effect: because(why.confirmatory, "none; every analysis is reported as explored"),
            tone: "none",
          },
    );
  if (c?.significant === "never" && shownRows.has("significant"))
    rules.push({
      key: "significant",
      item: "“Significant”",
      effect: because(why.significant, "never written"),
      tone: "none",
    });
  if (c?.causes === "never" && shownRows.has("causes"))
    rules.push({ key: "causes", item: "“Causes”", effect: because(why.causes, "never written"), tone: "none" });
  for (const r of crows.slice(0, on))
    if (!["blocked", "strength", "confirmatory", "significant", "causes"].includes(r.k))
      rules.push({ key: r.k, item: r.t, effect: r.v, tone: "none" });
  const n = seen("lr.fields", rep.fields.length);
  const care = rep.fields.slice(0, n).filter(needsCare);
  const careItems = care.map((f) => {
    const rule = rep.rules.find((r) => r.field === f.field_id);
    const state =
      f.status === "partial"
        ? "partial, the record lacks part of it"
        : f.status === "bad"
          ? "missing"
          : `qualified by the rule “${rule?.code ?? "of the frame"}”`;
    return {
      key: f.field_id,
      item: f.label,
      id: f.field_id,
      effect: `${state}; goes into ${listed(becomes(f.becomes).split(" · "))}.`,
      tone: (f.status === "bad" ? "bad" : "look") as Tone,
    };
  });
  return (
    <Section
      icon="pen"
      title="What it means for the paper"
      tells="How strongly every sentence may speak, and which fields the paper must write with care."
      data-ceiling
      data-out="ClaimCeiling.json"
    >
      <div className="flex flex-col gap-5 px-4 py-4 sm:px-5">
        <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <SubHead title="Rules for every sentence" tells="Set by the claim ceiling, from the study's profile." />
            {rules.length ? <EffectList items={rules} /> : <Bars n={3} last="w-1/2" className="py-2" />}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <SubHead
              title="Fields to write with care"
              tells="Each one is partial, missing or qualified by a rule, and lands in the part of the paper named."
              aside={care.length ? plural(care.length, "field") : undefined}
            />
            {careItems.length ? (
              <EffectList items={careItems} />
            ) : n === rep.fields.length && n > 0 ? (
              <p className="py-2 text-[13.5px] text-muted-foreground">Every field is stated in full.</p>
            ) : (
              <Bars n={3} last="w-1/2" className="py-2" />
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function ReportLive({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const st = S.st.S01;
  const done = st?.status === "done";
  // The frame stands from the start; the report is laid into it as it is published.
  const rep = file("DataReport.json") ?? frameOnly();
  const ceil = file("ClaimCeiling.json");
  const erp = file("experiment_result.json");
  let target: string | null = null;
  const last = (list: string) => Math.max(0, (S.n[list] ?? 0) - 1);
  if (st?.cur === "r1" && S.n["lr.fields"]) target = `field:${rep.fields[last("lr.fields")]?.field_id}`;
  // What the Data Steward or the code does now, in the section it fills.
  const now = (k: string) => (live && st?.status === "running" && st.cur === k ? reportNow(rep, ceil) : null);
  const n = seen("lr.fields", rep.fields.length);
  const care = rep.fields.slice(0, n).filter(needsCare).length;
  const entries = profileEntries(rep);
  const chain = chainRows();
  const plan = planRows(rep);
  const chainDone = seen("lr.chain", chain.length) === chain.length && chain.length > 0;
  const planDone = seen("lr.plan", plan.length) === plan.length;
  return (
    <StageAccent accent="sky">
      <div ref={host} className="relative flex min-w-0 flex-col gap-5">
        {!done && notIn("DataReport.json") && <WorkingHere sid="S01" task={/^data-report/} />}
        <ReportOverview rep={rep} ceil={ceil} />
        <ReportPaper rep={rep} ceil={ceil} />
        <Section
          icon="table"
          title="The record in the standard frame"
          tells={`The ${plural(rep.fields.length, "field")} reviewers expect, what the record says for each, and the part of the paper it goes into.`}
          now={now("r1")}
          aside={
            n < rep.fields.length ? (
              `${n} of ${rep.fields.length} laid`
            ) : care ? (
              <Pill k="warn">{plural(care, "needs attention", "need attention")}</Pill>
            ) : (
              plural(n, "field")
            )
          }
        >
          <ReportFrame live={live} rep={rep} />
        </Section>
        <Section
          icon="gauge"
          title="The study's profile"
          tells="How the frame reads this study: these answers decide which rules apply and where the claim ceiling sits."
          now={now("r2")}
          aside={plural(entries.length, "answer")}
        >
          <ProfileCard rep={rep} />
        </Section>
        <Section
          icon="lock"
          title="Was the plan locked before the runs?"
          tells={
            <>
              A <Term t="protocol lock">plan locked</Term> before any result existed lets the planned tests count as
              confirmatory.
            </>
          }
          now={now("r3")}
          aside={lockAside(rep)}
        >
          <Timeline rep={rep} ceil={ceil} />
        </Section>
        <Section
          icon="link"
          title="Each hypothesis to its result"
          tells="Every hypothesis traced to the analysis that tests it, its results and its runs; the chart shows what each comparison found."
          now={now("r4")}
          aside={chainDone ? stepResult("r4", rep, ceil).label : undefined}
        >
          <ChainView />
          {erp && (
            <div className="border-t">
              <div className="px-4 pt-4 sm:px-5">
                <SubHead title="What the experiment found" />
              </div>
              <FoundChart
                erp={erp}
                drawn={done || (!notIn("LinkChain.json") && seen("lr.chain", chain.length) > 0)}
                bare
              />
            </div>
          )}
        </Section>
        <Section
          icon="compare"
          title="The runs against the plan"
          tells="What ran differently from the plan; each difference is a deviation the paper must report."
          now={now("r5")}
          aside={planDone ? stepResult("r5", rep, ceil).label : undefined}
        >
          <PlanRun rep={rep} />
        </Section>
        <p className="flex items-start gap-2 px-1 text-[13px] text-muted-foreground">
          <Icon n="info" className="mt-0.5 size-3.5 shrink-0" />
          <span>
            The data report checks that the record is complete and consistent. Whether the method is sound is not
            decided here: it is argued in the debate, with this report as a ground.
          </span>
        </p>
        <AgentCursor
          agent={live && st?.status === "running" && S.lifecycle === "running" && st.cur === "r1" ? steward() : null}
          host={host}
          target={target}
          version={`${S.n["lr.fields"] ?? 0}`}
        />
      </div>
    </StageAccent>
  );
}

/* ---------- how the stage plays ---------- */
export async function playReport() {
  // The Data Steward's report comes first; the link chain and the ceiling are published with it, by the code after it.
  if (!(await need("S01", "DataReport.json"))) return;
  const rep = file("DataReport.json");
  if (!rep) return;
  const f = rep.fields;
  const count = (s: string) => f.filter((x) => x.status === s).length;
  await step(
    "S01",
    "r1",
    async () => {
      for (let i = 0; i < f.length; i++) {
        // The view moves once per part, to show the whole part being filled.
        if (i === 0 || partOf(f[i - 1]) !== partOf(f[i])) reveal(`[data-part="${partOf(f[i])}"]`);
        await item("lr.fields", i, { id: f[i].field_id, wait: PACE.field });
        // The frame grows as it is laid out: the field being written stays in view.
        reveal(`[data-field="${f[i].field_id}"]`);
      }
    },
    {
      text: `${plural(new Set(f.map(partOf)).size, "part")}, ${plural(f.length, "field")}: ${fieldCounts(f).present} present${count("warn") ? ` (${count("warn")} qualified by a rule)` : ""}, ${count("partial")} partial${count("bad") ? `, ${count("bad")} missing` : ""}. Each field has its level, the standards that ask for it, and what it becomes in the paper.`,
    },
  );
  const entries = profileEntries(rep);
  await step(
    "S01",
    "r2",
    async () => {
      reveal("[data-profile]", "center");
      for (let i = 0; i < entries.length; i++) await item("lr.profile", i, { id: entries[i][0], wait: PACE.profile });
      for (let i = 0; i < rep.rules.length; i++) await item("lr.rules", i, { id: rep.rules[i].code, wait: PACE.rule });
    },
    {
      text: `The study reads as ${[rep.profile.claim, rep.profile.design, rep.profile.task].filter(Boolean).join(", ")}. ${
        rep.rules.length
          ? `${plural(rep.rules.length, "rule")} of the frame fired: ${rep.rules.map((r) => `${r.code} on ${r.field}`).join(", ")}.`
          : "No rule of the frame fired."
      }`,
    },
  );
  const evs = events(rep);
  const ceil0 = file("ClaimCeiling.json");
  await step(
    "S01",
    "r3",
    async () => {
      reveal("[data-timeline]", "center");
      for (let i = 0; i < evs.length; i++) await item("lr.tl", i, { id: String(i), wait: PACE.event });
      await item("lr.verdict", 0, { id: "0", text: lockVerdict(rep, ceil0, true) });
    },
    {
      text: `The protocol was locked ${fmtTime(rep.plan_vs_runs.locked_at, true)}; the first run started ${fmtTime(rep.plan_vs_runs.first_run_at, true)}. ${lockedBefore(rep) ? "The plan was in place before any result existed." : "The plan was locked after the runs began."}`,
    },
  );
  const chained = await need("S01", "LinkChain.json");
  const rows = chained ? chainRows() : [];
  const hyps = chainOf(file("LinkChain.json")).filter(isHypLink);
  if (chained)
    await step(
      "S01",
      "r4",
      async () => {
        reveal("[data-chain]", "center");
        for (let i = 0; i < rows.length; i++) await item("lr.chain", i, { id: rows[i].key, wait: PACE.chain });
      },
      {
        text: rows.length
          ? `${listed(hyps.filter((h) => h.status !== "deferred").map((h) => h.hypothesis_id))} link end to end${
              hyps.some((h) => h.status === "deferred")
                ? `; ${listed(hyps.filter((h) => h.status === "deferred").map((h) => h.hypothesis_id))} ${hyps.filter((h) => h.status === "deferred").length === 1 ? "is" : "are"} deferred`
                : ""
            }. ${rows.filter((r) => !r.id).length ? `${listed(rows.filter((r) => !r.id).map((r) => r.analyses[0]))} have no hypothesis: exploratory.` : ""}`.trim()
          : "The run published no link chain.",
      },
    );
  const plan = planRows(rep);
  await step(
    "S01",
    "r5",
    async () => {
      reveal("[data-planrun]", "center");
      for (let i = 0; i < plan.length; i++) await item("lr.plan", i, { id: plan[i].k, wait: PACE.plan });
    },
    {
      text: rep.plan_vs_runs.deviations.length
        ? `${plural(rep.plan_vs_runs.deviations.length, "deviation")}, declared: ${rep.plan_vs_runs.deviations.map((d) => `${d.deviation_id}, ${d.ran} instead of ${d.planned}`).join("; ")}.`
        : "No deviation from the plan is declared.",
    },
  );
  const ceil = (await need("S01", "ClaimCeiling.json")) ? file("ClaimCeiling.json") : undefined;
  if (ceil) {
    const cr = ceilRows(ceil);
    await step(
      "S01",
      "r6",
      async () => {
        reveal("[data-ceiling]", "center");
        for (let i = 0; i < cr.length; i++) await item("lr.ceil", i, { id: cr[i].k, wait: PACE.ceil });
      },
      {
        text: ceil.blocked
          ? "The record is blocked: nothing may be claimed from it."
          : `A finding may at most “${ceil.ceiling.strength}”. ${cr
              .filter((c) => c.tone[1] === "Never")
              .map((c) => c.t)
              .join(" and ")}${cr.some((c) => c.tone[1] === "Never") ? ": never." : ""}`,
      },
    );
  }
}
export function reportSummary() {
  const rep = file("DataReport.json");
  const ceil = file("ClaimCeiling.json");
  // One definition on every screen, the engine's: a qualified field states a value, so it is present; a partial is not.
  const line = (total: number, present: number, qualified: number, partial: number, strength?: string) =>
    `${plural(total, "field")} laid out: ${present} present${qualified ? ` (${qualified} qualified by a rule)` : ""}, ${partial} partial${strength ? `; a finding may at most “${strength}”` : ""}.`;
  if (!rep) {
    const r = LIVE.summary.S01 as { fields?: Partial<Record<string, number>>; ceiling?: string } | undefined;
    if (!r?.fields) return "The data report is laid out.";
    const total = Object.values(r.fields).reduce((a: number, b) => a + (b ?? 0), 0);
    const f = r.fields;
    return line(total, (f.ok ?? 0) + (f.warn ?? 0), f.warn ?? 0, f.partial ?? 0, r.ceiling);
  }
  const c = fieldCounts(rep.fields);
  return line(rep.fields.length, c.present, c.qualified, c.partial, ceil?.ceiling.strength);
}
