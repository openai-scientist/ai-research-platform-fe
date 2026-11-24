import { describe, expect, it } from "vitest";

import type { PipelineEnvelope } from "../pipeline-adapter";
import { buildLiveSidePanel, mapDatasetViews, mapDesignViews, mapExecutionViews } from "./index";

const digest = `${"abcdef".repeat(10)}abcd`;
const event = (stage: string, type: string, payload: Record<string, unknown>, seq = 1): PipelineEnvelope => ({
  seq,
  run_id: "run-reference",
  ts: "2026-11-22T00:00:00Z",
  stage_key: stage,
  type,
  payload,
});
const review = {
  round: 1,
  passed: false,
  findings: [
    {
      finding_id: "review-reference",
      issue: "Check the missing rows.",
      suggestion: "Report coverage.",
      severity: "blocking",
      open: true,
    },
  ],
};
const revision = { round: 1, items: [{ finding_id: "review-reference", outcome: "fixed", note: "Added coverage." }] };

function numbersIn(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(numbersIn);
  return [];
}
const plan = {
  version: 2,
  hypotheses: [
    {
      id: "H1",
      statement: "Feedback improves retention.",
      dag: {
        nodes: [{ name: "baseline", measured: true }],
        edges: [["baseline", "retention"]],
        adjustment_set: ["baseline"],
      },
      estimand: { summary_measure: "Adjusted difference" },
      program: { experiment_id: "H1-main", family: "linear_regression", covariates: ["baseline"] },
      decision_rule: { sesoi: 2, sesoi_unit: "points", alpha: 0.05, direction: ">" },
      interpretation: [{ statement: "The interval excludes zero." }],
      sensitivity_requests: [{ kind: "missing_not_at_random", reason: "A value may be missing for a reason." }],
    },
  ],
  robustness: {
    H1: {
      negative_control: { variable: "pretest" },
      forks: [
        {
          change: "Repeat with a restricted population.",
          program: { experiment_id: "H1-fork", family: "linear_regression" },
        },
      ],
    },
  },
  family_structure: { order: ["H1"], secondary_correction: "holm", alpha: 0.05 },
  if_then: [{ signal: "linear_with_covariates", branch: "freedman_lane", status: "registered", threshold: 0.1 }],
};

