/* ===== S00 · what the experiment run hands over, and the checks the intake makes on each part ===== */
/* The run's output, in the parts any finished experiment has: the plan it was held to, the environment, the runs,
   the results table, the analyses, the deviations, the figures and the sources. Numbers here are the ones the
   rest of the writing run uses (results.csv, the ledger, the paper). */

export type CheckTone = "ok" | "warn" | "bad";
export interface IntakeCheck {
  id: string;
  t: string;
  /** The evidence the check read, in a few words. */
  ev: string;
  s: CheckTone;
}
export interface IntakeSection {
  k: string;
  n: string;
  icon: string;
  /** Where it came from in the run's output. */
  src: string;
  /** The step of S00 that checks it. */
  step: "a1" | "a2" | "a3";
  checks: IntakeCheck[];
}

export const INTAKE: IntakeSection[] = [
  {
    k: "plan",
    n: "Locked plan",
    icon: "lock",
    src: "plan.md · experiment_index.json",
    step: "a1",
    checks: [
      { id: "owner", t: "The record names its owner and licence", ev: "You · team of 2 · CC BY 4.0", s: "ok" },
      { id: "hash", t: "The index is bound to this exact plan", ev: "sha256 91c4e07b on both", s: "ok" },
      { id: "lock", t: "The plan was locked before the first run", ev: "14 Sep 10:02 → 15 Sep 08:41", s: "ok" },
      { id: "ap", t: "The analysis plan is present", ev: "§4 · paired bootstrap, 10,000 resamples", s: "ok" },
      { id: "cover", t: "Every primary hypothesis has an experiment", ev: "H1, H2 → E1 · H4 → E2", s: "ok" },
      { id: "defer", t: "Deferred hypotheses are named, not dropped", ev: "H3, H5, H6 · plan §5", s: "ok" },
    ],
  },
  {
    k: "env",
    n: "Environment",
    icon: "package",
    src: "config.yaml · env.lock",
    step: "a1",
    checks: [
      { id: "pin", t: "Every version is pinned", ev: "env.lock · 142 packages", s: "ok" },
      { id: "data", t: "The dataset, its split and licence are named", ev: "QASPER v0.3 test · CC BY 4.0", s: "ok" },
      { id: "model", t: "The models match the plan", ev: "E5-base instead of E5-large · declared as D1", s: "warn" },
      { id: "tune", t: "Nothing was tuned on the test split", ev: "k = 60 from Cormack et al. 2009", s: "ok" },
    ],
  },
  {
    k: "runs",
    n: "Runs",
    icon: "list",
    src: "traces/ · 15 files",
    step: "a2",
    checks: [
      { id: "traces", t: "Every planned run has a trace", ev: "15 of 15 · 3 systems × 5 seeds", s: "ok" },
      {
        id: "prov",
        t: "Each trace names its config, seed and question list",
        ev: "config 7d2f1a · list 4e1a9c",
        s: "ok",
      },
      { id: "same", t: "Every run saw the same questions", ev: "1,169 of 1,451 after the exclusion rule", s: "ok" },
      { id: "time", t: "Time per question is recorded", ev: "No timing log in the output", s: "bad" },
    ],
  },
  {
    k: "results",
    n: "Results table",
    icon: "table",
    src: "results.csv · 27 rows",
    step: "a2",
    checks: [
      { id: "rows", t: "Every row names the runs behind it", ev: "27 of 27 rows", s: "ok" },
      { id: "ci", t: "Intervals use the planned bootstrap", ev: "10,000 resamples · unit = question", s: "ok" },
      { id: "recomp", t: "Every row can be recomputed from the traces", ev: "S02 recomputes all 27", s: "ok" },
    ],
  },
  {
    k: "analyses",
    n: "Analyses",
    icon: "flask",
    src: "analysis.json",
    step: "a3",
    checks: [
      { id: "test", t: "Each confirmatory analysis runs the planned test", ev: "A1–A3 · paired bootstrap", s: "ok" },
      { id: "rule", t: "Each verdict follows the decision rule", ev: "H4 not shown: its interval includes 0", s: "ok" },
      {
        id: "expl",
        t: "Analyses outside the plan are marked exploratory",
        ev: "A4 · gain by question length",
        s: "ok",
      },
    ],
  },
  {
    k: "dev",
    n: "Deviations",
    icon: "compare",
    src: "deviations.md",
    step: "a3",
    checks: [
      { id: "declared", t: "Every change from the plan is declared", ev: "1 of 1 · D1", s: "ok" },
      { id: "before", t: "D1 was declared before the analyses", ev: "16 Sep 11:30 → 17 Sep 16:05", s: "ok" },
    ],
  },
  {
    k: "figs",
    n: "Figures",
    icon: "graph",
    src: "figs/ · 4 files",
    step: "a3",
    checks: [
      { id: "figdata", t: "Figures 1–3 have the data behind them", ev: "fig1.csv · rows 18–21 · row 25", s: "ok" },
      { id: "fig4", t: "Figure 4 has the data behind it", ev: "fig4.svg points to no file", s: "warn" },
    ],
  },
  {
    k: "sources",
    n: "Sources",
    icon: "book",
    src: "papers/ · refs.bib",
    step: "a3",
    checks: [
      { id: "ids", t: "Every reference has an identifier", ev: "29 DOIs, 2 stable links", s: "ok" },
      { id: "perm", t: "Every paper may be quoted", ev: "2 are abstract-only", s: "warn" },
    ],
  },
];
export const INTAKE_CHECKS = INTAKE.flatMap((sec) => sec.checks.map((c) => ({ ...c, sec: sec.k })));

