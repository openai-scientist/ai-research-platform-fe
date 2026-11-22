/* ===== The experiment result package (ERP): what an experiment run hands the writing stage, as one object =====
   The run's output used to arrive as files (plan.md, results.csv, analysis.json, traces/, figures/). The package holds
   the same evidence as typed parts instead: the protocol it ran under, the matrix of jobs, the runs and their
   attempts, the results, the figures' data, provenance and quality. Large files (traces, the plan document) stay
   outside the object; `artifacts` names each one with its sha256.

   Field names are snake_case: the object is a wire format, read as it is sent. A finished package never changes; a
   correction is a new version that names the one it supersedes. Every id a part names must exist where it points,
   so a number can be traced to its analysis, its runs, their jobs and the locked specification. checkErp says what
   breaks that; erpCounts gives the counts a reader would otherwise copy by hand. */

export const ERP_SCHEMA = "platform.experiment_result/v1";

export type AssuranceLevel = "E1" | "E2" | "E3" | "E4";
export type AnalysisClass = "confirmatory" | "exploratory";
export type RunStatus = "queued" | "running" | "completed" | "failed" | "skipped" | "censored" | "cancelled";

/* ---------- protocol: the locked plan, as a specification ---------- */
export interface Classification {
  objectives: (
    | "prediction"
    | "comparison"
    | "optimization"
    | "ablation"
    | "robustness"
    | "causal_effect"
    | "system_performance"
  )[];
  methods: (
    | "offline_evaluation"
    | "controlled_experiment"
    | "benchmark"
    | "simulation"
    | "online_ab"
    | "observational_evaluation"
  )[];
  strategy: "exploratory" | "confirmatory" | "sequential" | "iterative";
  result_kinds: ("model" | "algorithm" | "benchmark" | "empirical_finding" | "decision_policy" | "system_evaluation")[];
  /** experiment templates combined, e.g. EX01 predictive evaluation and EX02 comparative benchmark */
  templates: string[];
}
export interface ExperimentalUnit {
  unit_id: string;
  name: string;
  definition: string;
  /** the unit that contains it, when units are nested */
  nested_in: string | null;
}
export interface Factor {
  factor_id: string;
  name: string;
  role: "treatment" | "control" | "nuisance" | "block" | "scenario";
  levels: string[];
}
/** A group of inputs and the moment it becomes known; an input is fair only if it is known at the decision point. */
export interface InputGroup {
  group_id: string;
  name: string;
  columns: number;
  /** null when the data does not say when it was recorded */
  known_at: string | null;
  used: boolean;
  note: string | null;
}
export interface Treatment {
  treatment_id: string;
  name: string;
  role: "proposed" | "baseline" | "control" | "ablation" | "sensitivity";
  model: string;
  /** InputGroup ids */
  inputs: string[];
  /** the tuning grid, fixed before the lock */
  grid: Record<string, number[]>;
}
export interface MetricDefinition {
  metric_id: string;
  name: string;
  definition: string;
  unit: string;
  direction: "higher" | "lower";
  aggregation: string;
  /** what one value is computed over */
  granularity: string;
  primary: boolean;
  valid_min: number | null;
  valid_max: number | null;
}
export interface HypothesisPlan {
  hypothesis_id: string;
  statement: string;
  priority: "primary" | "secondary";
  /** deferred hypotheses are named with their reason, never dropped */
  status: "planned" | "deferred";
  reason: string | null;
  metric_ids: string[];
}
/** How a confirmatory analysis is judged, so code applies the rule instead of reading prose. The estimate is target
 *  minus control. Supported: the interval lies wholly on the `direction` side of `null_value` and the estimate passes it
 *  by at least `min_effect`. Contradicted: the interval lies wholly on the other side. Otherwise not shown. */
