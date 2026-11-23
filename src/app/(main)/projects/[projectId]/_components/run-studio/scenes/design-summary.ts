import {
  DESIGN_DIAGNOSIS,
  DESIGN_DOCUMENTS,
  DESIGN_PLAN,
  DESIGN_REVIEW,
  DESIGN_SAP,
  type DesignArtifact,
  type DesignContent,
  type DesignHypothesis,
  designLabel,
  designRecord,
  designText,
} from "@/lib/run-stream/experiment-design";

import { designView } from "./experiment-design-view";

const [DESIGN_EXPERIMENT_PLAN, DESIGN_PREREGISTRATION] = DESIGN_DOCUMENTS;

export type LockHypothesis = {
  id: string;
  claim?: string;
  /** "Effect of X on Y", with the effect measure when the plan names one. */
  estimand?: string;
  method?: string;
  /** The rule the verdict follows, in researcher words. */
  decision?: string;
  margin?: string;
  marginSource?: string;
  robustness: number;
  /** One line from the design diagnosis, such as "Power 80% · false positives 4.7%". */
  diagnosis?: string;
};

export type LockSummary = {
  /** Logos does not record the research question yet: stays undefined rather than invented. */
  question?: string;
  hypotheses: LockHypothesis[];
  robustness: number;
  findings: { total: number; blocking: number; major: number; minor: number };
};

const percent = (value: number) =>
  new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 }).format(value);

const finite = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

const DIRECTION: Record<string, string> = {
  "> 0": "A positive effect beyond the margin supports the claim",
  "< 0": "A negative effect beyond the margin supports the claim",
  "!= 0": "An effect beyond the margin in either direction supports the claim",
  "≈ 0": "An effect within the margin supports the claim",
};

/** Checks the plan lists for one hypothesis: each sensitivity, control or missing-data check, and each variant. */
export function robustnessCount(hypothesis: DesignHypothesis): number {
  const robustness = designRecord(hypothesis.assumptions?.robustness);
  const forks = Array.isArray(robustness.forks) ? robustness.forks.length : 0;
  const named = [robustness.sensitivity, robustness.negative_control, robustness.missing_data].filter(
    (entry) => Object.keys(designRecord(entry)).length > 0,
  ).length;
  return named + forks;
}

function lockHypothesis(hypothesis: DesignHypothesis): LockHypothesis {
  const view = designView(hypothesis);
  const { margin, unit, direction } = view.rule;
  const measure = view.estimandRows.find(([label]) => label === "Effect measure")?.[1];
  const power = finite(designRecord(hypothesis.diagnosis?.power).value);
  const falsePositive = finite(designRecord(hypothesis.diagnosis?.null).false_positive_rate);
  const diagnosis = [
    power !== undefined && `Power ${percent(power)}`,
    falsePositive !== undefined && `false positives ${percent(falsePositive)}`,
  ].filter((part): part is string => Boolean(part));
  return {
    id: hypothesis.id,
    claim: hypothesis.statement,
    estimand:
      view.exposure && view.outcome
        ? `Effect of ${view.exposure} on ${view.outcome}${measure ? ` (${measure.toLowerCase()})` : ""}`
        : undefined,
    method: view.program.model ? designLabel(view.program.model) : undefined,
    decision: direction ? DIRECTION[direction] : undefined,
    margin: margin !== undefined ? `±${margin}${unit ? ` ${unit}` : ""}` : undefined,
    marginSource: view.rule.source ?? view.rule.sourceNote,
    robustness: robustnessCount(hypothesis),
    diagnosis: diagnosis.length ? diagnosis.join(" · ") : undefined,
  };
}

/** What the researcher is about to lock, read only from content the Design stage already holds. */
export function designLockSummary(design?: DesignContent, question?: string): LockSummary {
  const hypotheses = Object.values(design?.hypotheses ?? {}).map(lockHypothesis);
  const findings = design?.findings ?? [];
  const count = (severity: string) => findings.filter((finding) => finding.severity === severity).length;
  return {
    question: designText(question),
    hypotheses,
    robustness: hypotheses.reduce((sum, row) => sum + row.robustness, 0),
    findings: { total: findings.length, blocking: count("blocking"), major: count("major"), minor: count("minor") },
  };
}

export type DesignFileGroups = { key: DesignArtifact[]; supporting: DesignArtifact[] };

/**
 * The files a researcher reads before locking the plan, and the rest. The statistical analysis plan is the
 * experiment plan document when the run has no separate one.
 */
export function splitDesignFiles(artifacts: DesignContent["artifacts"] | undefined): DesignFileGroups {
  const files = Object.values(artifacts ?? {});
  const has = (schema: string) => files.some((file) => file.schema === schema);
  const statistical = has(DESIGN_SAP) ? DESIGN_SAP : DESIGN_EXPERIMENT_PLAN;
  const order = [DESIGN_PLAN, statistical, DESIGN_REVIEW, DESIGN_DIAGNOSIS, DESIGN_PREREGISTRATION];
  const key = order.flatMap((schema) => files.filter((file) => file.schema === schema));
  return { key, supporting: files.filter((file) => !key.includes(file)) };
}
