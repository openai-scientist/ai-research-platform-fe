// Example data for the mock stages after the hypotheses (experiment, interpret, report, write): a sleep and
// exam-score study on 1,240 students. Every value here is what Popper would report through the event stream.

import type { DataColumn, DataIssue, Hypothesis, RoundKind, Skill, TestDesign, Verdict } from "../contract";

/** The topic of the example study the mock stages play. */
export const SAMPLE_TOPIC =
  "Does getting more sleep go with higher exam scores in our undergraduates, and what explains it?";

export const DOMAINS = ["Sleep science", "Educational psychology", "Survey statistics"];

/** The hypotheses each round tests: the first set, and the one tried after a pivot. */
export const ROUND_SETS: Record<Exclude<RoundKind, "refine" | "revise" | "review">, string[]> = {
  first: ["H1", "H2", "H3", "H4"],
  pivot: ["H5", "H6"],
};

export const EXPERIMENT_SKILLS: Skill[] = [
  {
    id: "experiment/regression",
    name: "Regression and mediation",
    category: "experiment",
    matched: ["exam score", "stress"],
  },
  { id: "tooling/sandbox", name: "Python sandbox", category: "tooling", matched: [] },
];

/** The analysis a set of hypotheses calls for: what varies, what is measured, what is held fixed. */
export function designFor(set: string[]): TestDesign {
  const independent: Record<string, string> = {
    H1: "sleep ≥ 7 h",
    H2: "stress_level (1–3)",
    H3: "screen_time",
    H4: "age > 25",
    H5: "study_hours",
    H6: "gender",
  };
  const chosen = set.map((h) => independent[h]).filter(Boolean);
  if (!chosen.includes("sleep ≥ 7 h")) chosen.unshift("sleep ≥ 7 h");
  const all = ["stress_level", "study_hours", "screen_time", "age", "gender"];
  return {
    independent: chosen,
    dependent: ["exam_score"],
    controls: all.filter((c) => !chosen.some((x) => x.startsWith(c))),
  };
}

export const DATASET = { name: "student_wellbeing.csv", version: 1, rows: 1240, columns: 8 } as const;

export const COLUMNS: (DataColumn & { cleanShare: number })[] = [
  { name: "student_id", type: "id", unit: "unique", cleanShare: 99.4 },
  { name: "sleep_hours", type: "number", unit: "h / night", cleanShare: 96.6 },
  { name: "study_hours", type: "number", unit: "h / week", cleanShare: 100 },
  { name: "stress_level", type: "label", unit: "3 levels", cleanShare: 92.3 },
  { name: "screen_time", type: "number", unit: "h / day", cleanShare: 99.9 },
  { name: "exam_score", type: "number", unit: "points, 0–100", cleanShare: 100 },
  { name: "age", type: "number", unit: "years", cleanShare: 99.8 },
  { name: "gender", type: "label", unit: "F / M", cleanShare: 100 },
];

/** 40 sample rows with the five problems planted where the Steward finds them. */
export function sampleRows(): string[][] {
  let seed = 20261005;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const rows: string[][] = [];
  for (let i = 0; i < 40; i++) {
    const sleep = Math.round((4.5 + rand() * 4.5) * 2) / 2;
    const level = Math.max(0, Math.min(2, Math.round((8 - sleep) / 1.5 + (rand() - 0.5))));
    rows.push([
      String(1001 + i),
      sleep.toFixed(1),
      String(Math.round(8 + rand() * 24)),
      ["Low", "Medium", "High"][level],
      (1 + rand() * 6.5).toFixed(1),
      String(Math.min(97, Math.round(50 + (sleep - 4.5) * 4.6 + rand() * 13))),
      String(18 + Math.floor(rand() * 7)),
      rand() < 0.52 ? "F" : "M",
    ]);
  }
  rows[8] = [...rows[7]];
  rows[23] = [...rows[22]];
  for (const i of [2, 17, 29]) rows[i][1] = "—";
  rows[5][6] = "212";
  rows[33][6] = "3";
  rows[1][3] = "high";
  rows[4][3] = "HIGH";
  rows[11][3] = "MED";
  rows[19][3] = "med.";
  rows[26][3] = "Hi";
  rows[9][4] = "26.0";
  return rows;
}

