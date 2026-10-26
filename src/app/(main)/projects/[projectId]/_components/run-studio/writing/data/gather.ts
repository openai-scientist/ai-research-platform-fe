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
    v: "“Answering requires locating the evidence paragraphs that support the answer.”",
    src: "Dasigi et al., 2021",
    at: "p. 2, l. 14",
    ctx: [
      "…questions written by NLP practitioners",
      "who read only the title and abstract.",
      "Answering requires locating the evidence paragraphs that support the answer.",
      "We release 5,049 questions over 1,585 papers.",
    ],
  },
  {
    id: "EV-10",
    k: "quote",
    sec: "Related work",
    v: "“We analyse convex combination and reciprocal rank fusion of lexical and semantic scores.”",
    src: "Bruch et al., 2023",
    at: "p. 1, l. 22",
    ctx: [
      "Hybrid retrieval is now common practice.",
      "We analyse convex combination and reciprocal rank fusion of lexical and semantic scores.",
      "We find that…",
    ],
  },
  {
    id: "EV-01",
    k: "num",
    sec: "Method",
    v: "1,169 of 1,451",
    src: "results.csv",
    at: "row 3",
    ctx: ["row,split,questions,eligible", "3,test,1451,1169", "4,dev,1764,1402"],
    hit: 1,
  },
  {
    id: "EV-11",
    k: "quote",
    sec: "Method",
    v: "“RRF… with k = 60 performed well across collections.”",
    src: "Cormack et al., 2009",
    at: "p. 1, l. 8",
    ctx: [
      "We propose reciprocal rank fusion.",
      "RRF… with k = 60 performed well across collections.",
      "It needs no training data.",
    ],
  },
  {
    id: "EV-13",
    k: "quote",
    sec: "Method",
    v: "“Same questions, cutoff and labels for every system.”",
    src: "plan.md",
    at: "§2, l. 3",
    ctx: [
      "## §2 Protocol",
      "Systems: BM25, E5-base, RRF fusion.",
      "Same questions, cutoff and labels for every system.",
      "Metric: recall at 10.",
    ],
  },
  {
    id: "EV-12",
    k: "cite",
    sec: "Method",
    v: "May be cited; may not be quoted.",
    src: "Wang et al., 2022",
    at: "abstract only",
    ctx: ["Licence: abstract only.", "Full text not available to the run."],
  },
  {
    id: "EV-02",
    k: "num",
    sec: "Results",
    v: "0.612 · 0.641 · 0.688",
    src: "results.csv",
    at: "row 12",
    ctx: ["row,system,recall@10", "11,header,—", "12,bm25|dense|fusion,0.612|0.641|0.688", "13,gain,0.076"],
    hit: 2,
  },
  {
    id: "EV-05",
    k: "num",
    sec: "Results",
    v: "0.076, CI 0.059–0.093",
    src: "results.csv",
    at: "row 13",
    ctx: [
      "row,metric,value,ci_lo,ci_hi",
      "12,fusion,0.688,0.672,0.704",
      "13,gain,0.076,0.059,0.093",
      "14,dense_gain,0.029,0.011,0.047",
    ],
    hit: 2,
  },
  {
    id: "EV-06",
    k: "num",
    sec: "Results",
    v: "0.029, CI 0.011–0.047",
    src: "results.csv",
    at: "row 14",
    ctx: ["13,gain,0.076,0.059,0.093", "14,dense_gain,0.029,0.011,0.047", "15,—"],
    hit: 1,
  },
  {
    id: "EV-07",
    k: "num",
    sec: "Results",
    v: "0.094 · 0.051",
    src: "results.csv",
    at: "rows 18–21",
    ctx: ["row,split,gain", "18,spread,0.094", "19,single,0.051", "20–21,counts,680|489"],
    hit: 1,
  },
  {
    id: "EV-08",
    k: "num",
    sec: "Results",
    v: "0.031, CI −0.004–0.066",
    src: "results.csv",
    at: "row 25",
    ctx: ["row,setting,gain,ci_lo,ci_hi", "25,same_budget,0.031,-0.004,0.066", "26,—"],
    hit: 1,
  },
  {
    id: "EV-14",
    k: "gap",
    sec: "Results 4.4",
    v: "No time or cost figure exists.",
    src: "timing log",
    at: "never recorded",
    ctx: ["The run did not record time per question.", "Nothing may be written about speed or cost."],
  },
];
export const RECHECK: Record<string, string> = {
  "EV-01": "1,169 of 1,451",
  "EV-02": "0.612 · 0.641 · 0.688",
  "EV-05": "0.076, CI 0.059–0.093",
  "EV-06": "0.029, CI 0.011–0.047",
  "EV-07": "0.094 · 0.051",
  "EV-08": "0.031, CI −0.004–0.066",
};
export const NUM_ROWS = LEDGER.filter((r) => r.k === "num").map((r) => r.id);
export const BAD_REF = 17;

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
  ["§5", "Gap and question in 1.1; hypotheses named in 3.1; findings in 4.1–4.3; limits in 5.2.", "axis"],
  ["§6", "Every rebuttal is written in 5.2; reconstructed warrants are stated once, in 3.1.", "axis"],
  ["§7", "Paragraphs of about 110–150 words; “we”, with little passive voice; past tense for results.", "habit"],
  ["§8", "IMRaD with a Related work section, as 64% of the journal's papers do; CARS in the Introduction.", "habit"],
];