describe("Dataset live views", () => {
  it("targets a known procedure action when Dataset reports a task but no item values", () => {
    const view = mapDatasetViews({
      events: [event("dataset", "dataset.progress", { task: "missingness", state: "running", seconds: 12 })],
    });
    expect(view.profile_quality).toMatchObject({
      source: "preview",
      cursor: 1,
      cursorTarget: "procedure",
      valueSources: {},
    });
    expect(numbersIn(view.profile_quality.content)).toEqual([]);
  });
  it("keeps every empty step structural until its data arrive", () => {
    const views = { ...mapDatasetViews({}), ...mapDesignViews({}), ...mapExecutionViews({}) };
    for (const view of Object.values(views)) {
      expect(view).toMatchObject({ source: "preview", valueState: "pending", cursor: null, findings: [] });
      expect(numbersIn(view.content)).toEqual([]);
    }
  });
  it("maps released facts through the DataCard and review without filling withheld values", () => {
    const view = mapDatasetViews({
      artifacts: {
        "dataset.snapshot/v1": {
          sources: [
            { id: "source-reference", filename: "learning.csv", rows: 40, columns: 1, sha256: digest, role: "primary" },
          ],
          table_profile: {
            rows: { part: "exploration", n: 12 },
            columns: { score: { missing_share: null, statistics: { median: 10 } } },
          },
          dictionary: [{ column: "score", role: "outcome", origin: { role: "researcher" } }],
          cleaning_recipe: {
            steps: [{ kind: "cast", column: "score" }],
            plan_requirements: [{ column: "score", what: "Check the units." }],
          },
          question_map: [{ column: "score", label: "Retention", kind: "outcome", coverage: "exact" }],
          split: { method: "by_unit", n_complete: null, parts: { exploration: 12, confirmation: 20, reserve: 8 } },
          data_checks: [
            {
              kind: "range",
              columns: ["score"],
              params: { min: 0, max: 100 },
              run: { rows_checked: 40, status: "fail", failing: null },
            },
            { kind: "leakage_flag", columns: ["score"], flag: "Column is measured after exposure." },
          ],
          findings: [{ category: "quality", columns: ["score"], text: "Some values are unusual." }],
          pair_fitness: [
            { exposure: "feedback", outcome: "score", claim_ceiling: "association", timing: { status: "ok" } },
          ],
          fitness_verdict: { verdict: "fit_with_limits", reasons: ["One source."] },
        },
        "dataset.data_card/v1": {
          title: "Learning data",
          n_rows: 40,
          n_columns: 1,
          variables: [
            {
              name: "score",
              label: "Retention",
              label_source: "file",
              measure_source: "researcher",
              summary: { n_missing: null },
            },
          ],
          access: [{ actor: "code", what: "Univariate summaries", rows: "all" }],
          decisions: [{ question: "What is the unit?", label: "Learner", by: "researcher" }],
          caveats: ["Single site"],
          gaps: ["Timing uncertain"],
          sensitive: [{ column: "score", kind: "health", confirmed: false }],
        },
        "dataset.brief/v2": { chosen: { question_id: "Q1", text: "Does feedback improve retention?" } },
        "review.findings/v1": review,
        "revision.response/v1": revision,
      },
    });
    expect(view.sources.content.sources[0]).toMatchObject({ filename: "learning.csv", rows: 40 });
    expect(view.table_model.content.tables[0].columns).toBe(1);
    expect(view.profile_quality.content.columns[0]).toMatchObject({ missingShare: null, stats: { median: 10 } });
    expect(view.dictionary.content.columns[0].sources.role).toBe("researcher");
    expect(view.cleaning_recipe.content.steps[0].kind).toBe("cast");
    expect(view.question_map.findings[0]).toMatchObject({
      kind: "ok",
      usedBy: ["data_checks", "fitness", "design_work"],
    });
    expect(view.split.content.parts[2].count).toBe(8);
    expect(view.data_checks.content).toMatchObject({
      complete: null,
      rules: [{ failingRows: null, min: 0, max: 100 }],
      leakage: [{ columns: ["score"] }],
    });
    expect(view.fitness.content.pairs[0]).toMatchObject({
      claimCeiling: "association",
      axes: [{ name: "timing", status: "ok" }, ...view.fitness.content.pairs[0].axes.slice(1)],
    });
    expect(view.disclosure.content).toMatchObject({
      header: { rows: 40 },
      variables: [{ sources: { label: "file" }, summary: { missing: null } }],
      sensitive: [{ confirmed: false }],
    });
    expect(view.review.content.threads[0]).toMatchObject({
      resolved: true,
      reply: { outcome: "fixed", text: "Added coverage." },
    });
    expect(JSON.stringify(view)).not.toContain(digest);
    expect(JSON.stringify(view)).not.toContain("source-reference");
  });

  it("keeps a completed event in procedure preview when the artifact is missing", () => {
    const view = mapDatasetViews({
      events: [event("dataset", "dataset.item", { key: "data_checks", state: "green" })],
    });
    expect(view.data_checks).toMatchObject({
      source: "preview",
      progress: 1,
      progressFrom: "event-state",
      cursor: null,
      content: { rules: [], complete: null },
    });
    expect(view.fitness.progressFrom).toBe("unavailable");
  });

  it("previews the checks matrix from upstream names without values or invented counts", () => {
    const view = mapDatasetViews({
      artifacts: {
        "dataset.data_card/v1": { variables: [{ name: "score", type: "number", role: "outcome" }] },
        "dataset.snapshot/v1": {
          dictionary: [{ column: "score", type: "number", role: "outcome" }],
          question_map: [{ label: "Retention", column: "score", kind: "outcome" }],
          split: { parts: { exploration: null, confirmation: null } },
        },
      },
    });
    expect(view.data_checks).toMatchObject({ phase: "running", values: null, walk: "structure" });
    expect(view.data_checks.structure.map((item) => item.label)).toContain("score · number · outcome");
    expect(view.data_checks.structure.map((item) => item.label)).toContain("Retention");
    expect(numbersIn(view.data_checks.values)).toEqual([]);
    expect(view.data_checks.structure.every((item) => item.source.includes("dataset."))).toBe(true);
  });
});

