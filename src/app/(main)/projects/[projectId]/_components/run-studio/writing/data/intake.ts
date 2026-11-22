/* ===== S00 · what the experiment run hands over, and the checks the intake makes on each part ===== */
/* The run hands over one object, the experiment result package (erp.ts), plus the sources of the research record.
   The intake reads the package part by part: the package itself, the locked protocol, data and environment, the runs,
   the results, the deviations and the figures; the sources come from the record, outside the package. Every number
   shown here is read from the package, so the intake and the rest of the writing run cannot disagree. */

import {
  type Comparison,
  checkErp,
  type DecisionRule,
  type Descriptive,
  type Erp,
  erpAnalyses,
  erpCounts,
  type Treatment,
} from "./erp";
import { DROPOUT_ERP } from "./erp-dropout";

export type CheckTone = "ok" | "warn" | "bad";
export interface IntakeCheck {
  id: string;
  t: string;
  /** The evidence the check read, in a few words. */
  ev: string;
  s: CheckTone;
}
export interface IntakeSection {
  k: string;
  n: string;
  icon: string;
  /** Where it sits in the package, or that it comes from the record. */
  src: string;
  /** The step of S00 that checks it. */
  step: "a1" | "a2" | "a3";
  checks: IntakeCheck[];
}

/** The package of RUN-25CD, the run the preview writes from. */
export const ERP: Erp = DROPOUT_ERP;

const spec = ERP.protocol.specification;
const lock = ERP.protocol.lock;
const counts = erpCounts(ERP);
const deviation = ERP.protocol.deviations[0];
const comparison = (id: string) => {
  const c = ERP.results.comparisons.find((x) => x.comparison_id === id);
  if (!c) throw new Error(`The package has no comparison ${id}`);
  return c;
};
const descriptive = (id: string) => {
  const d = ERP.results.descriptives.find((x) => x.descriptive_id === id);
  if (!d) throw new Error(`The package has no descriptive ${id}`);
  return d;
};

/** 0.1113 → "0.111", −0.0311 → "−0.031". */
export const fmt3 = (v: number) => (v < 0 ? `−${Math.abs(v).toFixed(3)}` : v.toFixed(3));
const fmtCi = (lo: number | null, hi: number | null) => (lo == null || hi == null ? "" : `[${fmt3(lo)}, ${fmt3(hi)}]`);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-27T10:50:10Z" → "27 Oct 10:50:10", or "27 Oct 10:50" without seconds. */
export const fmtTime = (iso: string, seconds = false) => {
  const d = new Date(iso);
  const hm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  const s = seconds ? `:${String(d.getUTCSeconds()).padStart(2, "0")}` : "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${hm}${s}`;
};
const short = (sha: string) => sha.slice(0, 8);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const range = (ids: string[]) => (ids.length > 1 ? `${ids[0]}–${ids[ids.length - 1]}` : (ids[0] ?? ""));

/* ---------- what the package holds ---------- */
const data = ERP.provenance.data[0];
const env = ERP.provenance.environments[0];
const code = ERP.provenance.code[0];
const splits = ERP.design.randomization.splits;
const gates = ERP.quality.gates;
const outside = ERP.artifacts;
const traces = outside.filter((a) => a.kind === "trace" && a.run_id);
const checkTraces = outside.filter((a) => a.kind === "trace" && a.deviation_id);
const primary = spec.hypotheses.filter((h) => h.priority === "primary" && h.status === "planned");
const deferred = spec.hypotheses.filter((h) => h.status === "deferred");
const confirmatory = spec.analyses.filter((a) => a.analysis_class === "confirmatory");
const undated = spec.inputs.filter((g) => g.known_at == null);
const left = spec.inputs.filter((g) => !g.used);
const firstRun = ERP.execution.runs[0];
const records =
  ERP.design.jobs.length +
  ERP.execution.runs.length +
  ERP.execution.attempts.length +
  ERP.results.observations.length +
  ERP.results.descriptives.length +
  ERP.results.comparisons.length;

