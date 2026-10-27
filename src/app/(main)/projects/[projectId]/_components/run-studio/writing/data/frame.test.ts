import { describe, expect, it } from "vitest";

import { checkRecord, FRAME_FIELDS, RESULTS_ONLY, type StudyRecord } from "./frame";
import { DESCRIPTIVE } from "./records/descriptive";
import { DROPOUT } from "./records/dropout";
import { GROUPED } from "./records/grouped";
import { PROPOSAL } from "./records/proposal";
import { REGRESSION } from "./records/regression";
import { TEMPORAL } from "./records/temporal";

/* What the frame must say about each record: the fields that are not plain ok, the rules that fire, and the ceiling. */
const EXPECTED: Record<
  string,
  { record: StudyRecord; notOk: Record<string, string>; codes: string[]; strength: string; confirmatory: boolean }
> = {
  dropout: {
    record: DROPOUT,
    notOk: { "C.8": "na", "E.2": "warn", "H.1": "warn", "K.3": "warn" },
    codes: ["groups-checked", "deviation", "cite-only"],
    strength: "indicate",
    confirmatory: true,
  },
  regression: { record: REGRESSION, notOk: { "C.8": "na" }, codes: [], strength: "indicate", confirmatory: true },
  temporal: {
    record: TEMPORAL,
    notOk: { "C.8": "na", "K.3": "warn" },
    codes: ["cite-only"],
    strength: "indicate",
    confirmatory: true,
  },
  grouped: { record: GROUPED, notOk: { "C.8": "na" }, codes: [], strength: "indicate", confirmatory: true },
  descriptive: {
    record: DESCRIPTIVE,
    notOk: { "C.8": "na", "D.2": "na", "D.3": "na", "E.1": "na", "E.3": "na", "K.3": "warn" },
    codes: ["cite-only"],
    strength: "indicate",
    confirmatory: true,
  },
  proposal: {
    record: PROPOSAL,
    notOk: { "C.8": "na", ...Object.fromEntries([...RESULTS_ONLY].map((id) => [id, "na"])) },
    codes: [],
    strength: "none",
    confirmatory: false,
  },
};

describe("the report frame", () => {
  it("has 14 parts and 51 fields, 41 of them must", () => {
    expect(new Set(FRAME_FIELDS.map((f) => f.part)).size).toBe(14);
    expect(FRAME_FIELDS).toHaveLength(51);
    expect(FRAME_FIELDS.filter((f) => f.level === "must")).toHaveLength(41);
    expect(RESULTS_ONLY.size).toBe(9);
  });

  for (const [name, x] of Object.entries(EXPECTED)) {
    describe(`the ${name} record`, () => {
      const r = checkRecord(x.record);
      it("fills only fields the frame defines", () => {
        const ids = new Set(FRAME_FIELDS.map((f) => f.id));
        expect(Object.keys(x.record.values).filter((id) => !ids.has(id))).toEqual([]);
      });
      it("gets the expected status for every field", () => {
        const notOk = Object.fromEntries(Object.entries(r.status).filter(([, s]) => s !== "ok"));
        expect(notOk).toEqual(x.notOk);
      });
      it("fires only the expected rules and is not blocked", () => {
        expect(r.findings.map((f) => f.code)).toEqual(x.codes);
        expect(r.blocked).toBe(false);
      });
      it("sets the expected claim ceiling", () => {
        expect(r.ceiling).toEqual({
          strength: x.strength,
          causes: "never",
          significant: "never",
          confirmatory: x.confirmatory,
        });
      });
    });
  }
});

/* Each convention, broken on purpose: the frame must catch it and block the run. */
const broken = (record: StudyRecord, change: Partial<StudyRecord["profile"]>, values: Record<string, string> = {}) =>
  checkRecord({ ...record, profile: { ...record.profile, ...change }, values: { ...record.values, ...values } });
const codes = (r: ReturnType<typeof checkRecord>) => r.findings.filter((f) => f.status === "bad").map((f) => f.code);

describe("the frame catches broken conventions", () => {
  it("time-ordered data tested on a random split", () => {
    const r = broken(TEMPORAL, { split: "random" });
    expect(codes(r)).toEqual(["time-split"]);
    expect(r.status["D.2"]).toBe("bad");
    expect(r.ceiling.strength).toBe("none");
  });
  it("grouped data with neither a group split nor group intervals", () => {
    const r = broken(GROUPED, { split: "random", uncertainty: "unit" });
    expect(codes(r)).toEqual(["groups-ignored"]);
    expect(r.status["E.2"]).toBe("bad");
  });
  it("a classification measure on a regression task", () => {
    expect(codes(broken(REGRESSION, { metric: "ranking" }))).toEqual(["metric-task"]);
  });
  it("a causal claim from observational data", () => {
    expect(codes(broken(DESCRIPTIVE, { claim: "causal" }))).toEqual(["causal-claim"]);
  });
  it("a causal claim stays allowed only with an experiment", () => {
    expect(broken(DESCRIPTIVE, { claim: "causal", design: "experiment" }).ceiling.causes).toBe("allowed");
  });
  it("results written into a proposal", () => {
    const r = broken(PROPOSAL, {}, { "G.1": "A1 → H1 · supported" });
    expect(codes(r)).toEqual(["results-in-proposal"]);
  });
  it("a predictive field marked not applicable in a predictive study", () => {
    const r = checkRecord({ ...REGRESSION, na: ["C.8", "E.1"] });
    expect(codes(r)).toEqual(["na-not-allowed"]);
  });
  it("a must field left empty", () => {
    const values = { ...DROPOUT.values };
    delete values["B.10"];
    expect(codes(checkRecord({ ...DROPOUT, values }))).toEqual(["missing"]);
  });
  it("a plan locked after the data were analysed caps the wording at suggest", () => {
    const r = broken(DROPOUT, { plan: "after" });
    expect(r.status["B.4"]).toBe("warn");
    expect(r.status["G.1"]).toBe("warn");
    expect(r.ceiling).toMatchObject({ strength: "suggest", confirmatory: false });
  });
  it("findings seen in more than one site may be worded as shown", () => {
    expect(broken(GROUPED, { sites: 2 }).ceiling.strength).toBe("show");
  });
});
