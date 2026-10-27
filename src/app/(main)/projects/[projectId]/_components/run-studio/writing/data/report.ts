/** [id, label, level, standards, value, status, what it becomes] */
export type ReportField = [string, string, string, string[], string, string, string];
export interface ReportPart {
  p: string;
  n: string;
  fields: ReportField[];
}
export interface TimelineEvent {
  t: string;
  k: string;
  x: string;
  sub: string;
}
export interface ChainLink {
  h: string | null;
  txt: string;
  pri: string | null;
  a: string | null;
  kind: string;
  rows: string | null;
  tr: string | null;
  s: string;
  why?: string;
}

/* ===== S01 · the standard data report: one frame, built from the checklists real papers are held to ===== */

/* The standards a field can be asked for by. Each chip in the frame names one. */
export const STANDARDS: Record<string, { n: string; x: string }> = {
  AP: { n: "AsPredicted", x: "Pre-registration: hypotheses, measures, conditions, analyses, exclusions, sample size" },
  NI: { n: "NeurIPS checklist", x: "Claims, limitations, reproducibility, significance, compute, licences, LLM use" },
  ACL: {
    n: "ACL Responsible NLP",
    x: "Artifacts, data statistics, experimental setup, descriptive statistics, AI assistants",
  },
  CON: { n: "CONSORT 2010", x: "Changes to methods and outcomes after the study began" },
  PR: { n: "PRISMA 2020", x: "Information sources and search strategy" },
  RRP: { n: "rrp/v1", x: "The ASW record contract" },
};