/** What an analysis without a comparison found: a range over its groups, or one share. */
const describe = (ds: Descriptive[]) => {
  if (ds.length > 1) {
    const vs = ds.map((d) => d.value);
    return `${ds.length} courses, ${fmt3(Math.min(...vs))}–${fmt3(Math.max(...vs))}`;
  }
  return `${((ds[0]?.value ?? 0) * 100).toFixed(1)}%`;
};
/* The decision rule of the protocol, as the package states it for each confirmatory analysis. Verdicts belong to the
   writing stage, never to the package. */
const judge = (c: Comparison, rule: DecisionRule | null): "Supported" | "Contradicted" | "Not shown" => {
  if (c.ci_low == null || c.ci_high == null) return "Not shown";
  const up = (rule?.direction ?? "greater") === "greater";
  const nul = rule?.null_value ?? 0;
  const past = up ? c.ci_low > nul : c.ci_high < nul;
  const far = Math.abs(c.estimate - nul) >= (rule?.min_effect ?? 0);
  if (past && far) return "Supported";
  return (up ? c.ci_high < nul : c.ci_low > nul) ? "Contradicted" : "Not shown";
};
export const ANALYSES: { id: string; h: string; kind: string; est: string; verdict: string; tone: CheckTone }[] =
  erpAnalyses(ERP).map((a) => {
    const h = a.hypothesis_ids.join(" · ") || "—";
    const c = ERP.results.comparisons.find((x) => x.analysis_id === a.analysis_id && x.role === "primary");
    const byCourse = ERP.results.descriptives.filter((d) => d.analysis_id === a.analysis_id);
    const est = c ? `${fmt3(c.estimate)} ${fmtCi(c.ci_low, c.ci_high)}` : describe(byCourse);
    if (a.analysis_class === "confirmatory" && c) {
      const verdict = judge(c, a.decision);
      return {
        id: a.analysis_id,
        h,
        kind: "Confirmatory",
        est,
        verdict,
        tone: verdict === "Supported" ? "ok" : "warn",
      };
    }
    return {
      id: a.analysis_id,
      h,
      kind: "added_at" in a ? "Exploratory, added after the lock" : "Exploratory",
      est,
      verdict: "Note only",
      tone: "warn",
    };
  });

const notShown = ANALYSES.filter((a) => a.verdict === "Not shown").map((a) => a.h);