export interface DecisionRule {
  null_value: number;
  direction: "greater" | "less";
  min_effect: number | null;
}
export interface AnalysisPlan {
  analysis_id: string;
  analysis_class: AnalysisClass;
  hypothesis_ids: string[];
  metric_id: string;
  /** the effect to estimate, not the metric reported */
  estimand: string;
  comparison: string;
  method: string;
  interval: string | null;
  unit_of_analysis: string;
  multiplicity: string | null;
  /** what failed, censored and timed-out runs count as */
  failure_policy: string;
  /** null: judged by the interval alone, in the direction the metric prefers */
  decision: DecisionRule | null;
}
export interface Specification {
  ees_id: string;
  version: number;
  sha256: string;
  /** the artifact holding the plan as written, for quotes */
  document_artifact_id: string | null;
  title: string;
  question: string;
  objective: string;
  population: string;
  claim_kind: "predictive" | "descriptive" | "explanatory" | "causal";
  classification: Classification;
  assurance_target: AssuranceLevel;
  units: ExperimentalUnit[];
  factors: Factor[];
  inputs: InputGroup[];
  treatments: Treatment[];
  metrics: MetricDefinition[];
  hypotheses: HypothesisPlan[];
  analyses: AnalysisPlan[];
  decision_rule: string;
  exclusion_rule: string;
  /** what the team knew of the data before the lock */
  prior_knowledge: string[];
}
export interface ProtocolLock {
  ees_version: number;
  ees_sha256: string;
  matrix_sha256: string;
  frozen_at: string;
  frozen_by: string;
}
export interface Amendment {
  amendment_id: string;
  from_version: number;
  to_version: number;
  reason: string;
  impact: string;
  /** whether anyone had seen confirmatory outcomes when it was made */
  outcome_accessed: boolean;
  at: string;
}
export interface CheckResult {
  analysis_id: string;
  estimate: number;
  ci_low: number;
  ci_high: number;
}
export interface Deviation {
  deviation_id: string;
  kind: "error" | "adjustment";
  description: string;
  planned: string;
  ran: string;
  found: string;
  declared_at: string;
  severity: "minor" | "major" | "critical";
  affected_run_ids: string[];
  remediation: string | null;
  /** the planned version, rerun as a check, when there is one */
  check: { artifact_ids: string[]; results: CheckResult[]; verdicts_unchanged: boolean } | null;
}
export interface Protocol {
  specification: Specification;
  /** null: nothing was frozen, so no run may be confirmatory */
  lock: ProtocolLock | null;
  amendments: Amendment[];
  deviations: Deviation[];
}

/* ---------- design: the matrix of logical jobs ---------- */
export interface Job {
  job_id: string;
  treatment_id: string;
  /** factor_id → level */
  levels: Record<string, string>;
  seed: number | null;
  split_id: string | null;
}
export interface Split {
  split_id: string;
  seed: number;
  method: string;
  hash: string;
  n_train: number;
  n_test: number;
  /** study-specific numbers of the split */
  facts: Record<string, number>;
}
export interface Design {
  matrix_id: string;
  ees_version: number;
  sha256: string;
  generation_mode: "full" | "sampled" | "adaptive";
  jobs: Job[];
  randomization: { method: string; seeds: number[]; splits: Split[] };
}

/* ---------- execution: a logical run per job, an attempt per execution (retries add attempts, never runs) ---------- */
export interface Run {
  run_id: string;
  job_id: string;
  ees_version: number;
  phase: AnalysisClass;
  status: RunStatus;
  /** required when the run did not complete */
  status_reason: string | null;
}
export interface Attempt {
  attempt_id: string;
  run_id: string;
  retry_index: number;
  exit_reason: "succeeded" | "error" | "timeout" | "out_of_memory" | "preempted" | "cancelled" | "lost_heartbeat";
  environment_id: string | null;
  worker: string | null;
}
export interface ResourceUsage {
  attempt_id: string;
  resource: string;
  amount: number;
  unit: string;
}
export interface Execution {
  started_at: string;
  runs: Run[];
  attempts: Attempt[];
  resource_usage: ResourceUsage[];
}