describe("Design live views", () => {
  it("maps graph, released simulation points, diagnostics, review thread and lock coverage", () => {
    const view = mapDesignViews({
      artifacts: {
        "experiment_design.plan/v1": plan,
        "experiment_design.design_diagnosis/v1": {
          hypotheses: {
            H1: {
              sesoi: 2,
              alpha: 0.05,
              power: { value: 0.86, reps: 500, n: 2000, mcse: 0.016 },
              planted: { bias: 0.02, coverage: 0.95, interval: true, reps: 500 },
              null: { false_positive_rate: 0.047, replicates: 500, measured_on: "null_replicates" },
              sesoi_sensitivity: {
                points: [
                  { sesoi: 1, power: 0.61 },
                  { sesoi: 2, power: 0.81 },
                ],
              },
            },
          },
        },
        "experiment_design.lock/v1": {
          spec_hash: digest,
          program_hash: digest,
          golden_outputs_hash: digest,
          snapshot_version: 1,
          split_digest: digest,
          locked_by: "researcher",
        },
        "review.findings/v1": review,
      },
    });
    expect(view.design_work.content.hypotheses[0]).toMatchObject({
      adjustment: { set: ["baseline"], backdoor: { edges: [{ from: "baseline", to: "retention" }] } },
      simulation: {
        powerPoints: [
          { effect: 1, power: 0.61 },
          { effect: 2, power: 0.81 },
        ],
        diagnostics: { powerAtSesoi: 0.86, bias: 0.02, coverage: 0.95, falsePositiveRate: 0.047 },
      },
    });
    expect(view.design_review.content.threads[0].reply).toBeNull();
    expect(view.design_accept.content.analyses[0]).toMatchObject({
      estimand: "Adjusted difference",
      multiplicity: "holm",
      decision: { sesoi: 2 },
    });
    expect(view.design_accept.content.lockParts).toHaveLength(5);
    expect(JSON.stringify(view)).not.toContain(digest);
  });

  it("uses the reported progress and never interpolates a simulation", () => {
    const view = mapDesignViews({
      events: [
        event("experiment_design", "experiment_design.progress", {
          phase: "power",
          part: "replicates",
          hypothesis_id: "H1",
          done: 12,
          total: 50,
        }),
      ],
    });
    expect(view.design_work).toMatchObject({
      source: "preview",
      progress: 0.24,
      progressFrom: "event-count",
      cursor: 0,
      valueState: "pending",
      valueSources: { simulationPart: "event" },
      content: { hypotheses: [{ hypothesis: null, simulation: null }] },
    });
  });

  it("reports a known event gap as syncing and hides the cursor while the stream reconciles", () => {
    const view = mapDesignViews({
      syncing: true,
      events: [
        event("experiment_design", "experiment_design.progress", {
          phase: "power",
          hypothesis_id: "H1",
          done: 1,
          total: 2,
        }),
      ],
    });
    expect(view.design_work).toMatchObject({ source: "preview", valueState: "syncing", cursor: null, findings: [] });
  });

  it("builds design structure from the upstream card and plan", () => {
    const view = mapDesignViews({
      artifacts: {
        "dataset.data_card/v1": { variables: [{ name: "score", type: "number", role: "outcome" }] },
        "experiment_design.plan/v1": {
          hypotheses: [
            {
              statement: "Feedback improves retention.",
              estimand: { summary_measure: "Adjusted difference" },
              decision_rule: { name: "Main decision" },
            },
          ],
        },
      },
    });
    expect(view.design_work.structure.map((item) => item.label)).toContain("score · number · outcome");
    expect(view.design_work.structure.map((item) => item.label)).toContain("Feedback improves retention.");
    expect(view.design_work.phase).toBe("recorded");
    expect(view.design_accept.structure.map((item) => item.label)).toContain("Main analysis");
  });
});