export const INTAKE: IntakeSection[] = [
  {
    k: "pkg",
    n: "Package",
    icon: "package",
    src: `${ERP.schema} · ${ERP.erp_id} v${ERP.version}`,
    step: "a1",
    checks: [
      { id: "owner", t: "The record names its owner and licence", ev: `You · team of 2 · ${data.license}`, s: "ok" },
      {
        id: "status",
        t: "The package is complete, not a partial export",
        ev: `${ERP.status} · built by ${ERP.generated_by}, ${fmtTime(ERP.generated_at)}`,
        s: ERP.status === "complete" ? "ok" : "bad",
      },
      {
        id: "refs",
        t: "Every id in the package resolves",
        ev: `${records.toLocaleString("en")} records · ${plural(checkErp(ERP).length, "broken reference")}`,
        s: checkErp(ERP).length ? "bad" : "ok",
      },
      {
        id: "files",
        t: "Every file kept outside matches its sha256",
        ev: `${outside.filter((a) => a.checksum_verified).length} of ${outside.length} · the plan, ${traces.length} traces, ${checkTraces.length} check traces`,
        s: outside.every((a) => a.checksum_verified) ? "ok" : "bad",
      },
      {
        id: "gates",
        t: "Every quality gate is decided",
        ev: `${gates.filter((g) => g.status === "passed").length} of ${gates.length} passed · assurance ${ERP.quality.assurance.achieved}, target ${ERP.quality.assurance.target}`,
        s: gates.every((g) => g.status === "passed" || g.status === "not_applicable") ? "ok" : "warn",
      },
    ],
  },
  {
    k: "plan",
    n: "Locked protocol",
    icon: "lock",
    src: `protocol · specification v${spec.version}, lock, ${plural(ERP.protocol.amendments.length, "amendment")}`,
    step: "a1",
    checks: [
      {
        id: "hash",
        t: "The lock is bound to this specification and matrix",
        ev: lock ? `sha256 ${short(lock.ees_sha256)} · matrix ${short(lock.matrix_sha256)}` : "No lock",
        s: lock ? "ok" : "bad",
      },
      {
        id: "lock",
        t: "The protocol was locked before the first run",
        ev: lock
          ? `${fmtTime(lock.frozen_at, true)} → first run ${fmtTime(ERP.execution.started_at, true)}`
          : "No lock",
        s: lock && lock.frozen_at < ERP.execution.started_at ? "ok" : "bad",
      },
      {
        id: "ap",
        t: "The analysis plan is present",
        ev: `${plural(spec.analyses.length, "analysis", "analyses")} · paired bootstrap, 10,000 resamples`,
        s: "ok",
      },
      {
        id: "cover",
        t: "Every primary hypothesis has an analysis",
        ev: primary
          .map(
            (h) =>
              `${h.hypothesis_id} → ${confirmatory.find((a) => a.hypothesis_ids.includes(h.hypothesis_id))?.analysis_id}`,
          )
          .join(" · "),
        s: "ok",
      },
      {
        id: "defer",
        t: "Deferred hypotheses are named, not dropped",
        ev: `${deferred.map((h) => h.hypothesis_id).join(", ")} · each with its reason`,
        s: "ok",
      },
      {
        id: "prior",
        t: "What the team knew of the data is declared",
        ev: "Descriptor, columns, class counts · no model before the lock",
        s: "ok",
      },
      {
        id: "undated",
        t: "Every input is known at the decision point",
        ev: `${left.map((g) => g.group_id).join(" and ")} left out · ${undated.map((g) => `${g.columns} columns with no recording date`).join("")} held back`,
        s: undated.length ? "warn" : "ok",
      },
    ],
  },
  {
    k: "env",
    n: "Data and environment",
    icon: "layers",
    src: "provenance · data, code, environments",
    step: "a1",
    checks: [
      {
        id: "pin",
        t: "Every version is pinned",
        ev: `${env.lockfile} · ${env.packages} packages · sha256 ${short(env.lockfile_sha256)}`,
        s: "ok",
      },
      {
        id: "data",
        t: "The dataset, its version and licence are named",
        ev: `UCI 697 · sha256 ${short(data.sha256)} · ${data.license}`,
        s: "ok",
      },
      {
        id: "year",
        t: "Each student’s entry year is in the data",
        ev: "No year column, only the yearly macro figures",
        s: "bad",
      },
      {
        id: "model",
        t: "The models match the plan",
        ev: `Boosting encoding differs · declared as ${deviation.deviation_id}`,
        s: "warn",
      },
      { id: "tune", t: "Nothing was tuned on the test part", ev: "5-fold CV inside the training part", s: "ok" },
    ],
  },
  {
    k: "runs",
    n: "Runs",
    icon: "list",
    src: `design.jobs · execution · ${plural(counts.planned, "job")}, ${plural(counts.attempts, "attempt")}`,
    step: "a2",
    checks: [
      {
        id: "traces",
        t: "Every planned job has a completed run with its trace",
        ev: `${counts.byStatus.completed} of ${counts.planned} · ${plural(counts.retries, "retry", "retries")} · ${traces.length} traces`,
        s: counts.byStatus.completed === counts.planned ? "ok" : "bad",
      },
      {
        id: "prov",
        t: "Each run names its job, seed and split",
        ev: `split ${splits[0].hash} … ${splits[splits.length - 1].hash}`,
        s: "ok",
      },
      {
        id: "same",
        t: "Every model saw the same split in each seed",
        ev: `${data.facts.analysed.toLocaleString("en")} students · ${splits[0].n_test} in each test part`,
        s: "ok",
      },
      {
        id: "time",
        t: "Each run ran in the pinned environment",
        ev: `${counts.attempts} attempts · ${env.hardware} · ${env.lockfile}`,
        s: "ok",
      },
    ],
  },
  {
    k: "results",
    n: "Results",
    icon: "table",
    src: `results · ${ERP.results.observations.length} observations, ${ERP.results.comparisons.length} comparisons, ${ERP.results.descriptives.length} descriptives`,
    step: "a2",
    checks: [
      {
        id: "rows",
        t: "Every comparison names its analysis and its runs",
        ev: `${ERP.results.comparisons.filter((c) => c.run_ids.length).length} of ${ERP.results.comparisons.length}`,
        s: "ok",
      },
      { id: "ci", t: "Intervals use the planned bootstrap", ev: "10,000 resamples · unit = student", s: "ok" },
      {
        id: "recomp",
        t: "Every comparison can be recomputed from the observations",
        ev: `S02 recomputes all ${ERP.results.comparisons.length}`,
        s: "ok",
      },
      {
        id: "test",
        t: "Each confirmatory analysis runs the planned comparison",
        ev: `${range(confirmatory.map((a) => a.analysis_id))} · paired bootstrap`,
        s: "ok",
      },
      {
        id: "rule",
        t: "Each verdict follows the decision rule",
        ev: notShown.length
          ? `${notShown.join(" and ")} not shown: ${notShown.length === 1 ? "its interval includes" : "their intervals include"} 0`
          : "Every primary hypothesis supported",
        s: "ok",
      },
      {
        id: "expl",
        t: "Analyses added after the lock are exploratory",
        ev: ERP.results.added_analyses
          .map((a) => `${a.analysis_id} · added ${fmtTime(a.added_at)}, ${a.analysis_class}`)
          .join(" · "),
        s: ERP.results.added_analyses.every((a) => a.analysis_class === "exploratory") ? "ok" : "bad",
      },
    ],
  },
  {
    k: "dev",
    n: "Deviations",
    icon: "compare",
    src: `protocol.deviations · ${ERP.protocol.deviations.length}`,
    step: "a3",
    checks: [
      {
        id: "declared",
        t: "Every change from the plan is declared",
        ev: `${ERP.protocol.deviations.length} of ${ERP.protocol.deviations.length} · ${deviation.deviation_id}`,
        s: "ok",
      },
      {
        id: "before",
        t: `${deviation.deviation_id} was declared before the results were used`,
        ev: `Declared ${fmtTime(deviation.declared_at)}, after the first run · rerun as planned`,
        s: "warn",
      },
      {
        id: "rerun",
        t: "The planned version was run as a check",
        ev: `${deviation.check?.artifact_ids.length ?? 0} traces · ${range(deviation.check?.results.map((r) => r.analysis_id) ?? [])} verdicts unchanged`,
        s: deviation.check?.verdicts_unchanged ? "ok" : "warn",
      },
    ],
  },
  {
    k: "figs",
    n: "Figures",
    icon: "graph",
    src: `figures · ${ERP.figures.length}, each with its data`,
    step: "a3",
    checks: [
      {
        id: "figdata",
        t: "Every figure has the data behind it",
        ev: ERP.figures.map((f) => `${f.figure_id} · ${f.rows.length} rows`).join(" · "),
        s: ERP.figures.every((f) => f.rows.length && f.source_ids.length) ? "ok" : "warn",
      },
    ],
  },
  {
    k: "sources",
    n: "Sources",
    icon: "book",
    src: "research record · refs.bib, reading notes",
    step: "a3",
    checks: [
      { id: "ids", t: "Every reference has an identifier", ev: "16 DOIs, 5 stable links", s: "ok" },
      { id: "perm", t: "Every paper may be quoted", ev: "6 are abstract-only", s: "warn" },
    ],
  },
];
export const INTAKE_CHECKS = INTAKE.flatMap((sec) => sec.checks.map((c) => ({ ...c, sec: sec.k })));