/* ---------- results ---------- */
/** One metric value of one attempt. A value exists only when it was recorded; 0 is a recorded zero. */
export interface Observation {
  observation_id: string;
  run_id: string;
  attempt_id: string;
  metric_id: string;
  status: "recorded" | "not_recorded" | "failed" | "censored";
  value: number | null;
}
export interface Descriptive {
  descriptive_id: string;
  analysis_id: string | null;
  metric_id: string | null;
  label: string;
  value: number;
  n: number | null;
  unit: string;
  run_ids: string[];
}
export interface Exclusion {
  run_id: string;
  reason: string;
  /** the protocol rule that allows it; null makes it a deviation */
  rule: string | null;
}
/** One estimate of an analysis, traceable to the runs behind it. */
export interface Comparison {
  comparison_id: string;
  analysis_id: string;
  /** primary: the estimate the analysis is judged on; robustness: the same estimate another way; component: a part
   *  the primary estimate is computed from */
  role: "primary" | "robustness" | "component";
  label: string;
  metric_id: string;
  target_treatment_id: string;
  control_treatment_id: string;
  run_ids: string[];
  excluded: Exclusion[];
  estimate: number;
  ci_low: number | null;
  ci_high: number | null;
  ci_level: number | null;
  method: string;
  per_seed: number[] | null;
  note: string | null;
}
export interface Check {
  check_id: string;
  analysis_id: string;
  assumption: string;
  status: "met" | "violated" | "not_checked";
  evidence: string;
}
export interface Flag {
  flag_id: string;
  affected_ids: string[];
  severity: "info" | "warning" | "serious";
  rationale: string;
}
export interface Failure {
  failure_id: string;
  run_id: string;
  attempt_id: string | null;
  category: "error" | "timeout" | "non_convergence" | "resource" | "data" | "censored";
  detail: string;
  handling: "retried" | "kept_as_failed" | "kept_as_censored" | "excluded_by_rule";
}
/** An analysis made after the lock. It is exploratory and says when and why it was added. */
export interface AddedAnalysis extends AnalysisPlan {
  added_at: string;
  reason: string;
}
export interface Results {
  observations: Observation[];
  descriptives: Descriptive[];
  comparisons: Comparison[];
  checks: Check[];
  flags: Flag[];
  failures: Failure[];
  added_analyses: AddedAnalysis[];
}

/* ---------- artifacts, figures, provenance ---------- */
export interface ArtifactRecord {
  artifact_id: string;
  kind: "protocol" | "model" | "trace" | "predictions" | "figure" | "log" | "config" | "table" | "other";
  uri: string;
  sha256: string;
  size_bytes: number;
  media_type: string;
  run_id: string | null;
  deviation_id: string | null;
  access: "open" | "restricted" | "private";
  /** false: listed for the record, withheld from this package */
  included: boolean;
  withheld_reason: string | null;
  /** the packer recomputed the sha256 from the stored file */
  checksum_verified: boolean;
}
export interface Axis {
  field: string;
  label: string;
  unit: string | null;
}
/** The data behind a figure, so a reader redraws it instead of trusting an image. */
export interface FigureData {
  figure_id: string;
  title: string;
  chart: "bar" | "line" | "scatter" | "box" | "interval" | "table";
  x: Axis;
  y: Axis;
  group: string | null;
  rows: Record<string, string | number | null>[];
  /** observations, descriptives or comparisons */
  source_ids: string[];
}
export interface DataSource {
  data_id: string;
  name: string;
  version: string;
  uri: string;
  sha256: string;
  license: string;
  citation: string;
  personal_data: boolean;
  rows: number;
  columns: number;
  classes: Record<string, number>;
  /** study-specific counts of the data */
  facts: Record<string, number>;
}
export interface CodeSource {
  code_id: string;
  entrypoint: string;
  command: string;
  sha256: string;
}
export interface Environment {
  environment_id: string;
  runtime: string;
  lockfile: string;
  lockfile_sha256: string;
  packages: number;
  hardware: string;
  os: string | null;
}
export interface Provenance {
  data: DataSource[];
  code: CodeSource[];
  environments: Environment[];
}

/* ---------- quality ---------- */
export interface GateResult {
  gate_id: string;
  name: string;
  status: "pending" | "passed" | "failed" | "not_applicable" | "waived";
  evidence_refs: string[];
  rationale: string | null;
  reviewer: string | null;
  decided_at: string | null;
}
export interface MissingItem {
  item: string;
  required_by: string;
  action: string;
}
export interface Quality {
  gates: GateResult[];
  /** achieved is decided from the evidence, never copied from the target */
  assurance: { target: AssuranceLevel; achieved: AssuranceLevel | null; unmet: string[]; conditions: string[] };
  validation: { missing_items: MissingItem[]; checksum_failures: string[]; warnings: string[] };
}

/* ---------- the package ---------- */
export interface Erp {
  schema: typeof ERP_SCHEMA;
  erp_id: string;
  version: number;
  supersedes_version: number | null;
  /** complete: nothing missing, every checksum verified, no gate pending or failed, assurance decided.
   *  partial: an audit export that says in quality.validation what it lacks. blocked: could not be finalised. */
  status: "complete" | "partial" | "blocked";
  generated_at: string;
  generated_by: string;
  conventions: { timezone: string; notes: string[] };
  protocol: Protocol;
  design: Design;
  execution: Execution;
  results: Results;
  artifacts: ArtifactRecord[];
  figures: FigureData[];
  provenance: Provenance;
  quality: Quality;
}

