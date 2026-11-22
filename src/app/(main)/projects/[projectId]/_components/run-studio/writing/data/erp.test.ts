import { describe, expect, it } from "vitest";

import { checkErp, type Erp, erpAnalyses, erpCounts } from "./erp";
import { DROPOUT_ERP, R1_ANALYSIS, R1_COMPARISON } from "./erp-dropout";
import { ANALYSES, INTAKE, INTAKE_CHECKS } from "./intake";

/** A deep copy with one change, so each case breaks exactly one thing. */
const broken = (change: (erp: Erp) => void): Erp => {
  const erp = structuredClone(DROPOUT_ERP);
  change(erp);
  return erp;
};

describe("the dropout package", () => {
  it("is complete and every id it names resolves", () => {
    expect(DROPOUT_ERP.status).toBe("complete");
    expect(checkErp(DROPOUT_ERP)).toEqual([]);
  });

  it("holds one run per planned job and one attempt per run", () => {
    const c = erpCounts(DROPOUT_ERP);
    expect(c.planned).toBe(20);
    expect(c.byStatus.completed).toBe(20);
    expect(c.notStarted).toBe(0);
    expect(c.attempts).toBe(20);
    expect(c.retries).toBe(0);
  });

  it("keeps three metrics per run and the planned comparisons with their intervals", () => {
    expect(DROPOUT_ERP.results.observations).toHaveLength(60);
    const byId = Object.fromEntries(DROPOUT_ERP.results.comparisons.map((c) => [c.comparison_id, c]));
    expect([byId.A1.estimate, byId.A1.ci_low, byId.A1.ci_high]).toEqual([0.111268, 0.092098, 0.129054]);
    expect([byId.A2.estimate, byId.A2.ci_low, byId.A2.ci_high]).toEqual([-0.031105, -0.108642, 0.026959]);
    expect([byId.A3.estimate, byId.A3.ci_low, byId.A3.ci_high]).toEqual([0.004225, -0.006509, 0.021463]);
    expect(byId.A1.run_ids).toEqual(["t06", "t07", "t08", "t09", "t10", "t11", "t12", "t13", "t14", "t15"]);
  });

  it("was locked before the first run, bound to this specification and matrix", () => {
    const lock = DROPOUT_ERP.protocol.lock;
    expect(lock?.ees_sha256).toBe(DROPOUT_ERP.protocol.specification.sha256);
    expect(lock?.matrix_sha256).toBe(DROPOUT_ERP.design.sha256);
    expect(Date.parse(lock?.frozen_at ?? "")).toBeLessThan(Date.parse(DROPOUT_ERP.execution.started_at));
  });

  it("names A5 as added after the lock and keeps the deferred hypotheses with their reasons", () => {
    expect(DROPOUT_ERP.results.added_analyses.map((a) => [a.analysis_id, a.analysis_class])).toEqual([
      ["A5", "exploratory"],
    ]);
    const deferred = DROPOUT_ERP.protocol.specification.hypotheses.filter((h) => h.status === "deferred");
    expect(deferred.map((h) => h.hypothesis_id)).toEqual(["H3", "H5", "H6"]);
  });

  it("keeps the large files outside the object, each with a verified sha256", () => {
    const traces = DROPOUT_ERP.artifacts.filter((a) => a.kind === "trace");
    expect(traces.filter((a) => a.run_id)).toHaveLength(20);
    expect(traces.filter((a) => a.deviation_id === "D1")).toHaveLength(15);
    expect(DROPOUT_ERP.artifacts.every((a) => /^[0-9a-f]{64}$/.test(a.sha256) && a.checksum_verified)).toBe(true);
  });

  it("takes R1 as version 2, which supersedes version 1 and still resolves", () => {
    const v2: Erp = {
      ...DROPOUT_ERP,
      version: 2,
      supersedes_version: 1,
      results: {
        ...DROPOUT_ERP.results,
        comparisons: [...DROPOUT_ERP.results.comparisons, R1_COMPARISON],
        added_analyses: [...DROPOUT_ERP.results.added_analyses, R1_ANALYSIS],
      },
    };
    expect(checkErp(v2)).toEqual([]);
    expect(erpAnalyses(v2).map((a) => a.analysis_id)).toContain("R1");
    expect([R1_COMPARISON.estimate, R1_COMPARISON.ci_low, R1_COMPARISON.ci_high]).toEqual([
      0.121633, 0.10026, 0.143256,
    ]);
  });
});

