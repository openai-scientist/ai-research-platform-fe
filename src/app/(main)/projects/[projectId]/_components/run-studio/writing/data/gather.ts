export interface LedgerRow {
  id: string;
  k: string;
  sec: string;
  v: string;
  src: string;
  at: string;
  ctx: string[];
  hit?: number;
}

/* ===== content for the Data screens: the ledger, the journal diff, Toulmin sources, the map layout ===== */

/* The evidence ledger: a sample of the 91 spans, grouped by the section that may use them. */
export const LEDGER: LedgerRow[] = [
  {
    id: "EV-09",
    k: "quote",
    sec: "Introduction",
    v: "“These classification models are part of a Learning Analytic tool that includes predictive analyses which provide information to the tutoring team at our higher education institution with an estimate of the risk of dropout and failure.”",
    src: "Realinho et al., 2022",
    at: "p. 2, ¶ 1",
    ctx: [
      "The problem is formulated as a three-category classification task (dropout, enrolled, and graduate)…",
      "These classification models are part of a Learning Analytic tool that includes predictive analyses which provide information to the tutoring team at our higher education institution with an estimate of the risk of dropout and failure.",
      "With this information, the tutoring team provides more accurate help to students.",
    ],
  },
  {
    id: "EV-10",
    k: "quote",
    sec: "Related work",
    v: "“When the errors are corrected, complex ML models perform no better than baseline LR models…”",
    src: "Kapoor & Narayanan, 2023",
    at: "Results, civil war case",
    ctx: [
      "…four papers claimed that complex ML models outperformed logistic regression.",
      "When the errors are corrected, complex ML models perform no better than baseline LR models in each case except Wang, where the difference between the area under the curve (AUC) of the complex ML models and LR models drops from 0.14 to 0.01.",
    ],
  },
  {
    id: "EV-01",
    k: "num",
    sec: "Method",
    v: "3,630 of 4,424",
    src: "analysis.json",
    at: "data.analysed",
    ctx: [
      '"rows": 4424,',
      '"classes": { "Graduate": 2209, "Dropout": 1421, "Enrolled": 794 },',
      '"analysed": 3630,',
      '"dropouts": 1421,',
    ],
    hit: 1,
  },
  {
    id: "EV-11",
    k: "quote",
    sec: "Method",
    v: "“Data leakage is a flaw in machine learning that leads to overoptimistic results”",
    src: "Kapoor & Narayanan, 2023",
    at: "Highlights",
    ctx: [
      "Data leakage is a flaw in machine learning that leads to overoptimistic results",
      "Our survey of prior reviews shows leakage affects 294 papers across 17 scientific fields",
    ],
  },
  {
    id: "EV-13",
    k: "quote",
    sec: "Method",
    v: "“An input is used only if it is known by then.”",
    src: "plan.md",
    at: "§3, ¶ 1",
    ctx: [
      "## 3. When the prediction is made, and which inputs are fair (RF 6c)",
      "The ranking is produced at the **end of the first semester**. An input is used only if it is known by then.",
    ],
  },
  {
    id: "EV-12",
    k: "cite",
    sec: "Method",
    v: "May be cited; may not be quoted.",
    src: "Christodoulou et al., 2019",
    at: "abstract only",
    ctx: ["Licence: abstract only.", "Full text not available to the run."],
  },
  {
    id: "EV-02",
    k: "num",
    sec: "Results",
    v: "0.392 · 0.396 · 0.507",
    src: "results.csv",
    at: "rows 1–15",
    ctx: [
      "row,name,recall_at_20 (seeds 1–5)",
      "1–5,LR-E,0.387|0.394|0.391|0.398|0.387",
      "6–10,GB-E,0.377|0.394|0.401|0.412|0.394",
      "11–15,GB-ES1,0.507|0.504|0.511|0.504|0.511",
    ],
    hit: 2,
  },
  {
    id: "EV-05",
    k: "num",
    sec: "Results",
    v: "0.111, CI 0.092–0.129",
    src: "results.csv",
    at: "row 21",
    ctx: [
      "row,name,estimate,ci_low,ci_high",
      "21,A1 · H1 · GB-ES1 − GB-E,0.1113,0.0921,0.1291",
      "22,A2 · H2 · gain below − above median admission,-0.0311,-0.1086,0.027",
    ],
    hit: 2,
  },
  {
    id: "EV-06",
    k: "num",
    sec: "Results",
    v: "0.111, CI 0.081–0.146",
    src: "results.csv",
    at: "row 24",
    ctx: ["row,name,estimate,ci_low,ci_high", "24,A1 · course bootstrap,0.1113,0.0811,0.1457"],
    hit: 1,
  },
  {
    id: "EV-07",
    k: "num",
    sec: "Results",
    v: "−0.031, CI −0.109–0.027",
    src: "results.csv",
    at: "row 22",
    ctx: ["row,name,estimate,ci_low,ci_high", "22,A2 · H2 · gain below − above median admission,-0.0311,-0.1086,0.027"],
    hit: 1,
  },
  {
    id: "EV-08",
    k: "num",
    sec: "Results",
    v: "0.004, CI −0.007–0.021",
    src: "results.csv",
    at: "row 23",
    ctx: ["row,name,estimate,ci_low,ci_high", "23,A3 · H4 · GB-E − LR-E,0.0042,-0.0065,0.0215"],
    hit: 1,
  },
  {
    id: "EV-14",
    k: "gap",
    sec: "Results 4.4",
    v: "No entry year exists.",
    src: "data.csv",
    at: "no year column",
    ctx: ["The data names no entry year for any student.", "Nothing may be written about change across cohorts."],
  },
];
export const RECHECK: Record<string, string> = {
  "EV-01": "3,630 of 4,424",
  "EV-02": "0.392 · 0.396 · 0.507",
  "EV-05": "0.111, CI 0.092–0.129",
  "EV-06": "0.111, CI 0.081–0.146",
  "EV-07": "−0.031, CI −0.109–0.027",
  "EV-08": "0.004, CI −0.007–0.021",
};
export const NUM_ROWS = LEDGER.filter((r) => r.k === "num").map((r) => r.id);
export const BAD_REF = 17;
/** Entries in refs.bib: 21 real references and one planted entry, number 17, whose DOI does not exist. */
export const REFS_TOTAL = 22;
/** Rows in results.csv; S02 recomputes every one from the traces. */
export const RESULT_ROWS_TOTAL = 40;

