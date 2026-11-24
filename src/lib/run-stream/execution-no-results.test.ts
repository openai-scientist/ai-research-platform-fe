import { describe, expect, it } from "vitest";

import {
  type EvidenceRecord,
  EXECUTION_RECORDS,
  type ExecutionContent,
  executionNoResults,
  noResultsMessage,
} from "./execution";

const content = (
  checks: ExecutionContent["checks"],
  artifacts: ExecutionContent["artifacts"] = {},
): ExecutionContent => ({
  artifacts,
  progress: {},
  checks,
});
const item = (key: string, state: string, reason?: string) => ({ key, state, reason });
const record = (estimate: number | null): EvidenceRecord => ({
  record_id: "r",
  analysis_id: "a",
  hypothesis_ids: ["H1"],
  role: "primary",
  estimate,
  verdict: "supported",
});

describe("executionNoResults", () => {
  it("is unknown before anything was reported", () => {
    expect(executionNoResults(undefined)).toBeNull();
    expect(executionNoResults(content({}))).toBeNull();
  });

  it("detects a run that ended before the unseal (RUN-EBE4)", () => {
    const found = executionNoResults(
      content({
        lock: item("lock", "not_applicable", "the run ended before the unseal"),
        unseal: item("unseal", "not_applicable", "the run ended before the unseal"),
        verdicts: item("verdicts", "red", "H1 has no verdict"),
      }),
    );
    expect(found?.reason).toBe("the run ended before the unseal");
    expect(noResultsMessage(found!)).toBe(
      "No analysis was computed. The plan check stopped before unseal: the run ended before the unseal. Accepting ends Execution with no estimates.",
    );
  });

  it("prefers the check that stopped the work over the generic reason", () => {
    const found = executionNoResults(
      content({
        rehearsal: item("rehearsal", "red", "The rehearsal answer for H1 did not match the Design release."),
        unseal: item("unseal", "red", "the results are sealed"),
      }),
    );
    expect(found?.reason).toBe("the rehearsal answer for H1 did not match the Design release");
  });

  it("detects published records that hold no estimate, and an empty publication", () => {
    const checks = { unseal: item("unseal", "green"), verdicts: item("verdicts", "green") };
    expect(executionNoResults(content(checks), [record(null)])).not.toBeNull();
    expect(executionNoResults(content(checks, { [EXECUTION_RECORDS]: "a1" }), [])).not.toBeNull();
  });

  it("is null when results exist", () => {
    const checks = { unseal: item("unseal", "green"), verdicts: item("verdicts", "green") };
    expect(executionNoResults(content(checks, { [EXECUTION_RECORDS]: "a1" }), [record(0.4)])).toBeNull();
  });
});

describe("a Local Node refusal", () => {
  const SEALED =
    "This file's confirmation rows are already locked to another analysis plan (an earlier run). Another plan cannot use them. Start the study on a new data file.";
  const refused = (code: string): EvidenceRecord => ({
    ...record(null),
    execution_status: { state: "not_computed", code },
  });

  it("replaces the dry-run wording when the records carry gate_plan_sealed (RUN-AACE)", () => {
    const found = executionNoResults(
      content({ dry_run: item("dry_run", "red", "dry_runs empty; no tool posts a dry run") }),
      [refused("gate_plan_sealed")],
    );
    expect(noResultsMessage(found!)).toBe(
      `No analysis was computed. ${SEALED} Accepting ends Execution with no estimates.`,
    );
  });

  it("also reads the refusal from a check reason", () => {
    const found = executionNoResults(content({ unseal: item("unseal", "red", "gate_plan_sealed") }));
    expect(noResultsMessage(found!)).toContain("Start the study on a new data file.");
  });

  it("keeps the old wording when no refusal reason is present", () => {
    const found = executionNoResults(content({ unseal: item("unseal", "red", "the results are sealed") }));
    expect(noResultsMessage(found!)).toContain("The plan check stopped before unseal");
  });
});