export interface MockIssue extends DataIssue {
  fix: string;
  method: string;
  replacements: { row: number; column: string; value: string }[];
}

export const ISSUES: MockIssue[] = [
  {
    id: "issue-1",
    title: "Missing sleep values",
    detail: "42 rows have no sleep_hours",
    column: "sleep_hours",
    affected_rows: 42,
    tone: "error",
    share: 3.4,
    cells: [2, 17, 29].map((row) => ({ row, column: "sleep_hours" })),
    rows: [],
    fix: "Filled with the median, 7.0 h",
    method: "Median impute",
    replacements: [2, 17, 29].map((row) => ({ row, column: "sleep_hours", value: "7.0" })),
  },
  {
    id: "issue-2",
    title: "Duplicate rows",
    detail: "7 students appear twice",
    column: "student_id",
    affected_rows: 7,
    tone: "warning",
    share: 0.6,
    cells: [],
    rows: [8, 23],
    fix: "Second copies removed",
    method: "Drop duplicate",
    replacements: [],
  },
  {
    id: "issue-3",
    title: "Impossible ages",
    detail: "3 ages outside 16–80",
    column: "age",
    affected_rows: 3,
    tone: "error",
    share: 0.2,
    cells: [5, 33].map((row) => ({ row, column: "age" })),
    rows: [5, 33],
    fix: "Those rows removed",
    method: "Drop row",
    replacements: [],
  },
  {
    id: "issue-4",
    title: "Messy stress labels",
    detail: "8 spellings of 3 levels",
    column: "stress_level",
    affected_rows: 96,
    tone: "warning",
    share: 7.7,
    cells: [1, 4, 11, 19, 26].map((row) => ({ row, column: "stress_level" })),
    rows: [],
    fix: "Mapped to Low, Medium, High",
    method: "Map labels",
    replacements: [
      { row: 1, column: "stress_level", value: "High" },
      { row: 4, column: "stress_level", value: "High" },
      { row: 11, column: "stress_level", value: "Medium" },
      { row: 19, column: "stress_level", value: "Medium" },
      { row: 26, column: "stress_level", value: "High" },
    ],
  },
  {
    id: "issue-5",
    title: "Screen time over 24 h",
    detail: "1 value above 24 h a day",
    column: "screen_time",
    affected_rows: 1,
    tone: "error",
    share: 0.1,
    cells: [{ row: 9, column: "screen_time" }],
    rows: [],
    fix: "Set to missing",
    method: "Set missing",
    replacements: [{ row: 9, column: "screen_time", value: "—" }],
  },
];

export const SLEEP_BARS = [
  { label: "< 5 h", value: 61.2 },
  { label: "5–6 h", value: 65.8 },
  { label: "6–7 h", value: 70.4 },
  { label: "7–8 h", value: 75.9 },
  { label: "8 h +", value: 74.6 },
];

export const REFERENCES = [
  {
    citation:
      "Okano K, Kaczmarzyk JR, Dave N, Gabrieli JDE, Grossman JC. Sleep quality, duration, and consistency are associated with better academic performance in college students. npj Science of Learning, 2019.",
    doi: "10.1038/s41539-019-0055-z",
  },
  {
    citation:
      "Curcio G, Ferrara M, De Gennaro L. Sleep loss, learning capacity and academic performance. Sleep Medicine Reviews, 2006.",
    doi: "10.1016/j.smrv.2005.11.001",
  },
  {
    citation:
      "Hershner SD, Chervin RD. Causes and consequences of sleepiness among college students. Nature and Science of Sleep, 2014.",
    doi: "10.2147/NSS.S62907",
  },
];