/* ---------- reading a package ---------- */
export interface ErpCounts {
  /** logical jobs of the matrix */
  planned: number;
  byStatus: Record<RunStatus, number>;
  /** planned jobs with no run */
  notStarted: number;
  attempts: number;
  /** attempts after the first of each run */
  retries: number;
}
export function erpCounts(erp: Erp): ErpCounts {
  const byStatus: Record<RunStatus, number> = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    censored: 0,
    cancelled: 0,
  };
  for (const r of erp.execution.runs) byStatus[r.status]++;
  const started = new Set(erp.execution.runs.map((r) => r.job_id));
  return {
    planned: erp.design.jobs.length,
    byStatus,
    notStarted: erp.design.jobs.filter((j) => !started.has(j.job_id)).length,
    attempts: erp.execution.attempts.length,
    retries: erp.execution.attempts.filter((a) => a.retry_index > 0).length,
  };
}

/** Every analysis the results may name: the planned ones, then those added after the lock. */
export const erpAnalyses = (erp: Erp): (AnalysisPlan | AddedAnalysis)[] => [
  ...erp.protocol.specification.analyses,
  ...erp.results.added_analyses,
];

const UNFINISHED: RunStatus[] = ["failed", "skipped", "censored", "cancelled"];
const GATE_CLEARS: GateResult["status"][] = ["passed", "not_applicable", "waived"];

/** What breaks the package: an id that points nowhere, a duplicate id, a record that contradicts itself, or a
 *  package marked complete that is not. An empty list means a reader can trace every number. */