/* Where each part of a claim comes from. */
export const TOU_SRC: Record<string, Record<string, string>> = {
  F1: {
    data: "rows 12–13 · T08",
    war: "plan.md §2 · answered T11",
    back: "Interval by paper · S07",
    qual: "Record scope · C.1",
    reb: "Upheld at T15",
  },
  F2: {
    data: "rows 18–21 · T18",
    war: "plan.md §3 · answered T21",
    back: "Locked 14 Sep · T20",
    qual: "Conceded at T24",
    reb: "Conceded at T23",
  },
  F3: {
    data: "row 25 · T25",
    war: "In no source",
    back: "Efron & Tibshirani, 1993",
    qual: "Conceded at T30",
    reb: "Plan B.9 · after T28",
  },
  C: {
    data: "F1 and F2 · T31",
    war: "In no source · T33",
    back: "Dasigi et al., 2021 · T35",
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
  ["CX", "CA4", "att"],
  ["CA4", "C", "att"],
];
export const SCHEME_INFO: Record<string, string> = {
  RA1: "Evidence to hypothesis: E1 and warrant W1 support Finding 1.",
  RA2: "Evidence to hypothesis: E2 supports Finding 2, on a split fixed in advance.",
  RA3: "Negative result: E3 supports Finding 3, qualified as “no clear gain”.",
  RA4: "Sample to population: Findings 1 and 2 support the Conclusion.",
  RA5: "Practical reasoning: the Conclusion supports the implication for builders.",
  RA6: "Holds up an implication but has no premise at all.",
  CA1: "Undercut from T15: 23% of questions share a paper, so a question-level interval is too narrow.",
  CA2: "Undercut from L2: one benchmark, English only. Met by the narrowed qualifier.",
  CA3: "Finding 3 conflicts with hypothesis H4.",
  PA1: "Prefers the evidence (F3) over the hypothesis (H4), as ruled at T30.",
  CA4: "Rebut from T44: a counterexample on ACL papers. No preference either way.",
};

/* Evidence coverage: every source against every section of the paper. Counts are evidence spans; they add up to 91. */
export const COVER_COLS: { k: string; s: string; n: string; full: string }[] = [
  { k: "int", s: "Int", n: "Intro", full: "1 Introduction" },
  { k: "rel", s: "Rel", n: "Related", full: "2 Related work" },
  { k: "met", s: "Met", n: "Method", full: "3 Method" },
  { k: "r1", s: "4.1", n: "4.1", full: "4.1 Finding 1" },
  { k: "r2", s: "4.2", n: "4.2", full: "4.2 Finding 2" },
  { k: "r3", s: "4.3", n: "4.3", full: "4.3 Finding 3" },
  { k: "r4", s: "4.4", n: "4.4", full: "4.4 Speed and cost" },
  { k: "dis", s: "Dis", n: "Disc.", full: "5 Discussion" },
];
export const COVER_ROWS: { src: string; short: string; sub: string; k: string; c: Record<string, number> }[] = [
  { src: "results.csv", short: "results.csv", sub: "27 numbers", k: "num", c: { met: 3, r1: 9, r2: 6, r3: 5, dis: 4 } },
  { src: "plan.md", short: "plan.md", sub: "protocol", k: "quote", c: { int: 1, met: 4 } },
  { src: "analysis.md", short: "analysis.md", sub: "notes", k: "quote", c: { r2: 2, r3: 3, dis: 3 } },
  { src: "Dasigi et al., 2021", short: "Dasigi ’21", sub: "Qasper", k: "quote", c: { int: 4, met: 2 } },
  { src: "Bruch et al., 2023", short: "Bruch ’23", sub: "fusion analysis", k: "quote", c: { int: 1, rel: 6, dis: 2 } },
  { src: "Cormack et al., 2009", short: "Cormack ’09", sub: "RRF", k: "quote", c: { rel: 2, met: 3 } },
  { src: "Robertson & Zaragoza, 2009", short: "Robertson ’09", sub: "BM25", k: "quote", c: { rel: 3, met: 2 } },
  { src: "Karpukhin et al., 2020", short: "Karpukhin ’20", sub: "DPR", k: "quote", c: { rel: 3, dis: 1 } },
  { src: "Wang et al., 2022", short: "Wang ’22", sub: "abstract only", k: "cite", c: { rel: 2, met: 1 } },
  { src: "12 more papers", short: "+12 papers", sub: "from refs.bib", k: "quote", c: { int: 4, rel: 10, dis: 5 } },
  { src: "timing log", short: "timing log", sub: "never recorded", k: "gap", c: { r4: 0 } },
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
  int: "10 spans · 4 sources",
  rel: "26 spans from the papers",
  met: "15 spans, 3 numbers",
  r1: "9 numbers",
  r2: "8 spans",
  r3: "8 spans",
  r4: "No timing log",
  dis: "15 spans · no cost claim",
};