/* The frame: 12 parts, 33 fields. Each field: id, label, level, standards, value, status, what it becomes, which agent reads it. */
export const REPORT: ReportPart[] = [
  {
    p: "A",
    n: "Manifest",
    fields: [
      ["A.1", "Owner and team", "must", ["RRP"], "You · team of 2", "ok", "Governance · stop 1"],
      ["A.2", "Licence of the record", "must", ["NI 12", "ACL B2"], "CC BY 4.0", "ok", "Governance"],
      ["A.3", "Contract and file hashes", "must", ["RRP"], "rrp/v1 · 15 files hashed", "ok", "Governance"],
    ],
  },
  {
    p: "B",
    n: "Plan, locked before the runs",
    fields: [
      ["B.1", "Background sources", "should", [], "Reading notes on 18 papers", "ok", "BACKGROUND"],
      [
        "B.2",
        "Gap and its search strategy",
        "must",
        ["PR 6–7"],
        "ACL Anthology + Semantic Scholar · 2018–Aug 2026 · 4 queries · 214 hits · 18 read",
        "ok",
        "GAP",
      ],
      [
        "B.3",
        "Research question and objective",
        "must",
        ["AP 2"],
        "Does fusion find more marked evidence than either retriever alone?",
        "ok",
        "RQ · OBJECTIVE",
      ],
      [
        "B.4",
        "Hypotheses, direction and priority",
        "must",
        ["AP 2"],
        "H1, H2, H4 primary · H3, H5, H6 secondary, deferred",
        "ok",
        "HYPOTHESIS",
      ],
      ["B.5", "Measure", "must", ["AP 3"], "Recall at 10 of marked evidence paragraphs", "ok", "WARRANT"],
      ["B.6", "Conditions compared", "must", ["AP 4"], "BM25 · E5-base · RRF fusion, k = 60", "ok", "METHOD"],
      [
        "B.7",
        "Analysis plan",
        "must",
        ["AP 5", "NI 7"],
        "Paired bootstrap, 10,000 resamples, unit = question · 3 planned tests",
        "ok",
        "METHOD",
      ],
      [
        "B.8",
        "Exclusion rule",
        "must",
        ["AP 6"],
        "Questions with no marked evidence: 282 of 1,451 excluded",
        "ok",
        "METHOD",
      ],
      [
        "B.9",
        "Sample size and power",
        "should",
        ["AP 7"],
        "1,169 questions · smallest detectable gain 0.035 at 80% power",
        "ok",
        "Qualifier for null results",
      ],
      ["B.10", "Assumptions", "should", ["NI 2"], "Questions are independent", "ok", "ASSUMPTION"],
    ],
  },
  {
    p: "C",
    n: "Setup",
    fields: [
      [
        "C.1",
        "Dataset, version, splits, clusters",
        "must",
        ["ACL B5–B6"],
        "QASPER v0.3 test · 1,451 questions from 416 papers · 23% share a paper · CC BY 4.0",
        "ok",
        "Scope of every claim",
      ],
      [
        "C.2",
        "Models and baselines",
        "must",
        ["ACL C4"],
        "BM25 (Pyserini, k1 0.9, b 0.4) · E5-base-v2 · RRF",
        "ok",
        "METHOD",
      ],
      [
        "C.3",
        "Hyperparameters and where they were chosen",
        "must",
        ["NI 6", "ACL C2"],
        "Nothing tuned · k = 60 from Cormack et al. 2009",
        "ok",
        "METHOD",
      ],
      [
        "C.4",
        "Seeds and runs",
        "should",
        ["ACL C3"],
        "5 seeds × 3 systems = 15 runs · means reported",
        "ok",
        "Qualifier",
      ],
      [
        "C.5",
        "Compute and time per run",
        "should",
        ["NI 8", "ACL C1"],
        "A100 · 41 min to encode · time per question not recorded",
        "warn",
        "Blocks speed and cost claims",
      ],
      [
        "C.6",
        "Data made by people",
        "must",
        ["ACL D1–D5", "NI 14–15"],
        "None new · QASPER labels reused (Dasigi et al., 2021)",
        "na",
        "—",
      ],
    ],
  },
  {
    p: "D",
    n: "Runs and results",
    fields: [
      [
        "D.1",
        "A trace per run",
        "must",
        ["NI 4–5"],
        "15 JSONL traces with config, seed and question-list hash",
        "ok",
        "Recomputation",
      ],
      [
        "D.2",
        "Machine-readable results",
        "must",
        ["NI 4"],
        "results.csv · 27 rows, each linked to its traces",
        "ok",
        "FINDING · evidence",
      ],
    ],
  },
  {
    p: "E",
    n: "Analyses",
    fields: [
      ["E.1", "Confirmatory analyses", "must", ["AP 5"], "A1 → H1 · A2 → H2 · A3 → H4", "ok", "FINDING"],
      [
        "E.2",
        "Exploratory analyses",
        "must",
        ["AP 8"],
        "A4 · gain by question length, rows 26–27 · not in the plan",
        "ok",
        "Exploratory note only",
      ],
    ],
  },
  {
    p: "F",
    n: "Deviations",
    fields: [
      [
        "F.1",
        "Deviations from the plan",
        "must",
        ["CON 3b", "CON 6b"],
        "D1 · E5-base instead of E5-large (compute) · declared 16 Sep",
        "ok",
        "Rebuttal · scope",
      ],
    ],
  },
  {
    p: "G",
    n: "Interpretation",
    fields: [
      [
        "G.1",
        "Observations kept apart from readings",
        "should",
        [],
        "11 notes, each splits what was seen from what it means",
        "ok",
        "Debate grounds",
      ],
      [
        "G.2",
        "Proposed conclusion and implications",
        "should",
        [],
        "1 conclusion, 2 implications, marked proposed",
        "ok",
        "CONCLUSION · IMPLICATION",
      ],
    ],
  },
  {
    p: "H",
    n: "Known limits",
    fields: [
      [
        "H.1",
        "Limitations and threats",
        "must",
        ["NI 2", "ACL A1"],
        "One benchmark · English only · shared papers · no timing",
        "ok",
        "LIMITATION",
      ],
    ],
  },
  {
    p: "I",
    n: "Literature",
    fields: [
      [
        "I.1",
        "Bibliography with identifiers",
        "must",
        ["NI 12"],
        "31 entries · 29 DOIs, 2 stable links",
        "ok",
        "Citations",
      ],
      [
        "I.2",
        "Reading notes with spans",
        "should",
        [],
        "18 notes · 64 quoted spans",
        "ok",
        "BACKGROUND · debate grounds",
      ],
      ["I.3", "Permission per source", "must", ["NI 12"], "16 full text · 2 abstract only", "warn", "Cite-only limit"],
    ],
  },
  {
    p: "J",
    n: "Figures and tables",
    fields: [
      [
        "J.1",
        "Data behind each figure",
        "must",
        ["RRP"],
        "Figures 1–3 linked · Figure 4 has no data",
        "warn",
        "Figure 4 left out",
      ],
    ],
  },
  {
    p: "K",
    n: "Writing target",
    fields: [
      [
        "K.1",
        "Journal and article type",
        "may",
        [],
        "IR Journal (example) · research article",
        "ok",
        "Journal merge, S08",
      ],
    ],
  },
  {
    p: "L",
    n: "AI use",
    fields: [
      [
        "L.1",
        "How AI was used in the research",
        "must",
        ["NI 16", "ACL E1"],
        "Code assistant for analysis scripts · no AI-made data",
        "ok",
        "AI-use statement, S16",
      ],
    ],
  },
];
export const REPORT_FIELDS = REPORT.flatMap((part) =>
  part.fields.map((f) => ({ part: part.p, id: f[0], label: f[1], level: f[2], std: f[3], v: f[4], s: f[5], to: f[6] })),
);
export const LEVEL_TONE: Record<string, string> = {
  must: "bg-foreground text-background",
  should: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  may: "bg-muted text-muted-foreground",
};
export const levelCount = (lv: string): [number, number, number] => {
  const all = REPORT_FIELDS.filter((f) => f.level === lv);
  return [all.filter((f) => f.s !== "bad").length, all.length, all.filter((f) => f.s === "warn").length];
};