export function checkErp(erp: Erp): string[] {
  const problems: string[] = [];
  const ids = (what: string, list: string[]): Set<string> => {
    const seen = new Set<string>();
    const twice = new Set<string>();
    for (const id of list) (seen.has(id) ? twice : seen).add(id);
    if (twice.size) problems.push(`duplicate ${what} ids: ${[...twice].join(", ")}`);
    return seen;
  };
  const known = (where: string, what: string, list: (string | null)[], set: Set<string>) => {
    const missing = [...new Set(list.filter((x): x is string => x != null && !set.has(x)))];
    if (missing.length) problems.push(`${where} names unknown ${what}: ${missing.join(", ")}`);
  };
  if (erp.schema !== ERP_SCHEMA) problems.push(`schema ${erp.schema} is not ${ERP_SCHEMA}`);

  const spec = erp.protocol.specification;
  const res = erp.results;
  const units = ids(
    "unit",
    spec.units.map((u) => u.unit_id),
  );
  const factors = ids(
    "factor",
    spec.factors.map((f) => f.factor_id),
  );
  const inputs = ids(
    "input group",
    spec.inputs.map((g) => g.group_id),
  );
  const treatments = ids(
    "treatment",
    spec.treatments.map((t) => t.treatment_id),
  );
  const metrics = ids(
    "metric",
    spec.metrics.map((m) => m.metric_id),
  );
  const hypotheses = ids(
    "hypothesis",
    spec.hypotheses.map((h) => h.hypothesis_id),
  );
  const analyses = ids(
    "analysis",
    erpAnalyses(erp).map((a) => a.analysis_id),
  );
  const splits = ids(
    "split",
    erp.design.randomization.splits.map((s) => s.split_id),
  );
  const jobs = ids(
    "job",
    erp.design.jobs.map((j) => j.job_id),
  );
  const runs = ids(
    "run",
    erp.execution.runs.map((r) => r.run_id),
  );
  const attempts = ids(
    "attempt",
    erp.execution.attempts.map((a) => a.attempt_id),
  );
  const observations = ids(
    "observation",
    res.observations.map((o) => o.observation_id),
  );
  const descriptives = ids(
    "descriptive",
    res.descriptives.map((d) => d.descriptive_id),
  );
  const comparisons = ids(
    "comparison",
    res.comparisons.map((c) => c.comparison_id),
  );
  const checks = ids(
    "check",
    res.checks.map((c) => c.check_id),
  );
  const deviations = ids(
    "deviation",
    erp.protocol.deviations.map((d) => d.deviation_id),
  );
  const artifacts = ids(
    "artifact",
    erp.artifacts.map((a) => a.artifact_id),
  );
  const environments = ids(
    "environment",
    erp.provenance.environments.map((e) => e.environment_id),
  );
  const sources = [
    ...erp.provenance.data.map((d) => d.data_id),
    ...erp.provenance.code.map((c) => c.code_id),
    ...environments,
  ];
  const everything = new Set([
    erp.design.matrix_id,
    ...units,
    ...factors,
    ...treatments,
    ...metrics,
    ...hypotheses,
    ...analyses,
    ...jobs,
    ...runs,
    ...observations,
    ...descriptives,
    ...comparisons,
    ...checks,
    ...deviations,
    ...artifacts,
    ...sources,
  ]);

  const versions = new Set([spec.version, ...erp.protocol.amendments.flatMap((a) => [a.from_version, a.to_version])]);
  if (spec.version !== Math.max(...versions)) problems.push(`specification v${spec.version} is not the latest version`);
  for (const u of spec.units) known(`unit ${u.unit_id}`, "unit", [u.nested_in], units);
  for (const t of spec.treatments) known(`treatment ${t.treatment_id}`, "input group", t.inputs, inputs);
  for (const h of spec.hypotheses) {
    known(`hypothesis ${h.hypothesis_id}`, "metric", h.metric_ids, metrics);
    if (h.status === "deferred" && !h.reason?.trim())
      problems.push(`hypothesis ${h.hypothesis_id} is deferred without a reason`);
  }
  for (const a of erpAnalyses(erp)) {
    known(`analysis ${a.analysis_id}`, "metric", [a.metric_id], metrics);
    known(`analysis ${a.analysis_id}`, "hypothesis", a.hypothesis_ids, hypotheses);
  }
  for (const a of res.added_analyses)
    if (a.analysis_class === "confirmatory")
      problems.push(`analysis ${a.analysis_id} was added after the lock, so it is exploratory`);
  const planned = new Set(
    spec.hypotheses.filter((h) => h.status === "planned" && h.priority === "primary").map((h) => h.hypothesis_id),
  );
  const tested = new Set(
    spec.analyses.filter((a) => a.analysis_class === "confirmatory").flatMap((a) => a.hypothesis_ids),
  );
  for (const h of planned) if (!tested.has(h)) problems.push(`primary hypothesis ${h} has no confirmatory analysis`);
  known(`specification`, "artifact", [spec.document_artifact_id], artifacts);

  if (!versions.has(erp.design.ees_version))
    problems.push(`the matrix names unknown specification v${erp.design.ees_version}`);
  for (const j of erp.design.jobs) {
    known(`job ${j.job_id}`, "treatment", [j.treatment_id], treatments);
    known(`job ${j.job_id}`, "factor", Object.keys(j.levels), factors);
    known(`job ${j.job_id}`, "split", [j.split_id], splits);
  }

  const runOf = new Map(erp.execution.attempts.map((a) => [a.attempt_id, a.run_id]));
  const perJob = new Map<string, number>();
  for (const r of erp.execution.runs) {
    known(`run ${r.run_id}`, "job", [r.job_id], jobs);
    if (!versions.has(r.ees_version)) problems.push(`run ${r.run_id} names unknown specification v${r.ees_version}`);
    if (UNFINISHED.includes(r.status) && !r.status_reason?.trim())
      problems.push(`run ${r.run_id} is ${r.status} without a reason`);
    const key = `${r.job_id} v${r.ees_version}`;
    perJob.set(key, (perJob.get(key) ?? 0) + 1);
  }
  for (const [key, n] of perJob)
    if (n > 1) problems.push(`job ${key} has ${n} runs; a retry is an attempt of the same run, never a new run`);
  const retry = new Set<string>();
  for (const a of erp.execution.attempts) {
    known(`attempt ${a.attempt_id}`, "run", [a.run_id], runs);
    known(`attempt ${a.attempt_id}`, "environment", [a.environment_id], environments);
    const key = `${a.run_id}#${a.retry_index}`;
    if (retry.has(key)) problems.push(`run ${a.run_id} has two attempts with retry index ${a.retry_index}`);
    retry.add(key);
  }
  for (const u of erp.execution.resource_usage) known("resource usage", "attempt", [u.attempt_id], attempts);

  const sameRun = (where: string, runId: string, attemptId: string | null) => {
    known(where, "run", [runId], runs);
    if (attemptId == null) return;
    known(where, "attempt", [attemptId], attempts);
    const owner = runOf.get(attemptId);
    if (owner && owner !== runId) problems.push(`${where}: attempt ${attemptId} belongs to run ${owner}`);
  };
  for (const o of res.observations) {
    sameRun(`observation ${o.observation_id}`, o.run_id, o.attempt_id);
    known(`observation ${o.observation_id}`, "metric", [o.metric_id], metrics);
    if ((o.status === "recorded") !== (o.value != null))
      problems.push(`observation ${o.observation_id} has a value exactly when it is recorded`);
  }
  for (const d of res.descriptives) {
    const where = `descriptive ${d.descriptive_id}`;
    known(where, "analysis", [d.analysis_id], analyses);
    known(where, "metric", [d.metric_id], metrics);
    known(where, "run", d.run_ids, runs);
  }
  for (const c of res.comparisons) {
    const where = `comparison ${c.comparison_id}`;
    known(where, "analysis", [c.analysis_id], analyses);
    known(where, "metric", [c.metric_id], metrics);
    known(where, "treatment", [c.target_treatment_id, c.control_treatment_id], treatments);
    known(where, "run", [...c.run_ids, ...c.excluded.map((e) => e.run_id)], runs);
    if (!c.run_ids.length) problems.push(`${where} names no runs`);
    const both = c.excluded.filter((e) => c.run_ids.includes(e.run_id)).map((e) => e.run_id);
    if (both.length) problems.push(`${where} both uses and excludes ${both.join(", ")}`);
    const bounds = [c.ci_low, c.ci_high, c.ci_level];
    if (bounds.some((b) => b == null) && bounds.some((b) => b != null))
      problems.push(`${where} gives part of an interval`);
    else if (c.ci_low != null && c.ci_high != null && !(c.ci_low <= c.estimate && c.estimate <= c.ci_high))
      problems.push(`${where}: the estimate lies outside its interval`);
  }
  for (const c of res.checks) known(`check ${c.check_id}`, "analysis", [c.analysis_id], analyses);
  for (const f of res.flags) known(`flag ${f.flag_id}`, "record", f.affected_ids, everything);
  for (const f of res.failures) sameRun(`failure ${f.failure_id}`, f.run_id, f.attempt_id);
  for (const d of erp.protocol.deviations) {
    known(`deviation ${d.deviation_id}`, "run", d.affected_run_ids, runs);
    known(`deviation ${d.deviation_id}`, "artifact", d.check?.artifact_ids ?? [], artifacts);
    known(`deviation ${d.deviation_id}`, "analysis", d.check?.results.map((r) => r.analysis_id) ?? [], analyses);
  }

  for (const a of erp.artifacts) {
    if (a.run_id != null) known(`artifact ${a.artifact_id}`, "run", [a.run_id], runs);
    known(`artifact ${a.artifact_id}`, "deviation", [a.deviation_id], deviations);
    if (!a.included && !a.withheld_reason?.trim())
      problems.push(`artifact ${a.artifact_id} is withheld without a reason`);
  }
  for (const f of erp.figures) known(`figure ${f.figure_id}`, "source", f.source_ids, everything);
  for (const g of erp.quality.gates) {
    known(`gate ${g.gate_id}`, "evidence", g.evidence_refs, everything);
    if ((g.status === "not_applicable" || g.status === "waived") && !g.rationale?.trim())
      problems.push(`gate ${g.gate_id} is ${g.status.replace("_", " ")} without a rationale`);
  }
  known("validation", "artifact", erp.quality.validation.checksum_failures, artifacts);

  const lock = erp.protocol.lock;
  if (lock && lock.ees_version === spec.version && lock.ees_sha256 !== spec.sha256)
    problems.push("the lock is bound to another specification");
  if (lock && lock.matrix_sha256 !== erp.design.sha256) problems.push("the lock is bound to another matrix");

  if (erp.status === "complete") {
    const q = erp.quality;
    if (q.validation.missing_items.length) problems.push("a complete package has no missing items");
    if (q.validation.checksum_failures.length) problems.push("a complete package has no checksum failures");
    const unverified = erp.artifacts.filter((a) => a.included && !a.checksum_verified).map((a) => a.artifact_id);
    if (unverified.length) problems.push(`a complete package verifies every checksum: ${unverified.join(", ")}`);
    if (!q.gates.length) problems.push("a complete package carries its quality gates");
    const held = q.gates.filter((g) => !GATE_CLEARS.includes(g.status)).map((g) => g.gate_id);
    if (held.length) problems.push(`a complete package has no pending or failed gate: ${held.join(", ")}`);
    if (q.assurance.achieved == null) problems.push("a complete package states the assurance achieved");
    const active = erp.execution.runs.filter((r) => r.status === "queued" || r.status === "running");
    if (active.length) problems.push("a complete package has no queued or running run");
    if (!lock && erp.execution.runs.some((r) => r.phase === "confirmatory"))
      problems.push("confirmatory runs need a protocol lock");
  }
  return problems;
}