export const HYPOTHESES: Record<string, Hypothesis> = {
  H1: {
    id: "H1",
    from: ["H1"],
    statement: "Students who sleep 7 h or more score higher.",
    short: "Sleep ≥ 7 h",
    prediction: "> 0",
    outcome: "exam_score",
    exposure: "sleep ≥ 7 h vs < 7 h",
    estimand: "Adjusted difference",
    method: "Regression with controls",
    report_key: "h1_sleep7_diff",
    sub_question: "SQ1",
    gap: "G1",
    novelty:
      "Prior work rarely holds study time, stress and screens equal while testing a 7-hour cut-off in one faculty.",
    rationale: "Sleep consolidates what was learned that day, and lost sleep slows performance on tests.",
    falsify: {
      text: "Wrong if the 95% range of the adjusted difference touches or falls below 0 points.",
      zone: [null, 0],
      unit: "points",
    },
  },
  H2: {
    id: "H2",
    from: ["H2"],
    statement: "Stress carries part of the sleep effect.",
    short: "Via stress",
    prediction: "> 0",
    outcome: "exam_score",
    exposure: "sleep_hours, through stress",
    estimand: "Indirect effect",
    method: "Mediation, bootstrap",
    report_key: "h2_indirect",
    sub_question: "SQ2",
    gap: "G2",
    novelty: "Stress as the link is mostly tested in school-age adolescents, not in undergraduates.",
    rationale: "Short sleep raises next-day stress, and stress lowers exam performance.",
    tension_ids: ["X1"],
    falsify: {
      text: "Wrong if the 95% range of the indirect effect includes 0.",
      zone: [null, 0],
      unit: "points",
    },
  },
  H3: {
    id: "H3",
    from: ["H3"],
    statement: "More screen time lowers exam scores.",
    short: "Screen time",
    prediction: "< 0",
    outcome: "exam_score",
    exposure: "screen_time, hours a day",
    estimand: "Slope per hour",
    method: "Regression, robust errors",
    report_key: "h3_screen_slope",
    sub_question: "SQ4",
    gap: "G3",
    novelty: "Screens are tied to poor sleep, but rarely tested against grades directly.",
    rationale: "Screen time takes hours from study and sleep alike.",
    falsify: {
      text: "Wrong if the 95% range of the slope includes 0 or sits above it.",
      zone: [0, null],
      unit: "points per hour",
    },
  },
  H4: {
    id: "H4",
    from: ["H4"],
    caveats: [
      {
        by: "skeptic",
        about: "H4",
        severity: "caveat",
        text: "A wide interval is still a weak test; report H4 as exploratory.",
      },
    ],
    statement: "The sleep effect is stronger for students over 25.",
    short: "Age > 25",
    prediction: "> 0",
    outcome: "exam_score",
    exposure: "sleep × age over 25",
    estimand: "Difference in effects",
    method: "Interaction model",
    report_key: "h4_age_interaction",
    sub_question: "SQ1",
    gap: "G2",
    novelty: "Most samples are 18 to 22; the effect in older students is unknown.",
    rationale: "Older students often work and sleep less regularly, so sleep may matter more.",
    falsify: {
      text: "Wrong if the 95% range of the difference in effects includes 0.",
      zone: [null, 0],
      unit: "points",
    },
  },
  H5: {
    id: "H5",
    statement: "Study hours explain part of the sleep effect.",
    short: "Via study hours",
    prediction: "> 0",
    outcome: "exam_score",
    exposure: "sleep, with vs without study hours",
    estimand: "Drop in the sleep effect",
    method: "Compare two models",
    report_key: "h5_attenuation",
    sub_question: "SQ3",
    gap: "G1",
    novelty: "Few papers separate study time from sleep.",
    rationale: "Students who sleep more also study more, so part of the sleep gap may be study time.",
    falsify: {
      text: "Wrong if the 95% range of the drop in the sleep effect includes 0.",
      zone: [null, 0],
      unit: "points",
    },
  },
  H6: {
    id: "H6",
    statement: "The sleep effect differs between men and women.",
    short: "By gender",
    prediction: "≠ 0",
    outcome: "exam_score",
    exposure: "sleep × gender",
    estimand: "Difference in effects",
    method: "Interaction model",
    report_key: "h6_gender_interaction",
    sub_question: "SQ1",
    gap: "G2",
    novelty: "Differences by gender are rarely reported in the shortlisted papers.",
    rationale: "A steeper slope for women showed up in the data; worth a cheap check, flagged as such.",
    falsify: {
      text: "Wrong if the 95% range of the difference in effects includes 0.",
      zone: [0, 0],
      unit: "points",
    },
  },
  /** The held-back idea C6, as it joins the set when the person keeps it at the hypotheses stop. */
  H7: {
    id: "H7",
    from: ["C6"],
    contested: [
      {
        by: "methodologist",
        about: "C6",
        severity: "fatal",
        flaw: "undecidable_test",
        field: "method",
        text: "Exam timing isn't in a typical student survey, so no test here can decide it.",
      },
    ],
    statement: "Students whose exams fall early in the week gain less from sleep.",
    short: "Exam timing",
    prediction: "< 0",
    outcome: "exam_score",
    exposure: "sleep × early-week exam",
    estimand: "Difference in effects",
    method: "Interaction model",
    report_key: "h7_timing_interaction",
    sub_question: "SQ1",
    gap: "G1",
    novelty: "Exam timing is named as a limit in Curcio 2006 but never tested.",
    rationale: "Weekend sleep shifts leave less recovery before an early-week exam.",
    falsify: {
      text: "Wrong if the 95% range of the difference in effects includes 0.",
      zone: [0, null],
      unit: "points",
    },
  },
};