/* The journal: each topic with what the rules demand and what the journal's papers usually do. */
export const JOURNAL_DIFF: { t: string; rule: string | null; habit: string; rel: string; fit?: number }[] = [
  { t: "Length", rule: "Up to 9,000 words", habit: "Median 8,600 words", rel: "agree" },
  { t: "Abstract", rule: "Structured, up to 250 words", habit: "One paragraph in 81% of papers", rel: "conflict" },
  { t: "Data availability", rule: "Statement required", habit: "Present in 58% of papers", rel: "rule" },
  { t: "Use of AI", rule: "Must be declared", habit: "Rarely declared before 2025", rel: "rule" },
  { t: "“Significant”", rule: "Only with a stated test", habit: "4.1 hedges per 1,000 words", rel: "agree", fit: 5 },
  { t: "References", rule: "ACM style", habit: "1.2 citations per paragraph", rel: "agree", fit: 8 },
  { t: "Paragraph", rule: null, habit: "About 132 words", rel: "habit", fit: 6 },
  { t: "Voice", rule: null, habit: "“We”, 22% passive", rel: "habit", fit: 7 },
];
export const CONTRACT: [string, string, string][] = [
  ["§1", "At most 9,000 words; six sections with the budgets below.", "rule"],
  ["§2", "Structured abstract of at most 250 words: Background, Method, Results, Conclusions.", "rule"],
  ["§3", "“Significant” only next to a stated statistical test.", "rule"],
  ["§4", "Data availability and use-of-AI statements at the end.", "rule"],
  ["§5", "Gap and question in 1.1; hypotheses named in 3.5; findings in 4.1–4.3; limits in 5.2.", "axis"],
  ["§6", "Every rebuttal is written in 5.2; reconstructed warrants are stated once, in Method.", "axis"],
  ["§7", "Paragraphs of about 110–150 words; “we”, with little passive voice; past tense for results.", "habit"],
  ["§8", "IMRaD with a Related work section, as 64% of the journal's papers do; CARS in the Introduction.", "habit"],
];

