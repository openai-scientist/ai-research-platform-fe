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
    src: "plan.md · plan.lock.json",
    step: "a1",
    checks: [
      { id: "owner", t: "The record names its owner and licence", ev: "You · team of 2 · CC BY 4.0", s: "ok" },
      { id: "hash", t: "The lock is bound to this exact plan", ev: "sha256 b17aab71 in plan.lock.json", s: "ok" },
      {
        id: "lock",
        t: "The plan was locked before the first run",
        ev: "27 Oct 10:50:10 → first trace 10:51:26",
        s: "ok",
      },
      { id: "ap", t: "The analysis plan is present", ev: "§7 · paired bootstrap, 10,000 resamples", s: "ok" },
      { id: "cover", t: "Every primary hypothesis has an analysis", ev: "H1 → A1 · H2 → A2 · H4 → A3", s: "ok" },
      { id: "defer", t: "Deferred hypotheses are named, not dropped", ev: "H3, H5, H6 · plan §6", s: "ok" },
      {
        id: "prior",
        t: "What the team knew of the data is declared",
        ev: "§9 · descriptor, columns, class counts",
        s: "ok",
      },
      {
        id: "undated",
        t: "Every input is known at the decision point",
        ev: "§3 · second semester out · 3 columns with no recording date held back",
        s: "warn",
      },
    ],
  },
  {
    k: "env",
    n: "Data and environment",
    icon: "package",
    src: "data/data.csv · env.lock",
    step: "a1",
    checks: [
      { id: "pin", t: "Every version is pinned", ev: "env.lock · 11 packages", s: "ok" },
      {
        id: "data",
        t: "The dataset, its version and licence are named",
        ev: "UCI 697 · sha256 3ef126de · CC BY 4.0",
        s: "ok",
      },
      {
        id: "year",
        t: "Each student’s entry year is in the data",
        ev: "No year column, only the yearly macro figures",
        s: "bad",
      },
      { id: "model", t: "The models match the plan", ev: "Boosting encoding differs · declared as D1", s: "warn" },
      { id: "tune", t: "Nothing was tuned on the test part", ev: "5-fold CV inside the training part", s: "ok" },
    ],
  },
  {
    k: "runs",
    n: "Runs",
    icon: "list",
    src: "out/traces/ · 20 files",
    step: "a2",
    checks: [
      { id: "traces", t: "Every planned run has a trace", ev: "20 of 20 · 4 models × 5 seeds", s: "ok" },
      { id: "prov", t: "Each trace names its config, seed and split", ev: "split d929170e … d75d9ed7", s: "ok" },
      {
        id: "same",
        t: "Every model saw the same split in each seed",
        ev: "3,630 students · 726 in each test part",
        s: "ok",
      },
      { id: "time", t: "Run time is recorded", ev: "20 runs in about a minute", s: "ok" },
    ],
  },
  {
    k: "results",
    n: "Results table",
    icon: "table",
    src: "out/results.csv · 40 rows",
    step: "a2",
    checks: [
      { id: "rows", t: "Every row names the runs behind it", ev: "40 of 40 rows", s: "ok" },
      { id: "ci", t: "Intervals use the planned bootstrap", ev: "10,000 resamples · unit = student", s: "ok" },
      { id: "recomp", t: "Every row can be recomputed from the traces", ev: "S02 recomputes all 40", s: "ok" },
    ],
  },
  {
    k: "analyses",
    n: "Analyses",
    icon: "flask",
    src: "out/analysis.json",
    step: "a3",
    checks: [
      {
        id: "test",
        t: "Each confirmatory analysis runs the planned comparison",
        ev: "A1–A3 · paired bootstrap",
        s: "ok",
      },
      {
        id: "rule",
        t: "Each verdict follows the decision rule",
        ev: "H2 and H4 not shown: their intervals include 0",
        s: "ok",
      },
      {
        id: "expl",
        t: "Analyses outside the plan are marked exploratory",
        ev: "A5 · dropouts with no first-semester evaluation",
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
      {
        id: "before",
        t: "D1 was declared before the results were used",
        ev: "Declared 10:53, after the first run · rerun as planned",
        s: "warn",
      },
    ],
  },
  {
    k: "figs",
    n: "Figures",
    icon: "graph",
    src: "out/figures/ · 3 files",
    step: "a3",
    checks: [
      {
        id: "figdata",
        t: "Every figure has the data behind it",
        ev: "fig1–fig3.csv · rows 1–15, 21–23, 28–38",
        s: "ok",
      },
    ],
  },
  {
    k: "sources",
    n: "Sources",
    icon: "book",
    src: "papers/ · refs.bib",
    step: "a3",
    checks: [
      { id: "ids", t: "Every reference has an identifier", ev: "16 DOIs, 5 stable links", s: "ok" },
      { id: "perm", t: "Every paper may be quoted", ev: "6 are abstract-only", s: "warn" },
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
    sec: "env",
    check: "year",
    tone: "bad",
    head: "Nothing about change across cohorts can be written",
    paper: "No sentence compares early and late entrants. H3 is named as not tested.",
    you: "Add each student’s entry year to the data, then hold at stop 1.",
  },
  {
    sec: "plan",
    check: "undated",
    tone: "warn",
    head: "Fees, debt and scholarship are never early signs",
    paper: "They appear only in the sensitivity check, never as an input behind a finding.",
    you: "Give the date each of the three columns was recorded to use them.",
  },
  {
    sec: "sources",
    check: "perm",
    tone: "warn",
    head: "Six papers may be cited, never quoted",
    paper: "Writers cite them; no sentence quotes them and no critic argues from their full text.",
    you: "Nothing to do. The limit is applied for you.",
  },
];

/* ---------- the details of each part, as the run handed them over ---------- */
export const PLAN_FACTS: [string, string][] = [
  [
    "Question",
    "At the end of the first semester, how well can dropout be predicted, and does the semester add to enrolment data?",
  ],
  [
    "Decision rule",
    "H1 needs its 95% interval above 0 and a gain of at least 0.05; H2 and H4 need their interval above 0",
  ],
];
/* When each thing happened, so the order can be seen: the plan was locked before any run. */
export const PLAN_TIMELINE: { t: string; x: string; k: "plan" | "run" | "dev" | "ana" }[] = [
  { t: "27 Oct 10:50", x: "Plan locked", k: "plan" },
  { t: "27 Oct 10:51", x: "First run", k: "run" },
  { t: "27 Oct 10:52", x: "Analyses A1–A4", k: "ana" },
  { t: "27 Oct 10:53", x: "D1 declared", k: "dev" },
  { t: "27 Oct 10:54", x: "Rerun as planned · A5", k: "ana" },
];
export const PLAN_EXPERIMENTS: { id: string; kind: string; hs: string; what: string }[] = [
  {
    id: "E1",
    kind: "Model comparison",
    hs: "H1 · H2 · H4",
    what: "LR-E, GB-E and GB-ES1 on five 80/20 splits, recall at 20% flagged",
  },
  { id: "E2", kind: "Sensitivity check", hs: "—", what: "GB-ES1 with the three undated columns added" },
];
export const PLAN_HYPOTHESES: { id: string; t: string; primary: boolean }[] = [
  { id: "H1", t: "First-semester results raise recall at 20% flagged", primary: true },
  { id: "H2", t: "The gain is larger below the median admission grade", primary: true },
  { id: "H4", t: "Boosting beats logistic regression on enrolment data", primary: true },
  { id: "H3", t: "The gain holds from earlier to later cohorts", primary: false },
  { id: "H5", t: "Equally well calibrated for women and men", primary: false },
  { id: "H6", t: "Second-semester results add to GB-ES1", primary: false },
];

export const ENV_ROWS: [string, string, string][] = [
  ["Dataset", "UCI 697 · data.csv", "4,424 students · 37 columns · CC BY 4.0"],
  ["Inputs", "E: 21 at enrolment · S1: 6 at the end of semester 1", "S2 and 3 undated columns left out"],
  ["Baseline", "Logistic regression, L2", "C from {0.1, 1, 10}"],
  ["Boosting", "HistGradientBoosting", "learning rate, leaves and L2 from a fixed grid"],
  ["Software", "Python 3.13 · scikit-learn 1.9.1", "pandas 3.1.0 · env.lock, 11 packages"],
  ["Hardware", "1 laptop CPU", "no GPU"],
];

export const RUN_SYSTEMS = ["LR-E", "GB-E", "GB-ES1", "GB-ES1U"];
export const RUN_SEEDS = [1, 2, 3, 4, 5];
export const RUN_FACTS: [string, string][] = [
  ["First run", "27 Oct 10:51 · t01, LR-E, seed 1"],
  ["Last run", "27 Oct 10:52 · t20, GB-ES1U, seed 5"],
  ["Students", "3,630 · the same 726 in each test part for every model"],
  ["GB-ES1U", "Sensitivity only: adds the 3 undated columns"],
];

export const RESULT_ROWS: { row: string; what: string; v: string; ci: string | null }[] = [
  { row: "11–15", what: "Recall at 20% flagged, GB-ES1", v: "0.507", ci: "highest possible 0.511" },
  { row: "21", what: "Gain from first-semester results", v: "0.111", ci: "0.092–0.129" },
  { row: "22", what: "Gain below minus above the median", v: "−0.031", ci: "−0.109–0.027" },
  { row: "23", what: "Boosting over logistic regression", v: "0.004", ci: "−0.007–0.021" },
  { row: "26", what: "Undated columns added", v: "0.002", ci: "−0.001–0.008" },
  { row: "27", what: "Flagged dropouts with no first-semester evaluation", v: "22%", ci: null },
];

/* The gains with an interval, drawn against 0: a gain is concluded only if its interval stays above 0. */
export const GAINS: { row: string; what: string; h: string; v: number; lo: number; hi: number }[] = [
  { row: "21", what: "First semester", h: "H1", v: 0.111, lo: 0.092, hi: 0.129 },
  { row: "22", what: "Below vs above median", h: "H2", v: -0.031, lo: -0.109, hi: 0.027 },
  { row: "23", what: "Boosting vs LR", h: "H4", v: 0.004, lo: -0.007, hi: 0.021 },
];

export const ANALYSES: { id: string; h: string; kind: string; est: string; verdict: string; tone: CheckTone }[] = [
  { id: "A1", h: "H1", kind: "Confirmatory", est: "0.111 [0.092, 0.129]", verdict: "Supported", tone: "ok" },
  { id: "A2", h: "H2", kind: "Confirmatory", est: "−0.031 [−0.109, 0.027]", verdict: "Not shown", tone: "warn" },
  { id: "A3", h: "H4", kind: "Confirmatory", est: "0.004 [−0.007, 0.021]", verdict: "Not shown", tone: "warn" },
  { id: "A4", h: "—", kind: "Exploratory", est: "rows 28–38", verdict: "Note only", tone: "warn" },
  { id: "A5", h: "—", kind: "Exploratory, not in the plan", est: "row 27", verdict: "Note only", tone: "warn" },
];

export const DEVIATION = {
  id: "D1",
  when: "27 Oct 10:53",
  plan: "one-hot categories",
  ran: "native categories",
  why: "The encoder in the boosting pipeline differed from the plan; found at review after the first run.",
  affects: "Boosting runs t06–t20 · rerun one-hot as planned, verdicts unchanged",
};

export const FIGURES: { n: number; t: string; data: string | null }[] = [
  { n: 1, t: "Recall at 20% flagged by model", data: "fig1.csv" },
  { n: 2, t: "The three planned gains with 95% intervals", data: "fig2.csv" },
  { n: 3, t: "Recall by course, exploratory", data: "fig3.csv" },
];

export const SOURCE_FACTS: [string, string][] = [
  ["Papers read", "12 · 9 in full text"],
  ["Abstract only", "Tinto 1975, Kaufman et al. 2012 and four more"],
  ["References", "21 in refs.bib · 16 DOIs, 5 stable links"],
  ["Reading notes", "12 · 41 quoted spans"],
];