/** One analysis version: [kind, title, outcome, score, best, error or rule-2 note, parent index]. */
export type MockNode = [
  "draft" | "debug" | "improve",
  string,
  "valid" | "buggy" | "failed" | "dropped",
  number | null,
  boolean,
  string,
  number,
];

/** Search trees per hypothesis: index 0 is the first attempt, index 1 the deeper rerun. */
export const TREES: Record<string, MockNode[][]> = {
  H1: [
    [
      ["draft", "Regression, no controls", "valid", 0.71, false, "", -1],
      ["improve", "Add stress, study, screen, age", "valid", 0.84, true, "", 0],
      ["improve", "Curve instead of a line", "valid", 0.78, false, "", 0],
      ["improve", "Add a sleep × stress term", "valid", 0.81, false, "", 1],
    ],
    [
      ["draft", "Same model, deeper search", "valid", 0.82, false, "", -1],
      ["improve", "Add interaction checks", "valid", 0.86, true, "", 0],
      ["improve", "Robust standard errors", "valid", 0.83, false, "", 0],
    ],
  ],
  H2: [
    [
      ["draft", "Mediation through stress", "buggy", null, false, "KeyError: 'stress_score'", -1],
      ["debug", "Encode stress as 1–3", "valid", 0.66, true, "", 0],
      [
        "improve",
        "Report the stress–sleep correlation",
        "dropped",
        null,
        false,
        "It reports a correlation, not the indirect effect the plan promised.",
        1,
      ],
    ],
    [["draft", "Mediation, 5,000 resamples", "valid", 0.74, true, "", -1]],
  ],
  H3: [
    [
      ["draft", "Regression on screen time", "valid", 0.58, false, "", -1],
      ["improve", "Robust standard errors", "valid", 0.8, true, "", 0],
      ["improve", "Log of screen time", "valid", 0.71, false, "", 0],
    ],
    [["draft", "Robust regression, all controls", "valid", 0.82, true, "", -1]],
  ],
  H4: [
    [
      ["draft", "Interaction sleep × age", "buggy", null, false, "LinAlgError: singular matrix", -1],
      ["debug", "Drop overlapping age bands", "buggy", null, false, "ConvergenceWarning: fit did not converge", 0],
      ["debug", "Rescale and retry", "failed", null, false, "Out of attempts (3 of 3)", 1],
    ],
    [["draft", "Penalized interaction", "valid", 0.69, true, "", -1]],
  ],
  H5: [
    [
      ["draft", "Sleep effect with and without study hours", "valid", 0.77, false, "", -1],
      ["improve", "Bootstrap the difference", "valid", 0.85, true, "", 0],
      ["improve", "Add a study × sleep term", "valid", 0.74, false, "", 0],
    ],
  ],
  H6: [
    [
      ["draft", "Interaction sleep × gender", "valid", 0.72, true, "", -1],
      [
        "improve",
        "Three-way with study hours",
        "dropped",
        null,
        false,
        "It reports a three-way term, not the contrast the plan promised.",
        0,
      ],
    ],
  ],
};