describe("checkErp", () => {
  it.each<[string, (erp: Erp) => void, string]>([
    [
      "a comparison of an unknown analysis",
      (e) => (e.results.comparisons[0].analysis_id = "A9"),
      "comparison A1 names unknown analysis: A9",
    ],
    [
      "a comparison of an unknown run",
      (e) => e.results.comparisons[0].run_ids.push("t99"),
      "comparison A1 names unknown run: t99",
    ],
    ["a run of an unknown job", (e) => (e.execution.runs[0].job_id = "XX/1"), "run t01 names unknown job: XX/1"],
    [
      "an observation whose attempt belongs to another run",
      (e) => (e.results.observations[0].attempt_id = "t02.1"),
      "observation t01.recall_at_20: attempt t02.1 belongs to run t02",
    ],
    [
      "a missing value given as a number",
      (e) => (e.results.observations[0].status = "not_recorded"),
      "observation t01.recall_at_20 has a value exactly when it is recorded",
    ],
    [
      "a retry counted as a second run",
      (e) => e.execution.runs.push({ ...e.execution.runs[0], run_id: "t01b" }),
      "job LR-E/1 v1 has 2 runs; a retry is an attempt of the same run, never a new run",
    ],
    [
      "a failed run with no reason",
      (e) => (e.execution.runs[0].status = "failed"),
      "run t01 is failed without a reason",
    ],
    [
      "an added analysis called confirmatory",
      (e) => (e.results.added_analyses[0].analysis_class = "confirmatory"),
      "analysis A5 was added after the lock, so it is exploratory",
    ],
    [
      "a primary hypothesis with no analysis",
      (e) => (e.protocol.specification.analyses[0].hypothesis_ids = []),
      "primary hypothesis H1 has no confirmatory analysis",
    ],
    [
      "an estimate outside its interval",
      (e) => (e.results.comparisons[0].estimate = 0.2),
      "comparison A1: the estimate lies outside its interval",
    ],
    [
      "a lock bound to another matrix",
      (e) => {
        if (e.protocol.lock) e.protocol.lock.matrix_sha256 = "0".repeat(64);
      },
      "the lock is bound to another matrix",
    ],
    [
      "a withheld artifact with no reason",
      (e) => (e.artifacts[1].included = false),
      "artifact trace-t01 is withheld without a reason",
    ],
    [
      "another schema",
      (e) => Object.assign(e, { schema: "rrp/v2" }),
      "schema rrp/v2 is not platform.experiment_result/v1",
    ],
  ])("rejects %s", (_, change, problem) => {
    expect(checkErp(broken(change))).toEqual([problem]);
  });

  it("rejects a complete package with a failed gate, a missing item or an unverified checksum", () => {
    const erp = broken((e) => {
      e.quality.gates[3].status = "failed";
      e.quality.validation.missing_items.push({ item: "entry year", required_by: "H3", action: "add the column" });
      e.artifacts[0].checksum_verified = false;
    });
    expect(checkErp(erp)).toEqual([
      "a complete package has no missing items",
      "a complete package verifies every checksum: plan",
      "a complete package has no pending or failed gate: QG04",
    ]);
    expect(checkErp({ ...erp, status: "partial" })).toEqual([]);
  });

  it("rejects confirmatory runs in a complete package without a lock", () => {
    expect(checkErp(broken((e) => (e.protocol.lock = null)))).toEqual(["confirmatory runs need a protocol lock"]);
  });
});

describe("the intake of the package", () => {
  it("reads it in seven parts and takes the sources from the record", () => {
    expect(INTAKE.map((s) => s.k)).toEqual(["pkg", "plan", "env", "runs", "results", "dev", "figs", "sources"]);
    expect(INTAKE.find((s) => s.k === "sources")?.src).toMatch(/^research record/);
    expect(new Set(INTAKE_CHECKS.map((c) => c.id)).size).toBe(INTAKE_CHECKS.length);
  });

  it("applies the decision rule itself: H1 supported, H2 and H4 not shown", () => {
    expect(ANALYSES.map((a) => [a.id, a.verdict])).toEqual([
      ["A1", "Supported"],
      ["A2", "Not shown"],
      ["A3", "Not shown"],
      ["A4", "Note only"],
      ["SA", "Note only"],
      ["A5", "Note only"],
    ]);
    expect(INTAKE_CHECKS.find((c) => c.id === "rule")?.ev).toBe("H2 and H4 not shown: their intervals include 0");
  });

  it("passes every check of the package part, with the count of records it traced", () => {
    expect(INTAKE_CHECKS.filter((c) => c.sec === "pkg").every((c) => c.s === "ok")).toBe(true);
    expect(INTAKE_CHECKS.find((c) => c.id === "refs")?.ev).toBe("153 records · 0 broken references");
  });
});