/* Where each part of a claim comes from. */
export const TOU_SRC: Record<string, Record<string, string>> = {
  F1: {
    data: "rows 6–15, 21 · T08",
    war: "plan.md §5 · answered T11",
    back: "Interval by course · S07",
    qual: "Record scope · C.3",
    reb: "Upheld at T15",
  },
  F2: {
    data: "rows 39–40 · T18",
    war: "plan.md §6 · answered T21",
    back: "Locked 27 Oct · T20",
    qual: "Conceded at T24",
    reb: "Conceded at T23",
  },
  F3: {
    data: "row 23 · T25",
    war: "In no source",
    back: "Efron & Tibshirani, 1993",
    qual: "Conceded at T30",
    reb: "Plan B.11 · after T28",
  },
  C: {
    data: "F1 and F2 · T31",
    war: "In no source · T33",
    back: "Realinho et al., 2022 · T35",
    qual: "Narrowed by you · K04",
    reb: "Scope critic · T32",
  },
};

/* The argument map, laid out in columns: question, hypothesis, evidence, finding, conclusion, implication. The gaps
   between evidence, finding, conclusion and implication are wide enough for a scheme node, so no scheme sits on a card. */
export const MAP_W = 1090;
export const MAP_H = 650;
export const MAP_COLS: [string, number, number][] = [
  ["Question", 10, 140],
  ["Hypothesis", 178, 140],
  ["Evidence", 346, 140],
  ["Finding", 544, 140],
  ["Conclusion", 742, 140],
  ["Implication", 940, 140],
];
export const ROW_Y: number[] = [184, 316, 448];
export const MAP_SCH: Record<string, { k: string; x: number; y: number }> = {
  RA1: { k: "ra", x: 515, y: ROW_Y[0] + 38 },
  RA2: { k: "ra", x: 515, y: ROW_Y[1] + 38 },
  RA3: { k: "ra", x: 515, y: ROW_Y[2] + 38 },
  RA4: { k: "ra", x: 713, y: 288 },
  RA5: { k: "ra", x: 911, y: ROW_Y[0] + 38 },
  RA6: { k: "ra dang", x: 911, y: 388 },
  CA1: { k: "ca", x: 614, y: 128 },
  CA2: { k: "ca", x: 812, y: 128 },
  CA3: { k: "ca", x: 416, y: 576 },
  PA1: { k: "pa", x: 520, y: 614 },
  CA4: { k: "ca", x: 812, y: 404 },
  CA5: { k: "ca", x: 515, y: 420 },
  PA2: { k: "pa", x: 515, y: 453 },
};
/* How each line runs: the side it leaves by, the side it enters by, and for a line that turns, where its middle
   segment goes. Every line keeps to the gaps between cards and lanes. Handles: ts/b/rs/ls leave by the top, bottom,
   right, left; t/bt/rt/lt enter by the same. */
