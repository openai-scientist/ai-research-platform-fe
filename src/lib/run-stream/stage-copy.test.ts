import { describe, expect, it } from "vitest";

import { NO_RESULTS_ACCEPT, stageAnswerCopy } from "./stage-copy";

describe("stageAnswerCopy", () => {
  const stages = ["dataset", "hypothesis", "experiment_design", "execution"] as const;

  it("gives every stage its own Accept and Send back copy", () => {
    const accepts = stages.map((key) => stageAnswerCopy(key, "x").accept.description);
    const sendBacks = stages.map((key) => stageAnswerCopy(key, "x").sendBack.leads_to);
    expect(new Set(accepts).size).toBe(stages.length);
    expect(new Set(sendBacks).size).toBe(stages.length);
  });

  it("does not hand Design's text to Execution", () => {
    const execution = stageAnswerCopy("execution", "execution results");
    expect(execution.accept).toEqual({
      description: "Record the results as they are; Writing can start.",
      leads_to: "Writing can start",
    });
    expect(JSON.stringify(execution)).not.toMatch(/registered analyses|decision rules/);
    expect(stageAnswerCopy("experiment_design", "x").accept.description).toMatch(/registered analyses/);
  });

  it("says where Dataset and Hypothesis lead", () => {
    expect(stageAnswerCopy("dataset", "data card").accept.leads_to).toBe("Hypothesis can begin");
    expect(stageAnswerCopy("hypothesis", "x", true).accept.leads_to).toBe("Experiment design starts");
    expect(stageAnswerCopy("hypothesis", "x", false).accept.leads_to).toBe("The run is complete");
  });

  it("falls back to the subject for other stages", () => {
    expect(stageAnswerCopy("writing", "paper").sendBack.leads_to).toBe("The paper runs again");
  });

  it("says accepting ends Execution with no estimates", () => {
    expect(NO_RESULTS_ACCEPT.description).toBe("Ends Execution with no estimates.");
  });
});