/* What the output cannot support, said on the part it comes from. Named last, never filled in. */
export interface IntakeLimit {
  sec: string;
  check: string;
  tone: "bad" | "warn";
  head: string;
  paper: string;
  you: string;
}
export const INTAKE_LIMITS: IntakeLimit[] = [
  {
    sec: "runs",
    check: "time",
    tone: "bad",
    head: "Nothing about speed or cost can be written",
    paper: "Results 4.4 stays empty. No sentence anywhere mentions speed or cost.",
    you: "Add the timing log to the run's output, then hold at stop 1.",
  },
  {
    sec: "figs",
    check: "fig4",
    tone: "warn",
    head: "Figure 4 is left out",
    paper: "Figures 1–3 stay. Figure 4 is never redrawn or guessed.",
    you: "Add the data behind it to bring it back.",
  },
  {
    sec: "sources",
    check: "perm",
    tone: "warn",
    head: "Two papers may be cited, never quoted",
    paper: "Writers cite them; no sentence quotes them and no critic argues from their full text.",
    you: "Nothing to do. The limit is applied for you.",
  },
];

/* ---------- the details of each part, as the run handed them over ---------- */
export const PLAN_FACTS: [string, string][] = [
  ["Question", "Does fusion find more marked evidence than either retriever alone?"],
  ["Decision rule", "A gain is concluded only if its 95% bootstrap interval excludes 0"],
];
/* When each thing happened, so the order can be seen: the plan was locked before any run. */
export const PLAN_TIMELINE: { t: string; x: string; k: "plan" | "run" | "dev" | "ana" }[] = [
  { t: "14 Sep 10:02", x: "Plan locked", k: "plan" },
  { t: "15 Sep 08:41", x: "First run", k: "run" },
  { t: "15 Sep 19:20", x: "Last run", k: "run" },
  { t: "16 Sep 11:30", x: "D1 declared", k: "dev" },
  { t: "17 Sep 16:05", x: "Analyses A1–A4", k: "ana" },
];
export const PLAN_EXPERIMENTS: { id: string; kind: string; hs: string; what: string }[] = [
  {
    id: "E1",
    kind: "Comparative benchmark",
    hs: "H1 · H2",
    what: "BM25, E5-base and RRF fusion on QASPER test, recall at 10",
  },
  { id: "E2", kind: "Controlled experiment", hs: "H4", what: "Fusion against E5-base at the same retrieval budget" },
];
export const PLAN_HYPOTHESES: { id: string; t: string; primary: boolean }[] = [
  { id: "H1", t: "Fusion beats BM25 on recall at 10", primary: true },
  { id: "H2", t: "The gain grows when evidence is spread out", primary: true },
  { id: "H4", t: "The gain holds at the same budget", primary: true },
  { id: "H3", t: "The gain holds on the dev split", primary: false },
  { id: "H5", t: "Gains hold for yes/no questions", primary: false },
  { id: "H6", t: "Fusion helps figure-based evidence", primary: false },
];

