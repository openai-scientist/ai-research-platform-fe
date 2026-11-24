import { describe, expect, it } from "vitest";

import { firstGateRefusal, gateRefusal } from "./node-gate-refusal";
import { plainNote } from "./plain-notes";

const SEALED =
  "This file's confirmation rows are already locked to another analysis plan (an earlier run). Another plan cannot use them. Start the study on a new data file.";

describe("gateRefusal", () => {
  it("says a plan-sealed refusal in the agreed words", () => {
    expect(gateRefusal("plan_sealed")).toEqual({ code: "plan_sealed", sentence: SEALED });
    expect(gateRefusal("gate_plan_sealed")).toEqual({ code: "gate_plan_sealed", sentence: SEALED });
    expect(gateRefusal("refused by the node: gate_plan_sealed")?.sentence).toBe(SEALED);
  });

  it("maps the other gate reasons to plain sentences", () => {
    for (const code of ["gate_small_cell", "gate_blocked", "gate_overlap", "probe_budget_exhausted"]) {
      const found = gateRefusal(code);
      expect(found?.sentence).toMatch(/^[A-Z].*\.$/);
      expect(found?.sentence).not.toContain("_");
    }
    expect(gateRefusal("probe_budget_exhausted: confirmation queries")?.code).toBe("probe_budget_exhausted");
  });

  it("shows an unknown gate code readably instead of guessing", () => {
    expect(gateRefusal("gate_new_rule")?.sentence).toBe("The Local Node refused the release (gate new rule).");
  });

  it("names nothing when the reason is absent or is not a gate reason", () => {
    expect(gateRefusal(undefined)).toBeNull();
    expect(gateRefusal("the dry_runs object is empty")).toBeNull();
    expect(firstGateRefusal([undefined, "plain text", null])).toBeNull();
  });

  it("takes the first refusal in the list", () => {
    expect(firstGateRefusal(["x", "gate_overlap", "gate_plan_sealed"])?.code).toBe("gate_overlap");
  });

  it("reaches every place that prints a system note", () => {
    expect(plainNote("gate_plan_sealed")).toBe(SEALED);
    expect(plainNote("the results are sealed")).not.toBe(SEALED);
  });
});
