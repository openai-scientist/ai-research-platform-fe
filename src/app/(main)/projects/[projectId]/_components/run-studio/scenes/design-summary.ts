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
  /** What the main analysis adjusts for: the covariate names, or "none". */
  adjustedFor: string;
  /** True when the locked main analysis has no covariates. */
  unadjusted: boolean;
  /** Why it has none, when the plan records the reason. */
  adjustmentReason?: string;
  /** One line from the design diagnosis, such as "Power 80% · false positives 4.7%". */
  diagnosis?: string;
};

export type LockSummary = {
  /** Logos does not record the research question yet: stays undefined rather than invented. */
  question?: string;
  hypotheses: LockHypothesis[];
  /** Set when the question or a claim asks for adjustment but a main analysis has none. */
  adjustmentWarning?: string;
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

const ADJUSTMENT_WORDS = /\badjust(?:ed|ing|ment)?\b|\bcontroll?(?:ed|ing)? for\b|\bcovariates?\b/i;

/** Whether text asks for the analysis to be adjusted for something. */
export const asksForAdjustment = (text?: string) => Boolean(text && ADJUSTMENT_WORDS.test(text));

/** The plan's reason for having no covariates, when it records one. */
function adjustmentReason(hypothesis: DesignHypothesis): string | undefined {
  const robustness = designRecord(hypothesis.assumptions?.robustness);
  if (robustness.timing_confirmed === false) return "the order of measurements (timing) was not confirmed";
  return undefined;
}

function lockHypothesis(hypothesis: DesignHypothesis): LockHypothesis {
  const view = designView(hypothesis);
  const { margin, unit, direction } = view.rule;
  const measure = view.estimandRows.find(([label]) => label === "Effect measure")?.[1];
  const power = finite(designRecord(hypothesis.diagnosis?.power).value);
  const falsePositive = finite(designRecord(hypothesis.diagnosis?.null).false_positive_rate);
  const covariates = view.program.covariates;
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
    adjustedFor: covariates.length ? covariates.join(", ") : "none",
    unadjusted: covariates.length === 0,
    adjustmentReason: covariates.length === 0 ? adjustmentReason(hypothesis) : undefined,
    diagnosis: diagnosis.length ? diagnosis.join(" · ") : undefined,
  };
}

export function adjustmentWarning(ids: string[], reason?: string) {
  return `The question asks for adjustment, but the main analysis for ${ids.join(", ")} adjusts for nothing${
    reason ? ` because ${reason}` : ""
  }. Its estimate is unadjusted and may not answer the question as asked.`;
}

/** The "Adjusted for" line of one executed analysis, with the reason when the plan records one. */
export function adjustedForLine(hypothesis?: DesignHypothesis): string | undefined {
  if (!hypothesis) return undefined;
  const row = lockHypothesis(hypothesis);
  return row.unadjusted
    ? `Adjusted for: none${row.adjustmentReason ? ` (${row.adjustmentReason})` : ""}`
    : `Adjusted for: ${row.adjustedFor}`;
}

/** The text under "## Research question" in a plan document, on one line; undefined when it has none. */
export function questionFromMarkdown(markdown?: string): string | undefined {
  const section = /^##[ \t]+Research question[ \t]*\r?\n([\s\S]*?)(?=^#{1,2}[ \t]|(?![\s\S]))/im.exec(
    markdown ?? "",
  )?.[1];
  return designText(section?.replace(/\s+/g, " "));
}

/** The question the plan documents record, when they do. */
const planQuestion = (design?: DesignContent) =>
  DESIGN_DOCUMENTS.map((schema) => questionFromMarkdown(design?.documents?.[schema])).find(Boolean);

/**
 * What the researcher is about to lock, read only from content the Design stage already holds. The question is the one
 * the plan documents record; when they record none it is the one the run was started with.
 */
export function designLockSummary(design?: DesignContent, runQuestion?: string): LockSummary {
  const question = planQuestion(design) ?? runQuestion;
  const hypotheses = Object.values(design?.hypotheses ?? {}).map(lockHypothesis);
  const findings = design?.findings ?? [];
  const count = (severity: string) => findings.filter((finding) => finding.severity === severity).length;
  const asked = [question, ...Object.values(design?.hypotheses ?? {}).map((row) => row.statement)].some(
    asksForAdjustment,
  );
  const bare = hypotheses.filter((row) => row.unadjusted);
  return {
    question: designText(question),
    hypotheses,
    adjustmentWarning:
      asked && bare.length > 0
        ? adjustmentWarning(
            bare.map((row) => row.id),
            bare[0].adjustmentReason,
          )
        : undefined,
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