export const ENV_ROWS: [string, string, string][] = [
  ["Dataset", "QASPER v0.3, test split", "1,451 questions · 416 papers · CC BY 4.0"],
  ["Lexical", "BM25 · Pyserini 0.22.1", "k1 0.9, b 0.4"],
  ["Dense", "intfloat/e5-base-v2", "revision 1c644c9"],
  ["Fusion", "Reciprocal rank fusion", "k = 60, not tuned"],
  ["Software", "Python 3.11.9 · torch 2.3.1", "faiss 1.8.0 · env.lock, 142 packages"],
  ["Hardware", "1 × A100 80 GB", "CUDA 12.1"],
];

export const RUN_SYSTEMS = ["BM25", "E5-base", "Fusion"];
export const RUN_SEEDS = [1, 2, 3, 4, 5];
export const RUN_FACTS: [string, string][] = [
  ["First run", "15 Sep 08:41 · t01, BM25, seed 1"],
  ["Last run", "15 Sep 19:20 · t15, fusion, seed 5"],
  ["Questions", "1,169 per run · list 4e1a9c on all 15"],
];

export const RESULT_ROWS: { row: string; what: string; v: string; ci: string | null }[] = [
  { row: "12", what: "Recall at 10, fusion", v: "0.688", ci: "0.672–0.704" },
  { row: "13", what: "Gain over BM25", v: "0.076", ci: "0.059–0.093" },
  { row: "14", what: "Gain over E5-base", v: "0.029", ci: "0.011–0.047" },
  { row: "18–21", what: "Gain, spread vs concentrated evidence", v: "0.094 · 0.051", ci: null },
  { row: "25", what: "Gain at the same budget", v: "0.031", ci: "−0.004–0.066" },
];

/* The gains with an interval, drawn against 0: a gain is concluded only if its interval stays above 0. */
export const GAINS: { row: string; what: string; h: string; v: number; lo: number; hi: number }[] = [
  { row: "13", what: "Over BM25", h: "H1", v: 0.076, lo: 0.059, hi: 0.093 },
  { row: "14", what: "Over E5-base", h: "H1", v: 0.029, lo: 0.011, hi: 0.047 },
  { row: "25", what: "At the same budget", h: "H4", v: 0.031, lo: -0.004, hi: 0.066 },
];

export const ANALYSES: { id: string; h: string; kind: string; est: string; verdict: string; tone: CheckTone }[] = [
  { id: "A1", h: "H1", kind: "Confirmatory", est: "0.076 [0.059, 0.093]", verdict: "Supported", tone: "ok" },
  { id: "A2", h: "H2", kind: "Confirmatory", est: "0.094 vs 0.051", verdict: "Supported", tone: "ok" },
  { id: "A3", h: "H4", kind: "Confirmatory", est: "0.031 [−0.004, 0.066]", verdict: "Not shown", tone: "warn" },
  { id: "A4", h: "—", kind: "Exploratory", est: "rows 26–27", verdict: "Note only", tone: "warn" },
];

export const DEVIATION = {
  id: "D1",
  when: "16 Sep 11:30",
  plan: "E5-large",
  ran: "E5-base",
  why: "The large index did not fit the compute budget.",
  affects: "All 15 runs · rows 11–14",
};

export const FIGURES: { n: number; t: string; data: string | null }[] = [
  { n: 1, t: "Recall at 10 by system", data: "fig1.csv" },
  { n: 2, t: "Gain by evidence spread", data: "rows 18–21" },
  { n: 3, t: "Gain at the same budget", data: "row 25" },
  { n: 4, t: "Recall by paper length", data: null },
];

export const SOURCE_FACTS: [string, string][] = [
  ["Papers", "18 · 16 in full text"],
  ["Abstract only", "Wang et al. 2022 and one more"],
  ["References", "31 in refs.bib · 29 DOIs, 2 stable links"],
  ["Reading notes", "18 · 64 quoted spans"],
];