export const CODE: Record<string, string[]> = {
  H1: [
    'df = load("student_wellbeing", version=2)',
    'df["sleep7"] = df.sleep_hours >= 7',
    'm = ols("exam_score ~ sleep7", df).fit()',
    'report("h1_sleep7_diff", m, term="sleep7")',
  ],
  H2: [
    'df = load("student_wellbeing", version=2)',
    'med = mediation(df, x="sleep_hours", m="stress_score", y="exam_score")',
    'report("h2_indirect", med.indirect)',
  ],
  H3: [
    'df = load("student_wellbeing", version=2)',
    'm = ols("exam_score ~ screen_time", df).fit()',
    'report("h3_screen_slope", m, term="screen_time")',
  ],
  H4: [
    'df = load("student_wellbeing", version=2)',
    'df["over25"] = df.age > 25',
    'm = ols("exam_score ~ sleep7 * over25", df).fit()',
    'report("h4_age_interaction", m, term="sleep7:over25")',
  ],
  H5: [
    'df = load("student_wellbeing", version=2)',
    'a = ols("exam_score ~ sleep7 + " + CONTROLS, df).fit()',
    'b = ols("exam_score ~ sleep7 + study_hours + " + CONTROLS, df).fit()',
    'report("h5_attenuation", a.params.sleep7 - b.params.sleep7)',
  ],
  H6: [
    'df = load("student_wellbeing", version=2)',
    'm = ols("exam_score ~ sleep7 * gender + " + CONTROLS, df).fit()',
    'report("h6_gender_interaction", m, term="sleep7:gender")',
  ],
};

/** The line each version adds on top of its parent. */
export const DIFF: Record<string, string> = {
  "Add stress, study, screen, age":
    'm = ols("exam_score ~ sleep7 + stress + study_hours + screen_time + age", df).fit()',
  "Curve instead of a line": 'm = ols("exam_score ~ bs(sleep_hours, df=4)", df).fit()',
  "Add a sleep × stress term": 'm = ols("exam_score ~ sleep7 * stress + study_hours + screen_time + age", df).fit()',
  "Same model, deeper search": 'm = ols(FULL_MODEL, df).fit(cov_type="HC3")',
  "Add interaction checks": 'checks = [ols(FULL_MODEL + f" + sleep7:{v}", df).fit() for v in CONTROLS]',
  "Robust standard errors": 'm = m.get_robustcov_results(cov_type="HC3")',
  "Encode stress as 1–3": 'df["stress_score"] = df.stress_level.map({"Low": 1, "Medium": 2, "High": 3})',
  "Report the stress–sleep correlation": 'report("h2_indirect", df.sleep_hours.corr(df.stress_score))',
  "Mediation, 5,000 resamples": 'med = mediation(df, x="sleep_hours", m="stress_score", y="exam_score", sims=5000)',
  "Log of screen time": 'm = ols("exam_score ~ np.log1p(screen_time)", df).fit()',
  "Robust regression, all controls": 'm = rlm("exam_score ~ screen_time + " + CONTROLS, df).fit()',
  "Drop overlapping age bands": "df = df[df.age.between(18, 40)]",
  "Rescale and retry": 'df["age_z"] = (df.age - df.age.mean()) / df.age.std()',
  "Penalized interaction": 'm = ols("exam_score ~ sleep7 * over25", df).fit_regularized(alpha=0.1)',
  "Bootstrap the difference": "gap = bootstrap(lambda d: attenuation(d, a, b), df, n=2000)",
  "Add a study × sleep term": 'b = ols("exam_score ~ sleep7 * study_hours + " + CONTROLS, df).fit()',
  "Three-way with study hours": 'm = ols("exam_score ~ sleep7 * gender * study_hours", df).fit()',
};

