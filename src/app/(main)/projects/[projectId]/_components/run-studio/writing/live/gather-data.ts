/* ===== What the data screens read from a live run's files: the package part by part, the intake's checks and limits =====
   The run hands over its experiment result package (the same schema as the preview's, platform.experiment_result/v1).
   The details of each part are read from it here, as the preview reads its own package in data/intake.ts. What the
   intake concluded on each check comes from IntakeChecks.json, never from these functions. */

import type { Erp, Treatment } from "../data/erp";
import { erpAnalyses, erpCounts } from "../data/erp";
import type { Ceiling } from "../data/frame";
import { file, LIVE } from "./run";
import type {
  ChainLink,
  ClaimCeilingFile,
  DataReportFile,
  IntakeCheck,
  IntakeIssue,
  LinkChainFile,
  Tone,
} from "./types";

/* ---------- formats ---------- */
/** 0.1113 → "0.111", −0.0311 → "−0.031". */
export const fmt3 = (v: number) => (v < 0 ? `−${Math.abs(v).toFixed(3)}` : v.toFixed(3));
export const fmtCi = (lo: number | null, hi: number | null) =>
  lo == null || hi == null ? "" : `[${fmt3(lo)}, ${fmt3(hi)}]`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-27T10:50:10Z" → "27 Oct 10:50:10", or "27 Oct 10:50" without seconds (UTC, as the package records). */
export const fmtTime = (iso: string, seconds = false) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  const s = seconds ? `:${String(d.getUTCSeconds()).padStart(2, "0")}` : "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${hm}${s}`;
};
/** How long from one time to another, in words: "1 min 16 s", "12 h". */
export function span(from: string, to: string) {
  const s = Math.round(Math.abs(Date.parse(to) - Date.parse(from)) / 1000);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h < 48 ? `${h} h${m ? ` ${m} min` : ""}` : `${Math.round(h / 24)} days`;
}
export const short = (sha: string) => sha.slice(0, 8);
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "H3", "H5", "H6" → "H3, H5 and H6". */
export const listed = (xs: string[]) =>
  xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
/** Run ids in runs of consecutive numbers: t06 … t15 → "t06–t15"; others are listed. */
export function idRange(ids: string[]) {
  const parsed = ids.map((id) => /^(.*?)(\d+)$/.exec(id));
  if (ids.length < 3 || parsed.some((p) => !p)) return ids.join(", ");
  const out: string[] = [];
  let i = 0;
  while (i < ids.length) {
    let j = i;
    const [, pre, num] = parsed[i] as RegExpExecArray;
    while (
      j + 1 < ids.length &&
      (parsed[j + 1] as RegExpExecArray)[1] === pre &&
      Number((parsed[j + 1] as RegExpExecArray)[2]) === Number(num) + (j + 1 - i)
    )
      j++;
    out.push(j - i >= 2 ? `${ids[i]}–${ids[j]}` : ids.slice(i, j + 1).join(", "));
    i = j + 1;
  }
  return out.join(", ");
}
/** An engine's text as a reader reads it: its timestamps as times, its Python booleans as words. */
export const tidy = (text: string) =>
  text
    .replace(/\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/g, (iso) =>
      fmtTime(iso, true),
    )
    .replace(/: True\b/g, ": yes")
    .replace(/: False\b/g, ": no");