/* r2 · when things happened: the plan must be locked before the first trace */
export const TIMELINE: TimelineEvent[] = [
  { t: "14 Sep 10:02", k: "plan", x: "plan.md locked", sub: "sha 91c4…" },
  { t: "15 Sep 08:41", k: "run", x: "First trace", sub: "seed 1, BM25" },
  { t: "15 Sep 19:20", k: "run", x: "Last trace", sub: "seed 5, fusion" },
  { t: "16 Sep 11:30", k: "dev", x: "D1 declared", sub: "E5-base instead of E5-large" },
  { t: "17 Sep 16:05", k: "ana", x: "Analyses A1–A4", sub: "A4 not in the plan" },
  { t: "20 Sep 09:00", k: "hand", x: "Hand-off to ASW", sub: "rrp/v1" },
];
/* in scenario U3 the plan was locked after the runs began */
/** What the order of events comes to, written under the timeline once it is read. */
export const TIMELINE_VERDICT = {
  ok: "A1–A3 stay confirmatory. A4 was added after the lock, so it stays exploratory.",
  late: "Every analysis is exploratory: no finding may be stated as confirmed.",
};
export const TIMELINE_LATE: TimelineEvent[] = [
  { t: "15 Sep 08:41", k: "run", x: "First trace", sub: "seed 1, BM25" },
  { t: "15 Sep 19:20", k: "run", x: "Last trace", sub: "seed 5, fusion" },
  { t: "15 Sep 21:10", k: "plan", x: "plan.md locked", sub: "12 h after the first trace" },
  { t: "16 Sep 11:30", k: "dev", x: "D1 declared", sub: "E5-base instead of E5-large" },
  { t: "17 Sep 16:05", k: "ana", x: "Analyses A1–A4", sub: "A4 not in the plan" },
  { t: "20 Sep 09:00", k: "hand", x: "Hand-off to ASW", sub: "rrp/v1" },
];

/* r3 · each hypothesis to its analysis, its rows and its traces */
export const CHAIN: ChainLink[] = [
  {
    h: "H1",
    txt: "Fusion beats BM25 on recall at 10",
    pri: "primary",
    a: "A1",
    kind: "confirmatory",
    rows: "rows 12–13",
    tr: "t01–t15",
    s: "ok",
  },
  {
    h: "H2",
    txt: "The gain grows when evidence is spread out",
    pri: "primary",
    a: "A2",
    kind: "confirmatory",
    rows: "rows 18–21",
    tr: "t01–t15",
    s: "ok",
  },
  {
    h: "H4",
    txt: "The gain holds at the same budget",
    pri: "primary",
    a: "A3",
    kind: "confirmatory",
    rows: "row 25",
    tr: "t11–t15",
    s: "ok",
  },
  {
    h: "H3",
    txt: "The gain holds on the dev split",
    pri: "secondary",
    a: null,
    kind: "deferred",
    rows: null,
    tr: null,
    s: "na",
    why: "Deferred in the plan, §5",
  },
  {
    h: "H5",
    txt: "Gains hold for yes/no questions",
    pri: "secondary",
    a: null,
    kind: "deferred",
    rows: null,
    tr: null,
    s: "na",
    why: "Deferred in the plan, §5",
  },
  {
    h: "H6",
    txt: "Fusion helps figure-based evidence",
    pri: "secondary",
    a: null,
    kind: "deferred",
    rows: null,
    tr: null,
    s: "na",
    why: "Deferred: figures excluded, B.8",
  },
  {
    h: null,
    txt: "Gain by question length",
    pri: null,
    a: "A4",
    kind: "exploratory",
    rows: "rows 26–27",
    tr: "t01–t15",
    s: "warn",
    why: "No hypothesis: exploratory",
  },
];

/* r4 · the runs against the plan, line by line */
export const PLAN_VS_RUN: [string, string, string, string][] = [
  ["Measure", "recall at 10", "recall at 10", "ok"],
  ["Exclusions", "no marked evidence", "282 of 1,451 excluded", "ok"],
  ["Bootstrap", "10,000 resamples", "10,000 resamples", "ok"],
  ["Dense model", "E5-large", "E5-base", "dev"],
  ["Fusion constant", "k = 60, not tuned", "k = 60, not tuned", "ok"],
  ["Seeds", "5", "5", "ok"],
];

/* r5 · what the record lets the paper say, and what it never may */
export const CEILING: { t: string; v: string; why: string; tone: string }[] = [
  {
    t: "Strength of a finding",
    v: "At most “indicate”",
    why: "One benchmark (C.1). “Show” would need more than one.",
    tone: "warn",
  },
  {
    t: "Scope",
    v: "English NLP papers like those in QASPER",
    why: "C.1 and H.1. Other fields and languages are not in the record.",
    tone: "warn",
  },
  { t: "“Significant”", v: "Never", why: "B.7 plans intervals, not a test with a p-value.", tone: "bad" },
  { t: "Speed or cost", v: "Never", why: "C.5: no time per question was recorded.", tone: "bad" },
  {
    t: "A4 · question length",
    v: "Exploratory note only",
    why: "E.2: not in the plan, so never a finding.",
    tone: "warn",
  },
  { t: "H3, H5, H6", v: "Named as not tested", why: "B.4: secondary and deferred in the plan.", tone: "info" },
  { t: "Dense retriever", v: "E5-base, never E5-large", why: "F.1: the declared deviation.", tone: "info" },
];