export interface MockResult {
  estimate: number | null;
  ci_low: number | null;
  ci_high: number | null;
  verdict: Verdict;
  reason: string;
  objection?: string;
}

/** Results per hypothesis: index 0 is the first attempt, index 1 the deeper rerun. */
export const RESULTS: Record<string, MockResult[]> = {
  H1: [
    {
      estimate: 6.1,
      ci_low: 4.2,
      ci_high: 8.0,
      verdict: "supported",
      reason: "6.1 points higher; the whole range is above zero.",
    },
    {
      estimate: 6.0,
      ci_low: 4.3,
      ci_high: 7.7,
      verdict: "supported",
      reason: "Holds with a deeper search: 6.0 points.",
    },
  ],
  H2: [
    {
      estimate: 0.9,
      ci_low: -0.3,
      ci_high: 2.1,
      verdict: "insufficient",
      reason: "Small, and the range includes zero.",
      objection: "The range rules out a large effect. I'd call it not supported.",
    },
    {
      estimate: 0.8,
      ci_low: -0.2,
      ci_high: 1.8,
      verdict: "insufficient",
      reason: "Still small, still includes zero.",
      objection: "Same objection: not supported is more honest.",
    },
  ],
  H3: [
    {
      estimate: -0.4,
      ci_low: -1.3,
      ci_high: 0.5,
      verdict: "not_supported",
      reason: "No slope; the range sits tightly around zero.",
    },
    { estimate: -0.3, ci_low: -1.1, ci_high: 0.5, verdict: "not_supported", reason: "Still no slope." },
  ],
  H4: [
    {
      estimate: null,
      ci_low: null,
      ci_high: null,
      verdict: "insufficient",
      reason: "The analysis never ran. That is not the same as finding no effect.",
    },
    {
      estimate: 0.6,
      ci_low: -2.9,
      ci_high: 4.1,
      verdict: "insufficient",
      reason: "It ran this time, but 58 students give a very wide range.",
    },
  ],
  H5: [
    {
      estimate: 1.8,
      ci_low: 0.9,
      ci_high: 2.7,
      verdict: "supported",
      reason: "Adding study hours shrinks the sleep effect by 1.8 points, about 30%.",
    },
  ],
  H6: [
    {
      estimate: 0.3,
      ci_low: -1.4,
      ci_high: 2.0,
      verdict: "insufficient",
      reason: "Small and uncertain.",
      objection: "Agree with the verdict. Flag it as a fishing risk.",
    },
  ],
};

export const TABLE_1 = {
  title: "Table 1",
  caption: "Students in data v2 (n = 1,230).",
  header: ["Variable", "Mean (SD) or share"],
  rows: [
    ["Sleep, hours per night", "6.9 (1.1)"],
    ["Study, hours per week", "19.8 (6.2)"],
    ["Screen time, hours per day", "4.1 (1.6)"],
    ["Final exam score, 0–100", "71.3 (8.4)"],
    ["High stress", "31%"],
    ["Women", "52%"],
  ],
};