/** "source_data_conflict" → "Source data conflict". */
/** Ids in natural order: H1, H2, H3 … H10; A2-below after A2. */
export const byId = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true });
/** A sentence as a reader expects it: its first letter capital. */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const human = (k: string) => {
  const s = k.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* ---------- how strongly the paper may speak ---------- */
/**
 * The frame's claim strengths, weakest first (the ceiling is one of them), each with the words the engine's style rules
 * read as that strength: a sentence with a stronger word than the ceiling is sent back.
 */
export const LADDER: { k: Ceiling["strength"]; verb: string; words: string }[] = [
  { k: "none", verb: "observe", words: "states a result, no claim verb" },
  { k: "suggest", verb: "suggest", words: "may, might, could" },
  { k: "indicate", verb: "indicate", words: "indicates, indicated" },
  { k: "show", verb: "show", words: "demonstrate, confirm, prove" },
];
/**
 * Why the ceiling is what it is, read from the study's profile by the frame's own rules: one site keeps a finding at
 * "indicate", a plan locked after the analysis at "suggest", intervals without p-values rule out "significant", a
 * claim that is not causal rules out causes. A reason the profile does not bear out is left out.
 */
export function ceilingWhy(rep: DataReportFile, ceil: ClaimCeilingFile) {
  const p = rep.profile;
  const c = ceil.ceiling;
  const sites = Number(p.sites);
  const out: Partial<Record<"strength" | "significant" | "causes" | "confirmatory", string>> = {};
  if (ceil.blocked) out.strength = "The record is blocked: a must field is missing or a rule of the frame is broken.";
  else if (p.phase === "proposal") out.strength = "A proposal has no results to claim.";
  else if (c.strength === "suggest" && p.plan === "after")
    out.strength = "The plan was locked after the data were analysed, so a finding may only suggest.";
  else if (c.strength === "indicate" && sites === 1)
    out.strength = "The study has one site, so a finding may indicate at most; “show” needs more than one.";
  else if (c.strength === "show" && sites > 1) out.strength = `The study has ${sites} sites, so a finding may show.`;
  if (c.significant === "never" && p.tests && p.tests !== "p-values")
    out.significant = `The study reports ${String(p.tests)}, not p-values.`;
  if (c.causes === "never")
    out.causes =
      p.claim && p.claim !== "causal"
        ? `The claim is ${String(p.claim)}, not causal.`
        : p.design && p.design !== "experiment"
          ? `The design is ${String(p.design)}, not an experiment.`
          : undefined;
  if (p.plan === "before" && c.confirmatory) out.confirmatory = "The plan was locked before the runs.";
  else if (p.plan === "after" && !c.confirmatory)
    out.confirmatory = "The plan was locked after the data were analysed.";
  return out;
}

/* ---------- the parts of the package, as the intake checks them ---------- */
export interface Part {
  k: string;
  n: string;
  icon: string;
  /** Where it sits in the package, or that it comes from the record. */
  src: string;
  /** The step of the intake that checks it. */
  step: "a1" | "a2" | "a3";
  checks: (IntakeCheck & { key: string; index: number })[];
}
const PART_META: Record<string, { n: string; icon: string; step: Part["step"] }> = {
  package: { n: "Package", icon: "package", step: "a1" },
  protocol: { n: "Locked protocol", icon: "lock", step: "a1" },
  environment: { n: "Data and environment", icon: "layers", step: "a1" },
  runs: { n: "Runs", icon: "list", step: "a2" },
  results: { n: "Results", icon: "table", step: "a2" },
  deviations: { n: "Deviations", icon: "compare", step: "a3" },
  figures: { n: "Figures", icon: "graph", step: "a3" },
  sources: { n: "Sources", icon: "book", step: "a3" },
};
/** What a part holds, in a few plain words read from the package. */
function partSrc(k: string, erp: Erp | undefined) {
  if (!erp) return "";
  const counts = erpCounts(erp);
  const lock = erp.protocol.lock;
  const amend = erp.protocol.amendments.length;
  switch (k) {
    case "package":
      return `${erp.erp_id} v${erp.version}, ${erp.status}`;
    case "protocol": {
      const when = !lock
        ? "Not locked"
        : Date.parse(lock.frozen_at) < Date.parse(erp.execution.started_at)
          ? "Locked before the first run"
          : "Locked after the first run";
      return `${when} · ${amend ? plural(amend, "amendment") : "no amendments"}`;
    }
    case "environment":
      return "Data, code and environments";
    case "runs":
      return `${plural(counts.planned, "job")}, ${plural(counts.attempts, "attempt")}`;
    case "results":
      return `${plural(erp.results.observations.length, "observation")}, ${plural(erp.results.comparisons.length, "comparison")}, ${plural(erp.results.descriptives.length, "descriptive")}`;
    case "deviations":
      return erp.protocol.deviations.length ? `${erp.protocol.deviations.length} declared` : "None declared";
    case "figures":
      return plural(erp.figures.length, "figure");
    case "sources":
      return "From the research record, outside the package";
    default:
      return human(k);
  }
}
/** The parts in the order the intake reads them, with the checks the intake made on each (in its file's order). */
export function intakeParts(): Part[] {
  const erp = file("experiment_result.json");
  const checks = file("IntakeChecks.json")?.checks ?? [];
  const keys = [...Object.keys(PART_META), ...checks.map((c) => c.part).filter((p) => !(p in PART_META))];
  let index = 0;
  const parts = [...new Set(keys)].map((k): Part => {
    const meta = PART_META[k] ?? { n: human(k), icon: "file", step: "a3" as const };
    return { k, ...meta, src: partSrc(k, erp), checks: [] };
  });
  // Checks are made part by part, so the order they are made in is the parts' order.
  for (const p of parts)
    for (const c of checks.filter((x) => x.part === p.k))
      p.checks.push({ ...c, key: `${c.part}:${c.check_id}`, index: index++ });
  return parts;
}
export const allChecks = (parts: Part[]) => parts.flatMap((p) => p.checks);

/* ---------- what the paper cannot use, one group per kind ---------- */
export interface LimitGroup {
  kind: string;
  tone: Exclude<Tone, "ok">;
  head: string;
  /** What it means for the paper, in a few words. */
  means: string;
  part: string | null;
  check: string | null;
  /** The items, those with the same reason together. */
  reasons: { ids: string[]; why: string; meta: [string, string][] }[];
}
const _are = (ids: string[], one: string, many: string) => (ids.length === 1 ? one : many);
/* Each kind of item: a short title that counts it, and what it means for the paper in a few words. */
const KIND: Record<string, { head(ids: string[]): string; means: string; part: string; check?: string; bad?: true }> = {
  deferred_hypothesis: {
    head: (ids) => (ids.length === 1 ? "1 hypothesis deferred" : `${ids.length} hypotheses deferred`),
    means: "Named as not tested; never argued",
    part: "protocol",
    check: "deferred",
  },
  unused_input: {
    head: (ids) => `${plural(ids.length, "input")} not used`,
    means: "Left out of the planned models",
    part: "environment",
  },
  source_quarantined: {
    head: (ids) => `${plural(ids.length, "source")} quarantined`,
    means: "Never cited",
    part: "sources",
    check: "resolve",
  },
  source_unresolved: {
    head: (ids) => `${plural(ids.length, "source")} unresolved`,
    means: "Never cited until it resolves",
    part: "sources",
    check: "resolve",
  },
  source_data_conflict: {
    head: (ids) =>
      ids.length === 1 ? "A value conflicts with the package" : `${ids.length} values conflict with the package`,
    means: "Not printed until it is settled",
    part: "runs",
    bad: true,
  },
  cite_only: {
    head: (ids) => `${plural(ids.length, "source")} cite-only`,
    means: "May be cited, never quoted",
    part: "sources",
    check: "cite_only",
  },
};
/** What an item of a kind does to the paper, in a few words ("Never cited"). */
export const kindMeans = (kind: string) => KIND[kind]?.means ?? "";
/* What an item of each kind is called in a sentence (one, many) and the word for its state. */
const KIND_NAME: Record<string, [string, string, string]> = {
  deferred_hypothesis: ["Hypothesis", "Hypotheses", "deferred"],
  unused_input: ["Input group", "Input groups", "not used"],
  source_quarantined: ["Source", "Sources", "quarantined"],
  source_unresolved: ["Source", "Sources", "unresolved"],
  source_data_conflict: ["Value", "Values", "conflicts with the package"],
  cite_only: ["Source", "Sources", "cite-only"],
};
/** Items of a kind by their plain name, their ids and their state: "Hypothesis H4 (deferred)". */
export function itemsName(kind: string, ids: string[]) {
  const [one, many, state] = KIND_NAME[kind] ?? ["Item", "Items", human(kind).toLowerCase()];
  return `${ids.length === 1 ? one : many} ${listed(ids)} (${state})`;
}
/**
 * The one colour meaning of a kind of item for the paper: a source that failed its check or a value in conflict is
 * blocked (red); a source cited but never quoted is written with care (amber); the rest are simply not claimed (grey).
 */
export function kindTone(kind: string): "bad" | "look" | "none" {
  if (kind === "source_quarantined" || kind === "source_data_conflict") return "bad";
  if (kind === "cite_only") return "look";
  return "none";
}
/** "Named as not tested" → "named as not tested": a clause after a name. */
export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const META_KEYS: [keyof IntakeIssue, string][] = [
  ["severity", "Severity"],
  ["needs", "Needs"],
  ["owner", "Owner"],
  ["route", "Goes to"],
];
export function limitGroups(issues: IntakeIssue[], parts: Part[]): LimitGroup[] {
  const kinds = [...new Set(issues.map((i) => i.kind))];
  // What blocks comes first, cite-only (the mildest) last; the rest in the order the intake named them.
  const rank = (g: LimitGroup) => (g.tone === "bad" ? 0 : g.kind === "cite_only" ? 2 : 1);
  return kinds.map(groupOf).sort((a, b) => rank(a) - rank(b));
  function groupOf(kind: string): LimitGroup {
    const items = issues.filter((i) => i.kind === kind);
    const k = KIND[kind];
    const ids = items.map((i) => i.id);
    const all = allChecks(parts);
    // The check it comes from: the one whose evidence is the item's own reason, else the check of its kind.
    const named = all.find((c) => items.some((i) => c.evidence === i.why));
    const check = named ?? all.find((c) => c.part === k?.part && c.check_id === k?.check);
    const reasons: LimitGroup["reasons"] = [];
    for (const i of items) {
      const meta = META_KEYS.filter(([f]) => i[f]).map(([f, label]): [string, string] => [label, String(i[f])]);
      const same = reasons.find((r) => r.why === i.why && !meta.length && !r.meta.length);
      if (same) same.ids.push(i.id);
      else reasons.push({ ids: [i.id], why: i.why, meta });
    }
    const bad = Boolean(k?.bad) || items.some((i) => i.severity === "critical");
    return {
      kind,
      tone: bad ? "bad" : "warn",
      head: k ? k.head(ids) : `${human(kind)}: ${listed(ids)}`,
      // A critical item says who must settle it.
      means: items.some((i) => i.severity === "critical" && i.owner)
        ? `Needs the ${items.find((i) => i.owner)?.owner} team`
        : (k?.means ?? ""),
      part: check?.part ?? k?.part ?? null,
      check: check?.key ?? null,
      reasons,
    };
  }
}

/* ---------- the verdicts the run gave, for the analyses of the results part ---------- */
const VERDICT_TEXT: Record<string, [string, Tone | "na"]> = {
  supported: ["Supported", "ok"],
  not_shown: ["Not shown", "warn"],
  "not shown": ["Not shown", "warn"],
  contradicted: ["Contradicted", "bad"],
  deferred: ["Deferred", "na"],
};
export const verdictText = (v: string): [string, Tone | "na"] => VERDICT_TEXT[v] ?? [human(v), "na"];
export const isHypLink = (c: ChainLink | ChainEntry): c is ChainLink => "hypothesis_id" in c;
/** An exploratory analysis in the chain: it has no hypothesis. */
export interface AnalysisLink {
  analysis_id: string;
  class: string;
  comparisons: string[];
  descriptives: string[];
  added_after_lock: boolean;
}
export type ChainEntry = ChainLink | AnalysisLink;
export const chainOf = (f: LinkChainFile | undefined) => (f?.chain ?? []) as ChainEntry[];
/** Each hypothesis's verdict: from the link chain once it is in, else as the intake's decision-rule check states it. */
export function verdicts(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of chainOf(file("LinkChain.json"))) if (isHypLink(c)) out[c.hypothesis_id] = c.verdict;
  if (Object.keys(out).length) return out;
  const rule = file("IntakeChecks.json")?.checks.find((c) => c.part === "results" && c.check_id === "rule");
  for (const seg of rule?.evidence.split(/;\s*/) ?? []) {
    const m = /^(H\w+)\s+(.+)$/.exec(seg.trim());
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

/* ---------- the details of each part, read from the package ---------- */
type Spec = Erp["protocol"]["specification"] & {
  tuning?: { procedure?: string; data?: string; selection_metric?: string };
  preprocessing?: { step: string; fitted_on?: string }[];
};
export const specOf = (erp: Erp) => erp.protocol.specification as Spec;

export function packageFacts(erp: Erp): [string, string][] {
  const a = erp.quality.assurance;
  return [
    ["Package", `${erp.erp_id} v${erp.version} · ${erp.status}`],
    ...(erp.supersedes_version != null ? [["Supersedes", `v${erp.supersedes_version}`] as [string, string]] : []),
    ["Built", `${fmtTime(erp.generated_at)} by ${erp.generated_by}`],
    ["Assurance", `${a.achieved ?? "not decided"} achieved, ${a.target} targeted`],
    ...(a.conditions.length ? [["Conditions", a.conditions.join(" · ")] as [string, string]] : []),
    ...(a.unmet.length ? [["Not met", a.unmet.join(" · ")] as [string, string]] : []),
    ...(erp.conventions.notes.length ? [["Conventions", erp.conventions.notes.join(" · ")] as [string, string]] : []),
  ];
}

export function planFacts(erp: Erp): [string, string][] {
  const s = erp.protocol.specification;
  return [
    ["Question", s.question],
    ["Objective", s.objective],
    ["Population", s.population],
    ["Claim", `${human(s.claim_kind)} · ${s.classification.strategy}`],
    ["Decision rule", s.decision_rule],
    ["Exclusion rule", s.exclusion_rule],
  ].filter(([, v]) => v) as [string, string][];
}
export interface PlanEvent {
  at: string;
  x: string;
  sub?: string;
  k: "plan" | "run" | "dev" | "ana" | "pkg";
}
/** When each thing happened, in order: the lock, the first run, each deviation, each analysis added, the package. */
export function planEvents(erp: Erp, lockedAt?: string, firstRunAt?: string): PlanEvent[] {
  const lock = erp.protocol.lock;
  const first = erp.execution.runs[0];
  const job = first && erp.design.jobs.find((j) => j.job_id === first.job_id);
  const events: PlanEvent[] = [
    ...(lockedAt || lock
      ? [
          {
            at: lockedAt ?? lock?.frozen_at ?? "",
            x: "Protocol locked",
            sub: lock ? `sha ${short(lock.ees_sha256)}` : undefined,
            k: "plan" as const,
          },
        ]
      : []),
    {
      at: firstRunAt ?? erp.execution.started_at,
      x: first ? `First run · ${first.run_id}` : "First run",
      sub: job ? `${job.treatment_id}${job.seed != null ? `, seed ${job.seed}` : ""}` : undefined,
      k: "run",
    },
    ...erp.protocol.deviations.map((d) => ({
      at: d.declared_at,
      x: `${d.deviation_id} declared`,
      sub: `${d.ran}, not ${d.planned}`,
      k: "dev" as const,
    })),
    ...erp.results.added_analyses.map((a) => ({
      at: a.added_at,
      x: `${a.analysis_id} added, exploratory`,
      sub: "not in the plan",
      k: "ana" as const,
    })),
    { at: erp.generated_at, x: `Package v${erp.version} built`, sub: erp.erp_id, k: "pkg" },
  ];
  return events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function envRows(erp: Erp): [string, string, string][] {
  const s = specOf(erp);
  const rows: [string, string, string][] = [];
  for (const d of erp.provenance.data)
    rows.push([
      "Dataset",
      `${d.citation} · ${d.uri}`,
      `${d.name} · ${d.version} · ${d.rows.toLocaleString("en")} rows · ${d.columns} columns · ${d.license}${d.personal_data ? " · personal data" : ""}`,
    ]);
  if (s.units.length)
    rows.push([
      "Units",
      s.units
        .map(
          (u) =>
            `${u.name}${u.nested_in ? `, nested in ${s.units.find((x) => x.unit_id === u.nested_in)?.name.toLowerCase() ?? u.nested_in}` : ""}`,
        )
        .join(" · "),
      s.units.map((u) => `${u.name}: ${u.definition}`).join(" · "),
    ]);
  const used = s.inputs.filter((g) => g.used);
  const left = s.inputs.filter((g) => !g.used);
  if (s.inputs.length)
    rows.push([
      "Inputs",
      used.map((g) => `${g.group_id}: ${g.columns} ${g.name.toLowerCase()}`).join(" · "),
      left.length ? `${listed(left.map((g) => g.group_id))} left out` : "Every input group is used",
    ]);
  // Treatments that share a model and a grid are one row: they differ only in their inputs.
  const groups = Object.values(
    Object.groupBy(s.treatments, (t) => `${t.model} ${JSON.stringify(t.grid)}`) as Record<string, Treatment[]>,
  );
  for (const ts of groups)
    rows.push([
      ts.map((t) => t.treatment_id).join(" · "),
      ts[0].model,
      `${ts.map((t) => t.inputs.join(" + ")).join(" / ")} · ${Object.entries(ts[0].grid)
        .map(([k, v]) => `${k} ∈ {${v.join(", ")}}`)
        .join(", ")}`,
    ]);
  if (s.tuning?.procedure)
    rows.push([
      "Tuning",
      s.tuning.procedure,
      [s.tuning.data && `on ${s.tuning.data}`, s.tuning.selection_metric && `chosen by ${s.tuning.selection_metric}`]
        .filter(Boolean)
        .join(" · "),
    ]);
  if (s.preprocessing?.length)
    rows.push([
      "Preprocessing",
      s.preprocessing.map((p) => p.step).join(" · "),
      [...new Set(s.preprocessing.map((p) => p.fitted_on).filter(Boolean))].map((f) => `fitted on ${f}`).join(" · "),
    ]);
  for (const c of erp.provenance.code) rows.push(["Code", c.entrypoint, `${c.command} · sha256 ${short(c.sha256)}`]);
  for (const e of erp.provenance.environments)
    rows.push([
      "Environment",
      e.runtime,
      `${e.lockfile}, ${e.packages} packages · ${e.hardware}${e.os ? ` · ${e.os}` : ""}`,
    ]);
  return rows;
}

/** The runs as a grid: one row per treatment, one column per seed, each cell the run of that job. */
export function runGrid(erp: Erp) {
  const seeds = erp.design.randomization.seeds;
  const systems =
    erp.protocol.specification.factors.find((f) => f.role === "treatment")?.levels ??
    erp.protocol.specification.treatments.map((t) => t.treatment_id);
  const runOf = (sys: string, seed: number) => {
    const job = erp.design.jobs.find((j) => j.treatment_id === sys && j.seed === seed);
    return erp.execution.runs.find((r) => r.job_id === job?.job_id);
  };
  return { seeds, systems, runOf };
}
export function runFacts(erp: Erp): [string, string][] {
  const counts = erpCounts(erp);
  const first = erp.execution.runs[0];
  const splits = erp.design.randomization.splits;
  const tests = [...new Set(splits.map((s) => s.n_test))];
  const rows: [string, string][] = [
    ["First run", `${fmtTime(erp.execution.started_at, true)}${first ? ` · ${first.run_id}, ${first.job_id}` : ""}`],
    [
      "Attempts",
      `${counts.attempts} · ${plural(counts.retries, "retry", "retries")} · ${plural(counts.byStatus.failed, "failed run")}`,
    ],
  ];
  if (splits.length)
    rows.push([
      "Splits",
      `${plural(splits.length, "split")} · ${splits[0].method} · ${tests.map((n) => n.toLocaleString("en")).join(" or ")} in each test part`,
    ]);
  rows.push(["Randomization", erp.design.randomization.method]);
  for (const t of erp.protocol.specification.treatments.filter((x) => x.role === "sensitivity"))
    rows.push([t.treatment_id, `Sensitivity only · ${t.name}`]);
  for (const f of erp.results.failures)
    rows.push([f.run_id, `${human(f.category)} · ${f.detail} · ${human(f.handling)}`]);
  return rows;
}

/** The planned gains with their interval, drawn against the null of the decision rule. */
export function gains(erp: Erp) {
  const confirmatory = erp.protocol.specification.analyses.filter((a) => a.analysis_class === "confirmatory");
  return confirmatory.flatMap((a) => {
    const c =
      erp.results.comparisons.find((x) => x.analysis_id === a.analysis_id && x.role === "primary") ??
      erp.results.comparisons.find((x) => x.comparison_id === a.analysis_id);
    if (!c || c.ci_low == null || c.ci_high == null) return [];
    return [
      {
        id: c.comparison_id,
        what: c.label,
        h: a.hypothesis_ids.join(" · "),
        v: c.estimate,
        lo: c.ci_low,
        hi: c.ci_high,
        level: c.ci_level,
        nul: a.decision?.null_value ?? 0,
        metric: erp.protocol.specification.metrics.find((m) => m.metric_id === c.metric_id)?.name ?? c.metric_id,
      },
    ];
  });
}

/** Each analysis with its estimate: its primary comparison, or the range of its descriptives. */
export function analysesOf(erp: Erp) {
  const lock = erp.protocol.lock;
  return erpAnalyses(erp).map((a) => {
    const c = erp.results.comparisons.find((x) => x.analysis_id === a.analysis_id && x.role === "primary");
    const ds = erp.results.descriptives.filter((d) => d.analysis_id === a.analysis_id);
    let est = "";
    if (c) est = `${fmt3(c.estimate)} ${fmtCi(c.ci_low, c.ci_high)}`.trim();
    else if (ds.length > 1) {
      const vs = ds.map((d) => d.value);
      est = `${ds.length} groups, ${fmt3(Math.min(...vs))}–${fmt3(Math.max(...vs))}`;
    } else if (ds[0]) est = `${fmt3(ds[0].value)} · ${ds[0].unit}${ds[0].n != null ? `, n ${ds[0].n}` : ""}`;
    const added = "added_at" in a;
    return {
      id: a.analysis_id,
      h: a.hypothesis_ids,
      kind:
        a.analysis_class === "confirmatory"
          ? "Confirmatory"
          : added
            ? `Exploratory, added ${lock ? "after the lock" : fmtTime((a as { added_at: string }).added_at)}`
            : "Exploratory",
      what: a.estimand,
      est,
      confirmatory: a.analysis_class === "confirmatory",
    };
  });
}

/** The mean of each treatment on each metric: descriptives with no analysis, all of whose runs are one treatment's. */
export function meansOf(erp: Erp) {
  const treatmentOf = (runIds: string[]) => {
    const ts = new Set(
      runIds.map((r) => {
        const run = erp.execution.runs.find((x) => x.run_id === r);
        return erp.design.jobs.find((j) => j.job_id === run?.job_id)?.treatment_id;
      }),
    );
    return ts.size === 1 ? [...ts][0] : undefined;
  };
  const cells: { t: string; m: string; v: number; id: string }[] = [];
  for (const d of erp.results.descriptives) {
    if (d.analysis_id || !d.metric_id || !d.run_ids.length) continue;
    const t = treatmentOf(d.run_ids);
    if (t) cells.push({ t, m: d.metric_id, v: d.value, id: d.descriptive_id });
  }
  const metrics = erp.protocol.specification.metrics.filter((m) => cells.some((c) => c.m === m.metric_id));
  const treatments = [...new Set(cells.map((c) => c.t))];
  return { cells, metrics, treatments, ids: new Set(cells.map((c) => c.id)) };
}

/** Other results the paper may name: comparisons not drawn above and descriptives not shown elsewhere. */
export function otherResults(erp: Erp) {
  // The analyses above show each one's primary estimate and its own descriptives; these are the rest.
  const shownAbove = new Set(erpAnalyses(erp).map((a) => a.analysis_id));
  const means = meansOf(erp).ids;
  return [
    ...erp.results.comparisons
      .filter((c) => !(c.role === "primary" && shownAbove.has(c.analysis_id)))
      .map((c) => ({
        id: c.comparison_id,
        what: `${c.label} · ${c.role}`,
        v: `${fmt3(c.estimate)} ${fmtCi(c.ci_low, c.ci_high)}`.trim(),
      })),
    ...erp.results.descriptives
      .filter((d) => !means.has(d.descriptive_id) && !(d.analysis_id && shownAbove.has(d.analysis_id)))
      .map((d) => ({
        id: d.descriptive_id,
        what: d.label,
        v: `${fmt3(d.value)} · ${d.unit}${d.n != null ? `, n ${d.n.toLocaleString("en")}` : ""}`,
      })),
  ];
}

export function deviationsOf(erp: Erp) {
  return erp.protocol.deviations.map((d) => ({
    id: d.deviation_id,
    when: fmtTime(d.declared_at),
    kind: `${human(d.kind)} · ${d.severity}`,
    plan: d.planned,
    ran: d.ran,
    why: `${d.description}. Found ${d.found.charAt(0).toLowerCase()}${d.found.slice(1)}.`,
    affects: `Runs ${idRange(d.affected_run_ids)}${d.remediation ? ` · ${d.remediation.charAt(0).toLowerCase()}${d.remediation.slice(1)}` : ""}`,
    unchanged: d.check?.verdicts_unchanged ?? null,
    check: (d.check?.results ?? []).map((r) => {
      const c = erp.results.comparisons.find((x) => x.comparison_id === r.analysis_id);
      return {
        id: r.analysis_id,
        v: `${fmt3(r.estimate)} ${fmtCi(r.ci_low, r.ci_high)}`,
        asRun: c ? `${fmt3(c.estimate)} ${fmtCi(c.ci_low, c.ci_high)}` : null,
      };
    }),
  }));
}

export function figuresOf(erp: Erp) {
  return erp.figures.map((f) => ({
    id: f.figure_id,
    t: f.title,
    chart: f.chart,
    rows: f.rows.length,
    src: f.source_ids.length > 3 ? `${f.source_ids.length} records` : f.source_ids.join(", "),
  }));
}

/** What the record says of its sources: the intake's count, and the ledger's once it is in. */
export function sourceFacts(issues: IntakeIssue[]): [string, string][] {
  const read = LIVE.summary.S00 as { sources?: number; verified?: number } | undefined;
  const refs = file("EvidenceLedger.json")?.references;
  const rows: [string, string][] = [];
  if (refs?.length)
    rows.push([
      "References",
      `${refs.length} · ${refs.filter((r) => r.status === "verified").length} verified, ${refs.filter((r) => r.quotable).length} with a text to quote`,
    ]);
  else if (read?.sources != null) rows.push(["References", `${read.sources} · ${read.verified ?? 0} verified`]);
  const q = issues.filter((i) => i.kind === "source_quarantined");
  if (q.length) rows.push(["Quarantined", q.map((i) => `${i.id}: ${i.why}`).join(" · ")]);
  const u = issues.filter((i) => i.kind === "source_unresolved");
  if (u.length)
    rows.push(["Unresolved", `${listed(u.map((i) => i.id))}: ${[...new Set(u.map((i) => i.why))].join(" · ")}`]);
  const c = issues.filter((i) => i.kind === "cite_only");
  if (c.length) rows.push(["Cite-only", c.map((i) => i.id).join(", ")]);
  return rows;
}

/** The critical items of the intake, each with the part and check it comes from and who must settle it. */
export function criticalOf(issues: IntakeIssue[], parts: Part[]) {
  const all = allChecks(parts);
  return issues
    .filter((i) => i.severity === "critical")
    .map((i) => {
      const check = all.find((c) => c.evidence === i.why);
      return { issue: i, part: check?.part ?? KIND[i.kind]?.part ?? null, check: check?.key ?? null };
    });
}
/** Who settles an item: "the experiment team" for an owner "experiment". */
export const ownerOf = (i: IntakeIssue) => (i.owner ? `the ${i.owner} team` : "the author");
