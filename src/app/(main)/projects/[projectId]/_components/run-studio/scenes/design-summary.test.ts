import { describe, expect, it } from "vitest";

import type { ReviewFinding } from "@/lib/run-stream/contract";
import type { DesignContent, DesignHypothesis } from "@/lib/run-stream/experiment-design";
import { parseDesignPlan } from "@/lib/run-stream/experiment-design";
import plan from "@/lib/run-stream/fixtures/run-0719-design-plan.json";

import {
  adjustedForLine,
  asksForAdjustment,
  designLockSummary,
  questionFromMarkdown,
  robustnessCount,
  splitDesignFiles,
} from "./design-summary";

const finding = (severity: ReviewFinding["severity"], id: string): ReviewFinding => ({
  finding_id: id,
  locator: "item:design",
  category: "design",
  kind: "fix",
  severity,
  issue: "Something to check",
});

const hypothesis: DesignHypothesis = {
  id: "H1",
  statement: "Sleep raises grades",
  estimand: {
    exposure: { variable: "sleep_hours" },
    outcome: { variable: "grade" },
    effect_measure: "linear_coefficient",
  },
  program: { family: "linear_regression" },
  decisionRule: { direction: "> 0", sesoi: 0.2, sesoi_unit: "grade points", sesoi_source_kind: "researcher" },
  diagnosis: { power: { value: 0.8 }, null: { false_positive_rate: 0.047 } },
  assumptions: {
    robustness: { sensitivity: { method: "e-value" }, negative_control: { none_reason: "none" }, forks: [{}, {}] },
  },
};

const design = (overrides: Partial<DesignContent> = {}): DesignContent => ({
  hypotheses: { H1: hypothesis },
  artifacts: {},
  findings: [],
  notices: {},
  ...overrides,
});