export const MAP_ROUTE: Record<string, { s: string; t: string; cx?: number; cy?: number }> = {
  "GAP-RQ": { s: "b", t: "t" },
  "RQ-OBJ": { s: "b", t: "t" },
  "RQ-H1": { s: "rs", t: "lt" },
  "RQ-H2": { s: "rs", t: "lt" },
  "RQ-H4": { s: "rs", t: "lt" },
  "H1-E1": { s: "rs", t: "lt" },
  "H2-E2": { s: "rs", t: "lt" },
  "H4-E3": { s: "rs", t: "lt" },
  "L3-IMP": { s: "b", t: "t" },
  "E1-RA1": { s: "rs", t: "lt" },
  "W1-RA1": { s: "rs", t: "lt" },
  "RA1-F1": { s: "rs", t: "lt" },
  "E2-RA2": { s: "rs", t: "lt" },
  "RA2-F2": { s: "rs", t: "lt" },
  "E3-RA3": { s: "rs", t: "lt" },
  "RA3-F3": { s: "rs", t: "lt" },
  "F1-RA4": { s: "rs", t: "lt" },
  "F2-RA4": { s: "rs", t: "lt" },
  "RA4-C": { s: "rs", t: "lt" },
  "C-RA5": { s: "rs", t: "lt" },
  "RA5-IMP": { s: "rs", t: "lt" },
  "RA6-X": { s: "rs", t: "lt" },
  "L1-CA1": { s: "b", t: "t" },
  "CA1-RA1": { s: "b", t: "t", cy: 174 },
  "L2-CA2": { s: "b", t: "t" },
  "CA2-RA4": { s: "b", t: "t", cy: 174 },
  "F3-CA3": { s: "b", t: "rt" },
  "CA3-H4": { s: "ls", t: "bt" },
  "PA1-CA3": { s: "ls", t: "bt" },
  "F2-CA5": { s: "b", t: "rt" },
  "CA5-H2": { s: "ls", t: "bt" },
  "PA2-CA5": { s: "ts", t: "bt" },
  "CX-CA4": { s: "ts", t: "bt" },
  "CA4-C": { s: "ts", t: "bt" },
};
export const MAP_LIFE: [string, string, string?][] = [
  ["GAP", "RQ"],
  ["RQ", "OBJ"],
  ["RQ", "H1"],
  ["RQ", "H2"],
  ["RQ", "H4"],
  ["H1", "E1", "test"],
  ["H2", "E2", "test"],
  ["H4", "E3", "test"],
  ["L3", "IMP", "lim"],
];
export const MAP_AIF: [string, string, string?][] = [
  ["E1", "RA1"],
  ["W1", "RA1"],
  ["RA1", "F1"],
  ["E2", "RA2"],
  ["RA2", "F2"],
  ["E3", "RA3"],
  ["RA3", "F3"],
  ["F1", "RA4"],
  ["F2", "RA4"],
  ["RA4", "C"],
  ["C", "RA5"],
  ["RA5", "IMP"],
  ["RA6", "X"],
  ["L1", "CA1", "att"],
  ["CA1", "RA1", "att"],
  ["L2", "CA2", "att"],
  ["CA2", "RA4", "att"],
  ["F3", "CA3", "att"],
  ["CA3", "H4", "att"],
  ["PA1", "CA3", "pref"],
  ["F2", "CA5", "att"],
  ["CA5", "H2", "att"],
  ["PA2", "CA5", "pref"],
  ["CX", "CA4", "att"],
  ["CA4", "C", "att"],
];
export const SCHEME_INFO: Record<string, string> = {
  RA1: "Evidence to hypothesis: E1 and warrant W1 support Finding 1.",
  RA2: "Evidence to hypothesis: E2 supports Finding 2, on a split fixed in advance.",
  RA3: "Negative result: E3 supports Finding 3, qualified as “no clear gain”.",
  RA4: "Sample to population: Findings 1 and 2 support the Conclusion.",
  RA5: "Practical reasoning: the Conclusion supports the implication for advisers.",
  RA6: "Holds up an implication but has no premise at all.",
  CA1: "Undercut from T15: students share courses and cohorts, so a student-level interval is too narrow.",
  CA2: "Undercut from L2: one polytechnic, 11 cohorts. Met by the narrowed qualifier.",
  CA3: "Finding 3 conflicts with hypothesis H4.",
  PA1: "Prefers the evidence (F3) over the hypothesis (H4), as ruled at T30.",
  CA5: "Finding 2 conflicts with hypothesis H2: the gain is not larger below the median.",
  PA2: "Prefers the evidence (F2) over the hypothesis (H2), as with H4.",
  CA4: "Rebut from T44: in course 171 no dropout is flagged. No preference either way.",
};