describe("Execution live views", () => {
  it("projects current program and branches without opening envelopes", () => {
    const view = mapExecutionViews({
      artifacts: { "experiment_design.plan/v1": plan },
      events: [
        event("execution", "execution.item", { key: "lock", state: "green" }),
        event("execution", "execution.item", { key: "rehearsal", state: "green" }, 2),
        event(
          "execution",
          "execution.progress",
          { phase: "sealed", place: 2, total: 6, hypothesis_id: "H1", entry_id: "H1-fork", kind: "fork" },
          3,
        ),
        event(
          "execution",
          "execution.progress",
          { phase: "rerun", place: 6, total: 6, hypothesis_id: "H1", entry_id: "H1-doubt-1" },
          4,
        ),
      ],
    });
    expect(view.execution_verify.content.parts.every((part) => part.state === "unchanged")).toBe(true);
    expect(view.execution_prepare.content.rehearsal.now).toBe("passed");
    expect(view.execution_run).toMatchObject({
      source: "engine",
      progress: 1 / 6,
      progressFrom: "event-count",
      cursor: 1,
    });
    expect(view.execution_run.content.slots.map(({ program, envelope }) => [program, envelope])).toEqual([
      ["Main analysis", "confirmatory"],
      ["Robustness fork", "robustness"],
      ["Negative control", "robustness"],
      ["Missing-data sensitivity", "robustness"],
      ["Freedman–Lane", "robustness"],
      ["Data doubt fork", "robustness"],
    ]);
    expect(view.execution_run.content.branches[0].threshold).toBe(0.1);
    expect(view.execution_check.content.verdicts).toEqual([]);
    expect(view.execution_unseal.content.opened).toBeNull();
  });

  it("previews program slots from the upstream plan and exposes a recorded finished step", () => {
    const preview = mapExecutionViews({ artifacts: { "experiment_design.plan/v1": plan } });
    expect(preview.execution_run.structure.map((item) => item.label)).toContain("Main analysis · linear regression");
    expect(preview.execution_run.values).toBeNull();
    expect(numbersIn(preview.execution_run.values)).toEqual([]);
    const locked = mapExecutionViews({
      artifacts: { "experiment_design.lock/v1": { spec_hash: digest, program_hash: digest } },
    });
    expect(locked.execution_verify.structure.map((item) => item.label)).toEqual([
      "Analysis plan",
      "Registered programs",
    ]);

    const finished = mapExecutionViews({
      events: [event("execution", "execution.item", { key: "lock", state: "green" })],
    });
    expect(finished.execution_verify).toMatchObject({ phase: "recorded", progress: 1 });
  });

  it("shows the open gate question and builds a human-only side panel", () => {
    const views = mapDesignViews({
      events: [
        {
          ...event("experiment_design", "run.gate_opened", {
            gate_id: "gate-reference-123456789abc",
            prompt: "Which comparison should be registered?",
          }),
          step_key: "work",
        },
      ],
    });
    expect(views.design_work).toMatchObject({
      phase: "waiting",
      question: "Which comparison should be registered?",
      walk: null,
    });
    const panel = buildLiveSidePanel(views, "design_work");
    expect(panel.now.title).toBe("Build the analysis plan");
    expect(panel.substeps[0].state).toBe("waiting");
    expect(JSON.stringify(panel)).not.toMatch(/span|trace|gate-reference|123456789abc/i);
  });

  it("maps the receipt, dry-run counts, and judged interval with the locked margin and Holm result", () => {
    const view = mapExecutionViews({
      artifacts: {
        "experiment_design.plan/v1": plan,
        "execution.bundle/v1": {
          envelope_log: [
            { kind: "post", entry_id: "H1-main" },
            { kind: "unseal", approved_by: "user", entries: ["H1-main"] },
          ],
          tables_and_figures: [
            { chart_key: "flow_diagram", data: { programs: { "H1-main": [{ step: "Complete cases", rows: 24 }] } } },
          ],
          verdicts: [
            {
              hypothesis_id: "H1",
              experiment_id: "H1-main",
              verdict: "supported",
              statement: "The interval excludes zero.",
              p_adjusted: 0.04,
            },
          ],
          confirmatory_results: [{ experiment_id: "H1-main", estimate: { value: 5, ci_low: 1, ci_high: 9 } }],
        },
        "platform.experiment_result/v1": {
          status: "partial",
          version: 2,
          results: { verdicts: [{ verdict: "supported" }], comparisons: [] },
        },
      },
    });
    expect(view.execution_prepare.content.dryRun.programs[0].steps).toEqual([{ text: "Complete cases", rows: 24 }]);
    expect(view.execution_unseal.content).toMatchObject({ opened: true, resultCount: 1 });
    expect(view.execution_check.content).toMatchObject({
      multiplicity: "holm",
      verdicts: [{ hypothesis: 1, estimate: 5, low: 1, high: 9, sesoi: 2, adjustedP: 0.04 }],
    });
    expect(view.execution_deliver.content).toMatchObject({ status: "partial", version: 2, reason: null });
  });

  it("maps a blocked package and words a mismatched lock without exposing references", () => {
    const view = mapExecutionViews({
      events: [
        event("execution", "execution.item", {
          key: "lock",
          state: "red",
          reason: `The primary file has sha256 ${digest} but the snapshot records ${digest}.`,
        }),
      ],
      artifacts: {
        "platform.experiment_result/v1": {
          status: "blocked",
          results: { verdicts: [], failures: [{ detail: "The input file changed." }] },
        },
      },
    });
    expect(view.execution_verify.content.parts).toContainEqual({
      name: "Dataset file",
      state: "changed",
      text: "Dataset file differs from the recorded version.",
    });
    expect(view.execution_deliver.content).toMatchObject({ status: "blocked", reason: "The input file changed." });
    expect(view.execution_deliver.findings[0].kind).toBe("flag");
    expect(JSON.stringify(view)).not.toContain(digest);
  });
});

describe("the hand-off card's question", () => {
  const sap = [
    "# Statistical analysis plan",
    "",
    "## Research question",
    "",
    "Is feedback linked to a higher score?",
    "",
    "## Design",
    "",
    "x",
  ].join("\n");
  const accept = (artifacts: Record<string, unknown>) =>
    mapDesignViews({ artifacts }).design_accept.content.header.question;

  it("reads the plan document first", () => {
    expect(
      accept({
        "experiment_design.exp_plan/v1": sap,
        "dataset.brief/v2": { chosen: { text: "The run's question" } },
      }),
    ).toBe("Is feedback linked to a higher score?");
  });

  it("falls back to the pre-registration, then to the run's question", () => {
    expect(accept({ "experiment_design.preregistration/v1": sap })).toBe("Is feedback linked to a higher score?");
    expect(accept({ "dataset.brief/v2": { chosen: { text: "The run's question" } } })).toBe("The run's question");
  });

  it("stays empty when nothing records it", () => {
    expect(accept({})).toBeNull();
  });
});
