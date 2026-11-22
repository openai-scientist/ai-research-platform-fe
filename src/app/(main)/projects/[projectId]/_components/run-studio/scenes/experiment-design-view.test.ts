import { describe, expect, it } from "vitest";

import type { Gate } from "@/lib/run-stream/contract";
import { parseDesignFindings, parseDesignPlan } from "@/lib/run-stream/experiment-design";
import plan from "@/lib/run-stream/fixtures/run-0719-design-plan.json";

import { designChecklist, designRuleQuestion, designView } from "./experiment-design-view";
import { readFileSync } from "node:fs";

const events = readFileSync("src/lib/run-stream/fixtures/run-0719-design.jsonl", "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const question = events.find((event) => event.seq === 661)?.payload.prompt;

describe("Experiment design presentation", () => {
  it("keeps H1's published association and executable covariates distinct", () => {
    const [h1] = parseDesignPlan(plan);
    const view = designView(h1);
    expect(view).toMatchObject({
      exposure: "sleep_hours_night",
      outcome: "exam_score",
      graph: { causal: false, edges: [], covariates: [] },
      program: { model: "linear_regression", covariates: [] },
      rule: { margin: undefined, source: undefined },
      metrics: [],
    });
    expect(view.estimandRows.find(([label]) => label === "Summary measure")?.[1]).toContain("weekly study hours");
    expect(view.robustness.length).toBeGreaterThan(0);
  });

  it("uses recorded provenance and retains zero-valued diagnosis points", () => {
    const fields = { sesoi: 0.4, direction: "> 0", sesoi_unit: "points/hour", sesoi_source_kind: "researcher" };
    const h1 = {
      id: "H1",
      decisionRule: fields,
      diagnosis: { power: { value: 0, n: 120 } },
      forecast: { probability: 0.7 },
    };
    expect(designView(h1)).toMatchObject({
      rule: { margin: 0.4, direction: "> 0", unit: "points/hour", source: "You set" },
      metrics: [
        { label: "Power at the SESOI", value: 0 },
        { label: "Diagnosis sample", value: 120 },
        { label: "Model forecast", value: 0.7 },
      ],
    });
    expect(designView({ id: "H1", decisionRule: { ...fields, sesoi_source_kind: "convention" } }).rule.source).toBe(
      "Agent proposal",
    );
    expect(designView({ id: "H1", decisionRule: { ...fields, sesoi: null } }).rule.margin).toBeUndefined();
  });

  it("links the actual decision question and marks the missing lock as blocked", () => {
    const gate = { kind: "decision", stageKey: "experiment_design", why: question } as Gate;
    expect(designRuleQuestion(gate)).toMatchObject({ id: "H1", prompt: expect.stringContaining("smallest change") });
    expect(designRuleQuestion({ ...gate, stageKey: "dataset" })).toBeUndefined();
    expect(designChecklist([], "answer")).toContainEqual(
      expect.objectContaining({ key: "decision_rules", state: "needs_you" }),
    );
    expect(designChecklist([], "send_back")).toContainEqual(
      expect.objectContaining({ key: "lock", status: "Blocked" }),
    );
  });

  it("adapts the methodologist's findings to the shared reviewer component", async () => {
    const { default: body } = await import("@/lib/run-stream/fixtures/run-0719-design-findings.json");
    expect(parseDesignFindings(body)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locator: "item:design/covariates",
          severity: "major",
          issue: expect.stringContaining("includes no covariates"),
        }),
      ]),
    );
  });
});