/* Evidence coverage: every source against every section of the paper. Counts are evidence spans; they add up to 91. */
export const COVER_COLS: { k: string; s: string; n: string; full: string }[] = [
  { k: "int", s: "Int", n: "Intro", full: "1 Introduction" },
  { k: "rel", s: "Rel", n: "Related", full: "2 Related work" },
  { k: "met", s: "Met", n: "Method", full: "3 Method" },
  { k: "r1", s: "4.1", n: "4.1", full: "4.1 Finding 1" },
  { k: "r2", s: "4.2", n: "4.2", full: "4.2 Finding 2" },
  { k: "r3", s: "4.3", n: "4.3", full: "4.3 Finding 3" },
  { k: "r4", s: "4.4", n: "4.4", full: "4.4 Change across cohorts" },
  { k: "dis", s: "Dis", n: "Disc.", full: "5 Discussion" },
];
export const COVER_ROWS: { src: string; short: string; sub: string; k: string; c: Record<string, number> }[] = [
  { src: "results.csv", short: "results.csv", sub: "40 rows", k: "num", c: { met: 3, r1: 8, r2: 5, r3: 5, dis: 4 } },
  { src: "plan.md", short: "plan.md", sub: "locked plan", k: "quote", c: { int: 1, met: 5 } },
  { src: "analysis.json", short: "analysis.json", sub: "verdicts", k: "quote", c: { r2: 2, r3: 3, dis: 3 } },
  { src: "Realinho et al., 2022", short: "Realinho ’22", sub: "the dataset", k: "quote", c: { int: 3, met: 4 } },
  { src: "Kapoor & Narayanan, 2023", short: "Kapoor ’23", sub: "leakage", k: "quote", c: { int: 1, rel: 5, dis: 2 } },
  { src: "Dekker et al., 2009", short: "Dekker ’09", sub: "dropout case", k: "quote", c: { rel: 3, met: 1 } },
  { src: "Berens et al., 2019", short: "Berens ’19", sub: "early detection", k: "quote", c: { rel: 3, dis: 1 } },
  { src: "Kemper et al., 2020", short: "Kemper ’20", sub: "dropout, ML", k: "quote", c: { rel: 3, dis: 1 } },
  {
    src: "Christodoulou et al., 2019",
    short: "Christodoulou ’19",
    sub: "abstract only",
    k: "cite",
    c: { rel: 2, dis: 1 },
  },
  { src: "12 more papers", short: "+12 papers", sub: "from refs.bib", k: "quote", c: { int: 4, rel: 10, dis: 8 } },
  { src: "data.csv", short: "data.csv", sub: "no entry year", k: "gap", c: { r4: 0 } },
];
export const LEDGER_COL: Record<string, string> = {
  "EV-09": "int",
  "EV-10": "rel",
  "EV-01": "met",
  "EV-11": "met",
  "EV-13": "met",
  "EV-12": "met",
  "EV-02": "r1",
  "EV-05": "r1",
  "EV-06": "r1",
  "EV-07": "r2",
  "EV-08": "r3",
  "EV-14": "r4",
};
/* Cells in the order the curator indexes them: section by section, left to right. */
export const COVER_CELLS = COVER_COLS.flatMap((col, ci) =>
  COVER_ROWS.flatMap((r, ri) => (col.k in r.c ? [{ ri, ci, col: col.k, n: r.c[col.k], k: r.k }] : [])),
);
export const COVER_TOTAL = (k: string) => COVER_ROWS.reduce((s, r) => s + (r.c[k] ?? 0), 0);
export const READY_WHY: Record<string, string> = {
  int: "9 spans · 4 sources",
  rel: "26 spans from the papers",
  met: "13 spans, 3 numbers",
  r1: "8 numbers",
  r2: "7 spans",
  r3: "8 spans",
  r4: "No entry year",
  dis: "20 spans · nothing across cohorts",
};