/* What the output cannot support, said on the part it comes from. Named last, never filled in. */
export interface IntakeLimit {
  sec: string;
  check: string;
  tone: "bad" | "warn";
  head: string;
  paper: string;
  you: string;
}
export const INTAKE_LIMITS: IntakeLimit[] = [
  {
    sec: "env",
    check: "year",
    tone: "bad",
    head: "Nothing about change across cohorts can be written",
    paper: "No sentence compares early and late entrants. H3 is named as not tested.",
    you: "Add each student’s entry year to the data, then hold at stop 1.",
  },
  {
    sec: "plan",
    check: "undated",
    tone: "warn",
    head: "Fees, debt and scholarship are never early signs",
    paper: "They appear only in the sensitivity check, never as an input behind a finding.",
    you: "Give the date each of the three columns was recorded to use them.",
  },
  {
    sec: "sources",
    check: "perm",
    tone: "warn",
    head: "Six papers may be cited, never quoted",
    paper: "Writers cite them; no sentence quotes them and no critic argues from their full text.",
    you: "Nothing to do. The limit is applied for you.",
  },
];

/* ---------- the details of each part, read from the package ---------- */
export const PACKAGE_FACTS: [string, string][] = [
  ["Package", `${ERP.erp_id} v${ERP.version} · ${ERP.status}`],
  ["Built", `${fmtTime(ERP.generated_at)} by ${ERP.generated_by}`],
  ["Assurance", `${ERP.quality.assurance.achieved} achieved, ${ERP.quality.assurance.target} targeted`],
  ["Conditions", ERP.quality.assurance.conditions.join(" · ")],
];
export const PACKAGE_GATES = gates.map((g) => ({ id: g.gate_id, n: g.name, s: g.status }));