describe("designLockSummary", () => {
  it("reads the main analysis, margin and diagnosis in researcher words", () => {
    const [row] = designLockSummary(design()).hypotheses;
    expect(row).toMatchObject({
      id: "H1",
      claim: "Sleep raises grades",
      estimand: "Effect of sleep_hours on grade (linear coefficient)",
      method: "Linear regression",
      decision: "A positive effect beyond the margin supports the claim",
      margin: "±0.2 grade points",
      marginSource: "You set",
      robustness: 4,
      diagnosis: "Power 80% · false positives 4.7%",
    });
  });

  it("does not invent the research question or any missing field", () => {
    const summary = designLockSummary(design({ hypotheses: { H2: { id: "H2" } } }));
    expect(summary.question).toBeUndefined();
    expect(summary.hypotheses[0]).toMatchObject({
      id: "H2",
      estimand: undefined,
      method: undefined,
      decision: undefined,
      margin: undefined,
      diagnosis: undefined,
      robustness: 0,
    });
    expect(designLockSummary(design(), "  Does sleep matter?  ").question).toBe("Does sleep matter?");
  });

  it("counts findings by severity and robustness checks across hypotheses", () => {
    const summary = designLockSummary(
      design({
        hypotheses: { H1: hypothesis, H2: { ...hypothesis, id: "H2" } },
        findings: [finding("blocking", "a"), finding("major", "b"), finding("minor", "c"), finding("minor", "d")],
      }),
    );
    expect(summary.findings).toEqual({ total: 4, blocking: 1, major: 1, minor: 2 });
    expect(summary.robustness).toBe(8);
  });

  it("summarizes a real plan without raw objects", () => {
    const summary = designLockSummary(
      design({ hypotheses: Object.fromEntries(parseDesignPlan(plan).map((h) => [h.id, h])) }),
    );
    expect(summary.hypotheses.length).toBeGreaterThan(0);
    for (const row of summary.hypotheses)
      for (const text of [row.claim, row.estimand, row.method, row.decision, row.margin, row.diagnosis])
        expect(text ?? "").not.toMatch(/\[object|^\{|undefined/);
  });

  it("counts only checks the plan records", () => {
    expect(robustnessCount({ id: "H1" })).toBe(0);
    expect(robustnessCount({ id: "H1", assumptions: { robustness: { forks: [{}] } } })).toBe(1);
  });
});

describe("splitDesignFiles", () => {
  const file = (schema: string, label = schema) => [schema, { id: `id-${schema}`, schema, label }] as const;

  it("puts the documents to read first, in reading order, and the rest under supporting", () => {
    const { key, supporting } = splitDesignFiles(
      Object.fromEntries([
        file("experiment_design.experiment_index/v2", "Experiment index"),
        file("experiment_design.preregistration/v1"),
        file("experiment_design.design_diagnosis/v1"),
        file("review.findings/v1"),
        file("experiment_design.plan/v1"),
        file("experiment_design.sap/v1"),
        file("experiment_design.exp_plan/v1"),
        file("stage.story/v1"),
      ]),
    );
    expect(key.map((entry) => entry.schema)).toEqual([
      "experiment_design.plan/v1",
      "experiment_design.sap/v1",
      "review.findings/v1",
      "experiment_design.design_diagnosis/v1",
      "experiment_design.preregistration/v1",
    ]);
    expect(supporting.map((entry) => entry.schema)).toEqual([
      "experiment_design.experiment_index/v2",
      "experiment_design.exp_plan/v1",
      "stage.story/v1",
    ]);
  });

  it("reads the experiment plan as the statistical analysis plan when there is no separate one", () => {
    const { key } = splitDesignFiles(Object.fromEntries([file("experiment_design.exp_plan/v1")]));
    expect(key.map((entry) => entry.schema)).toEqual(["experiment_design.exp_plan/v1"]);
  });

  it("is empty without artifacts", () => {
    expect(splitDesignFiles(undefined)).toEqual({ key: [], supporting: [] });
  });
});

describe("adjustment in the lock summary", () => {
  const question = "Is feedback linked to a higher score, after adjustment for baseline score and weekly study hours?";
  const bare: DesignHypothesis = {
    ...hypothesis,
    program: { family: "linear_regression", covariates: [] },
    assumptions: { robustness: { timing_confirmed: false, timing_source: "not_confirmed" } },
  };

  it("says Adjusted for: none, with the plan reason, and warns when the question asks for adjustment", () => {
    const summary = designLockSummary(design({ hypotheses: { H1: bare } }), question);
    expect(summary.hypotheses[0]).toMatchObject({
      adjustedFor: "none",
      unadjusted: true,
      adjustmentReason: "the order of measurements (timing) was not confirmed",
    });
    expect(summary.adjustmentWarning).toContain("H1 adjusts for nothing because the order of measurements");
  });

  it("gives no reason when the plan records none, and no warning when nothing asks for adjustment", () => {
    const plain = { ...bare, assumptions: {} };
    expect(
      designLockSummary(design({ hypotheses: { H1: plain } }), question).hypotheses[0].adjustmentReason,
    ).toBeUndefined();
    expect(
      designLockSummary(design({ hypotheses: { H1: plain } }), "Does feedback matter?").adjustmentWarning,
    ).toBeUndefined();
  });

  it("lists covariates and does not warn when the analysis is adjusted", () => {
    const adjusted = { ...hypothesis, program: { family: "linear_regression", covariates: ["v2", "v3"] } };
    const summary = designLockSummary(design({ hypotheses: { H1: adjusted } }), question);
    expect(summary.hypotheses[0]).toMatchObject({ adjustedFor: "v2, v3", unadjusted: false });
    expect(summary.adjustmentWarning).toBeUndefined();
    expect(adjustedForLine(adjusted)).toBe("Adjusted for: v2, v3");
  });

  it("reads the execution line and detects adjustment wording", () => {
    expect(adjustedForLine(bare)).toBe("Adjusted for: none (the order of measurements (timing) was not confirmed)");
    expect(adjustedForLine(undefined)).toBeUndefined();
    expect(asksForAdjustment("after adjustment for age")).toBe(true);
    expect(asksForAdjustment("controlling for age")).toBe(true);
    expect(asksForAdjustment("Does feedback matter?")).toBe(false);
  });
});

describe("the research question in the lock summary", () => {
  const sap =
    "# Statistical analysis plan\n\n## Research question\n\nIs feedback linked\nto a higher score?\n\n## Design\n\nText.\n";

  it("reads the question from the plan document on one line", () => {
    expect(questionFromMarkdown(sap)).toBe("Is feedback linked to a higher score?");
    expect(questionFromMarkdown("## Research question\n\nLast section.")).toBe("Last section.");
    expect(questionFromMarkdown("# Plan\n\n## Design\n\nNo question here.")).toBeUndefined();
    expect(questionFromMarkdown(undefined)).toBeUndefined();
  });

  it("uses the plan question when the plan has one, even if the run has another", () => {
    const summary = designLockSummary(
      design({ documents: { "experiment_design.exp_plan/v1": sap } }),
      "The wording from run setup",
    );
    expect(summary.question).toBe("Is feedback linked to a higher score?");
  });

  it("falls back to the run question when the plan has none", () => {
    expect(designLockSummary(design(), "The wording from run setup").question).toBe("The wording from run setup");
    const bare = design({ documents: { "experiment_design.preregistration/v1": "# Pre-registration" } });
    expect(designLockSummary(bare, "Run question").question).toBe("Run question");
  });
});