export const PLAN_FACTS: [string, string][] = [
  ["Question", spec.question],
  ["Decision rule", spec.decision_rule],
];
/* When each thing happened, so the order can be seen: the protocol was locked before any run. */
export const PLAN_TIMELINE: { t: string; x: string; k: "plan" | "run" | "dev" | "ana" | "pkg" }[] = [
  ...(lock ? [{ t: fmtTime(lock.frozen_at), x: "Protocol locked", k: "plan" as const }] : []),
  { t: fmtTime(ERP.execution.started_at), x: `First run · ${firstRun.run_id}`, k: "run" },
  { t: fmtTime(deviation.declared_at), x: `${deviation.deviation_id} declared`, k: "dev" },
  ...ERP.results.added_analyses.map((a) => ({
    t: fmtTime(a.added_at),
    x: `${a.analysis_id} added, exploratory`,
    k: "ana" as const,
  })),
  { t: fmtTime(ERP.generated_at), x: `Package v${ERP.version} built`, k: "pkg" },
];
export const PLAN_HYPOTHESES = spec.hypotheses.map((h) => ({
  id: h.hypothesis_id,
  t: h.statement,
  primary: h.status === "planned",
  why: h.reason,
}));

export const ENV_ROWS: [string, string, string][] = [
  [
    "Dataset",
    `${data.citation} · ${data.uri}`,
    `${data.rows.toLocaleString("en")} students · ${data.columns} columns · ${data.license}`,
  ],
  [
    "Inputs",
    spec.inputs
      .filter((g) => g.used)
      .map((g) => `${g.group_id}: ${g.columns} ${g.name.toLowerCase()}`)
      .join(" · "),
    `${left.map((g) => g.group_id).join(" and ")} left out`,
  ],
  // Treatments that share a model and a grid are one row: they differ only in their inputs.
  ...Object.values(
    Object.groupBy(spec.treatments, (t) => `${t.model} ${JSON.stringify(t.grid)}`) as Record<string, Treatment[]>,
  ).map((ts): [string, string, string] => [
    ts.map((t) => t.treatment_id).join(" · "),
    ts[0].model,
    `${ts.map((t) => t.inputs.join(" + ")).join(" / ")} · ${Object.entries(ts[0].grid)
      .map(([k, v]) => `${k} ∈ {${v.join(", ")}}`)
      .join(", ")}`,
  ]),
  ["Code", code.entrypoint, `${code.command} · sha256 ${short(code.sha256)}`],
  ["Environment", env.runtime, `${env.lockfile}, ${env.packages} packages · ${env.hardware}`],
];

export const RUN_SYSTEMS = spec.factors.find((f) => f.factor_id === "model")?.levels ?? [];
export const RUN_SEEDS = ERP.design.randomization.seeds;
/** The run of each model and seed, read through its job. */
export const runOf = (model: string, seed: number) => {
  const job = ERP.design.jobs.find((j) => j.treatment_id === model && j.seed === seed);
  return ERP.execution.runs.find((r) => r.job_id === job?.job_id);
};
export const RUN_FACTS: [string, string][] = [
  ["First run", `${fmtTime(ERP.execution.started_at, true)} · ${firstRun.run_id}, ${firstRun.job_id}`],
  [
    "Attempts",
    `${counts.attempts} · ${plural(counts.retries, "retry", "retries")} · ${plural(counts.byStatus.failed, "failed run")}`,
  ],
  [
    "Students",
    `${data.facts.analysed.toLocaleString("en")} · the same ${splits[0].n_test} in each test part for every model`,
  ],
  ["GB-ES1U", "Sensitivity only: adds the 3 undated columns"],
];

/* The planned gains with an interval, drawn against 0: a gain is concluded only if its interval stays above 0. */
export const GAINS = confirmatory.map((a) => {
  const c = comparison(a.analysis_id);
  return {
    id: c.comparison_id,
    what: c.label,
    h: a.hypothesis_ids.join(" · "),
    v: c.estimate,
    lo: c.ci_low ?? 0,
    hi: c.ci_high ?? 0,
  };
});

/** Other results the paper may name: the parts of A2, the course-level intervals, the sensitivity check and A5. */
export const OTHER_RESULTS: { id: string; what: string; v: string }[] = [
  ...["A2-below", "A2-above", "A1-course", "A3-course", "SA"].map((id) => {
    const c = comparison(id);
    return { id, what: c.label, v: `${fmt3(c.estimate)} ${fmtCi(c.ci_low, c.ci_high)}` };
  }),
  { id: "A5", what: descriptive("A5").label, v: `${(descriptive("A5").value * 100).toFixed(1)}%` },
  { id: "ceiling", what: descriptive("ceiling").label, v: fmt3(descriptive("ceiling").value) },
];

export const DEVIATION = {
  id: deviation.deviation_id,
  when: fmtTime(deviation.declared_at),
  plan: deviation.planned,
  ran: deviation.ran,
  why: `${deviation.description}. Found ${deviation.found.charAt(0).toLowerCase()}${deviation.found.slice(1)}.`,
  affects: `Runs ${range(deviation.affected_run_ids)} · ${deviation.remediation?.toLowerCase()}`,
  check: (deviation.check?.results ?? []).map((r) => ({
    id: r.analysis_id,
    v: `${fmt3(r.estimate)} ${fmtCi(r.ci_low, r.ci_high)}`,
    asRun: (() => {
      const c = comparison(r.analysis_id);
      return `${fmt3(c.estimate)} ${fmtCi(c.ci_low, c.ci_high)}`;
    })(),
  })),
};

export const FIGURES: { id: string; t: string; rows: number; src: string }[] = ERP.figures.map((f) => ({
  id: f.figure_id,
  t: f.title,
  rows: f.rows.length,
  src: f.source_ids.length > 3 ? `${f.source_ids.length} records` : f.source_ids.join(", "),
}));

export const SOURCE_FACTS: [string, string][] = [
  ["Papers read", "12 · 9 in full text"],
  ["Abstract only", "Tinto 1975, Kaufman et al. 2012 and four more"],
  ["References", "21 in refs.bib · 16 DOIs, 5 stable links"],
  ["Reading notes", "12 · 41 quoted spans"],
];
