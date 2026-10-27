import { STAGES, type StageDef } from "./core";

export interface AgentMeta {
  name: string;
  initials: string;
  text: string;
  soft: string;
  solid: string;
}
export interface ScreenDef {
  key: string;
  title: string;
  short: string;
  stages: string[];
  block: number;
  check?: string;
  gate?: string;
}

/* ===== who works here, and how the run is cut into screens (run-meta) ===== */
export const AGENTS: Record<string, AgentMeta> = {
  or: {
    name: "Orchestrator",
    initials: "Or",
    text: "text-foreground",
    soft: "bg-muted ring-foreground/15",
    solid: "bg-foreground",
  },
  ds: {
    name: "Data Steward",
    initials: "St",
    text: "text-teal-700 dark:text-teal-300",
    soft: "bg-teal-500/12 ring-teal-500/30",
    solid: "bg-teal-600",
  },
  cu: {
    name: "Evidence Curator",
    initials: "Cu",
    text: "text-cyan-700 dark:text-cyan-300",
    soft: "bg-cyan-500/12 ring-cyan-500/30",
    solid: "bg-cyan-600",
  },
  ss: {
    name: "Semantics",
    initials: "Se",
    text: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-500/12 ring-violet-500/30",
    solid: "bg-violet-600",
  },
  aa: {
    name: "Proponent",
    initials: "Pr",
    text: "text-blue-700 dark:text-blue-300",
    soft: "bg-blue-500/12 ring-blue-500/30",
    solid: "bg-blue-600",
  },
  qm: {
    name: "Method critic",
    initials: "Mc",
    text: "text-sky-700 dark:text-sky-300",
    soft: "bg-sky-500/12 ring-sky-500/30",
    solid: "bg-sky-600",
  },
  qs: {
    name: "Statistics critic",
    initials: "Sc",
    text: "text-orange-700 dark:text-orange-300",
    soft: "bg-orange-500/12 ring-orange-500/30",
    solid: "bg-orange-600",
  },
  qx: {
    name: "Scope critic",
    initials: "Xc",
    text: "text-amber-700 dark:text-amber-300",
    soft: "bg-amber-500/12 ring-amber-500/30",
    solid: "bg-amber-600",
  },
  ql: {
    name: "Literature critic",
    initials: "Lc",
    text: "text-lime-700 dark:text-lime-300",
    soft: "bg-lime-500/12 ring-lime-500/30",
    solid: "bg-lime-600",
  },
  jd: {
    name: "Judge",
    initials: "Ju",
    text: "text-stone-700 dark:text-stone-300",
    soft: "bg-stone-500/15 ring-stone-500/35",
    solid: "bg-stone-600",
  },
  ag: {
    name: "Graph Builder",
    initials: "Gr",
    text: "text-purple-700 dark:text-purple-300",
    soft: "bg-purple-500/12 ring-purple-500/30",
    solid: "bg-purple-600",
  },
  av: {
    name: "Verifier",
    initials: "Ve",
    text: "text-red-700 dark:text-red-300",
    soft: "bg-red-500/12 ring-red-500/30",
    solid: "bg-red-600",
  },
  js: {
    name: "Journal Specialist",
    initials: "Jo",
    text: "text-pink-700 dark:text-pink-300",
    soft: "bg-pink-500/12 ring-pink-500/30",
    solid: "bg-pink-600",
  },
  rp: {
    name: "Planner",
    initials: "Pl",
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-500/12 ring-emerald-500/30",
    solid: "bg-emerald-600",
  },
  sw: {
    name: "Writers",
    initials: "Wr",
    text: "text-amber-700 dark:text-amber-300",
    soft: "bg-amber-500/12 ring-amber-500/30",
    solid: "bg-amber-600",
  },
  rv: {
    name: "Reverse Verifier",
    initials: "Rv",
    text: "text-green-700 dark:text-green-300",
    soft: "bg-green-500/12 ring-green-500/30",
    solid: "bg-green-600",
  },
  rb: {
    name: "Review Board",
    initials: "Rb",
    text: "text-indigo-700 dark:text-indigo-300",
    soft: "bg-indigo-500/12 ring-indigo-500/30",
    solid: "bg-indigo-600",
  },
  re: {
    name: "Reviser",
    initials: "Re",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    soft: "bg-fuchsia-500/12 ring-fuchsia-500/30",
    solid: "bg-fuchsia-600",
  },
  code: {
    name: "Code check",
    initials: "{ }",
    text: "text-muted-foreground",
    soft: "bg-muted ring-foreground/10",
    solid: "bg-muted-foreground",
  },
  /* the writers and reviewers work side by side, each with its own pointer */
  mw: {
    name: "Method writer",
    initials: "Wm",
    text: "text-amber-700 dark:text-amber-300",
    soft: "bg-amber-500/12 ring-amber-500/30",
    solid: "bg-amber-600",
  },
  rw: {
    name: "Results writer",
    initials: "Wr",
    text: "text-yellow-700 dark:text-yellow-300",
    soft: "bg-yellow-500/12 ring-yellow-500/30",
    solid: "bg-yellow-600",
  },
  dw: {
    name: "Discussion writer",
    initials: "Wd",
    text: "text-orange-700 dark:text-orange-300",
    soft: "bg-orange-500/12 ring-orange-500/30",
    solid: "bg-orange-700",
  },
  me: {
    name: "Method reviewer",
    initials: "Me",
    text: "text-blue-700 dark:text-blue-300",
    soft: "bg-blue-500/12 ring-blue-500/30",
    solid: "bg-blue-600",
  },
  ev: {
    name: "Evidence reviewer",
    initials: "Ev",
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-500/12 ring-emerald-500/30",
    solid: "bg-emerald-600",
  },
  wt: {
    name: "Writing reviewer",
    initials: "Wt",
    text: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-500/12 ring-violet-500/30",
    solid: "bg-violet-600",
  },
};
export const isCode = (a: string) => a === "code";

/* Statement and map entity types, coloured the way the research map colours them. */
export const ENTITY: Record<string, { tag: string; name: string; box: string; chip: string }> = {
  BACKGROUND: {
    tag: "BG",
    name: "Background",
    box: "bg-stone-500 ring-stone-600",
    chip: "bg-stone-500/12 text-stone-700 dark:text-stone-300",
  },
  GAP: {
    tag: "GAP",
    name: "Gap",
    box: "bg-orange-600 ring-orange-700",
    chip: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  },
  RQ: {
    tag: "RQ",
    name: "Question",
    box: "bg-amber-600 ring-amber-700",
    chip: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  },
  OBJECTIVE: {
    tag: "OBJ",
    name: "Objective",
    box: "bg-amber-600 ring-amber-700",
    chip: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  },
  HYPOTHESIS: {
    tag: "H",
    name: "Hypothesis",
    box: "bg-violet-600 ring-violet-700",
    chip: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  ASSUMPTION: {
    tag: "AS",
    name: "Assumption",
    box: "bg-slate-500 ring-slate-600",
    chip: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  },
  FINDING: {
    tag: "F",
    name: "Finding",
    box: "bg-blue-600 ring-blue-700",
    chip: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  },
  CONCLUSION: {
    tag: "C",
    name: "Conclusion",
    box: "bg-indigo-600 ring-indigo-700",
    chip: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
  },
  IMPLICATION: {
    tag: "IM",
    name: "Implication",
    box: "bg-green-700 ring-green-800",
    chip: "bg-green-500/12 text-green-700 dark:text-green-300",
  },
  LIMITATION: {
    tag: "LIM",
    name: "Limitation",
    box: "bg-rose-600 ring-rose-700",
    chip: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  FUTURE: {
    tag: "FW",
    name: "Future work",
    box: "bg-zinc-500 ring-zinc-600",
    chip: "bg-zinc-500/12 text-zinc-700 dark:text-zinc-300",
  },
  EVIDENCE: {
    tag: "EV",
    name: "Evidence",
    box: "bg-teal-700 ring-teal-800",
    chip: "bg-teal-500/12 text-teal-700 dark:text-teal-300",
  },
  WARRANT: {
    tag: "W",
    name: "Warrant",
    box: "bg-slate-600 ring-slate-700",
    chip: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  },
  METHOD: {
    tag: "M",
    name: "Method",
    box: "bg-cyan-700 ring-cyan-800",
    chip: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
  },
};
/* How sure a statement is, as a chip. */
export const STATUS_CHIP: Record<string, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  warn: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  vio: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  bad: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  na: "bg-muted text-muted-foreground",
};

/* The pipeline's 17 stages are shown on 12 screens; each screen says which stages it covers. */
export const SCREENS: ScreenDef[] = [
  { key: "handoff", title: "Check what the experiment run handed over", short: "Intake", stages: ["S00"], block: 0 },
  {
    key: "report",
    title: "Lay the record into the data report",
    short: "Data report",
    stages: ["S01"],
    block: 0,
    check: "K01",
  },
  { key: "evidence", title: "Build the evidence ledger", short: "Evidence", stages: ["S02"], block: 0, gate: "G0" },
  {
    key: "statements",
    title: "Label every scientific statement",
    short: "Axis 4",
    stages: ["S03"],
    block: 1,
    check: "K03",
  },
  {
    key: "debate",
    title: "Argue every claim before it is drawn",
    short: "Debate",
    stages: ["S04"],
    block: 1,
    check: "K04",
  },
  { key: "reasoning", title: "Draw each claim in six parts", short: "Toulmin", stages: ["S05"], block: 1 },
  {
    key: "map",
    title: "Map the argument, evaluate it, lock it",
    short: "AIF · ASPIC+",
    stages: ["S06", "S07"],
    block: 1,
    gate: "G1",
  },
  {
    key: "journal",
    title: "Merge the claims with the journal profile",
    short: "Journal",
    stages: ["S08"],
    block: 2,
    check: "K08",
  },
  { key: "blueprint", title: "Lay out the paper", short: "Outline", stages: ["S09", "S10"], block: 2, check: "K09" },
  { key: "write", title: "Write, then read it back", short: "Draft", stages: ["S11", "S12"], block: 2, gate: "G2" },
  {
    key: "review",
    title: "Journal fit and peer review",
    short: "Review",
    stages: ["S13", "S14"],
    block: 3,
    check: "K14",
  },
  { key: "signoff", title: "Revise and sign", short: "Sign-off", stages: ["S15", "S16"], block: 3, gate: "G3" },
];
export const SCREEN_OF: Record<string, string> = {};
for (const s of SCREENS) for (const id of s.stages) SCREEN_OF[id] = s.key;
export const STAGE: Record<string, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s]));
export const STAGE_IDX: Record<string, number> = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
export const screenIndex = (key: string) => SCREENS.findIndex((s) => s.key === key);
export const stageRange = (scr: ScreenDef) =>
  scr.stages.length > 1 ? `${scr.stages[0]}–${scr.stages[scr.stages.length - 1]}` : scr.stages[0];
export const screenOfStage = (sid: string) => SCREENS.find((s) => s.stages.includes(sid));

/* The four stops and seven quick checks. */
export const STOP_NO: Record<string, number> = { G0: 1, G1: 2, G2: 3, G3: 4 };
export const STOP_INFO: Record<string, { title: string; where: string }> = {
  G0: { title: "Start writing from this record", where: "After the evidence ledger" },
  G1: { title: "Lock the claims and freeze the map", where: "After the argument is evaluated" },
  G2: { title: "Choose how strongly the findings are worded", where: "After Method and Results are drafted" },
  G3: { title: "Sign the manuscript", where: "After the final checks" },
  K01: { title: "Confirm the exploratory analysis", where: "Data report" },
  K03: { title: "Confirm what Finding 3 is", where: "Axis 4" },
  K04: { title: "Settle the deadlock on the Conclusion", where: "Debate" },
  K08: { title: "Approve the journal contract", where: "Journal merge" },
  K09: { title: "Approve the storyline", where: "Outline" },
  K12: { title: "Settle the widened claim in 4.1", where: "Read-back" },
  K14: { title: "Settle the reviewers' disagreement", where: "Peer review" },
};
export const isGate = (id: string | null | undefined) => Boolean(id && id[0] === "G");

/* The team, block by block: who reads what, writes what, and what each may never do. */
export const ROSTER: { block: string; agents: [string, string, string, string, string][] }[] = [
  {
    block: "Data",
    agents: [
      [
        "or",
        "Routes the run, stops it, sends work back, and opens every stop for you.",
        "Every stage's output",
        "The run plan, routes and stops",
        "Write content or rule on a claim",
      ],
      [
        "ds",
        "Lays the research record into the standard data report and checks it is complete and consistent.",
        "The research record package (rrp/v2)",
        "DataReport.json, claim ceiling",
        "Guess a missing value or judge the method",
      ],
      [
        "cu",
        "Resolves every reference, indexes every number and quote, and recomputes numbers from the traces.",
        "Data report, traces, papers",
        "Evidence ledger, readiness map",
        "Add a source from outside the package",
      ],
      [
        "code",
        "Deterministic checks with no AI: schemas, hashes, recomputed numbers, graph soundness, ASPIC+ labels.",
        "Files and records",
        "Pass or fail, with the line",
        "Interpret anything",
      ],
    ],
  },
  {
    block: "Argue",
    agents: [
      [
        "ss",
        "Labels each statement on the fourth axis: gap, question, hypothesis, finding, conclusion, implication, limitation.",
        "Data report, ledger",
        "Statement registry, lifecycle",
        "Promote a hypothesis to a finding",
      ],
      [
        "aa",
        "The proponent: states each claim with its premises and scheme, and answers every challenge from the record.",
        "Registry, ledger, data report",
        "Arguments, answers, concessions",
        "Answer with a number that is not in the ledger",
      ],
      [
        "qm",
        "Asks how the evidence was produced: protocol, measurement, pre-registration.",
        "Data report B and C, traces",
        "Challenges with grounds",
        "Challenge without a ground",
      ],
      [
        "qs",
        "Asks whether the numbers mean what they claim: independence, power, intervals, multiple tests.",
        "Ledger, B.9, B.11",
        "Challenges with grounds",
        "Challenge without a ground",
      ],
      [
        "qx",
        "Asks how far a claim reaches: sample, population, field, language.",
        "C.1, J.1, the claims",
        "Challenges with grounds",
        "Challenge without a ground",
      ],
      [
        "ql",
        "Asks what the literature already says: gaps, prior results, counterexamples.",
        "Papers and notes in the package",
        "Challenges with grounds",
        "Cite a paper outside the package",
      ],
      [
        "jd",
        "Rules on every exchange: answered, conceded, upheld, struck or unresolved. A different model from the proponent.",
        "The debate record, the rules",
        "Rulings and their effect on the diagrams",
        "Argue for either side",
      ],
      [
        "ag",
        "Draws the rulings: Toulmin cards for each claim, then the AIF graph of I-nodes and RA, CA, PA schemes.",
        "Rulings, registry, ledger",
        "Toulmin cards, AIF graph",
        "Change a ruling",
      ],
      [
        "av",
        "Evaluates the graph with ASPIC+ (IN, OUT, undecided), traces every node and sets confidence limits.",
        "AIF graph, ledger",
        "Labels, verification report",
        "Approve the graph for you",
      ],
    ],
  },
  {
    block: "Write",
    agents: [
      [
        "js",
        "Merges the frozen claims with the journal profile: rules first, habits second.",
        "JFE profile, author guidelines",
        "Journal writing contract",
        "Let a habit override a rule",
      ],
      [
        "rp",
        "Places each statement in IMRaD and writes a contract for every paragraph.",
        "Frozen map, contract, recipes",
        "Outline, paragraph contracts",
        "Move a claim after you approve the outline",
      ],
      [
        "mw",
        "Writes Method, Introduction and the Abstract inside their contracts.",
        "Contracts, ledger, glossary",
        "Section drafts",
        "Type a number by hand",
      ],
      [
        "rw",
        "Writes Results and fills the tables and figures from the ledger.",
        "Contracts, ledger",
        "Results, Table 1, Figure 2",
        "Type a number by hand",
      ],
      [
        "dw",
        "Writes Discussion, Limits and Conclusion with the wording you chose.",
        "Contracts, your wording",
        "Discussion draft",
        "Word a finding more strongly than you chose",
      ],
      [
        "rv",
        "Reads the draft without the plan, rebuilds its graph and compares it with the frozen one.",
        "Draft, frozen map",
        "Delta report, rollbacks",
        "See the plan while reading",
      ],
    ],
  },
  {
    block: "Verify",
    agents: [
      [
        "me",
        "Reviews the method, blind to the other two reviews.",
        "Adapted draft, reports",
        "Method report",
        "Edit the text",
      ],
      [
        "ev",
        "Reviews the evidence and originality, blind to the other two.",
        "Adapted draft, ledger",
        "Evidence report",
        "Edit the text",
      ],
      ["wt", "Reviews the writing, blind to the other two.", "Adapted draft", "Writing report", "Edit the text"],
      [
        "re",
        "Patches only the sentences an issue touches; at most three rounds.",
        "Issue backlog, drafts",
        "Draft 2, change log",
        "Touch an unaffected sentence",
      ],
    ],
  },
];
export const ROSTER_COUNT = ROSTER.reduce((n, b) => n + b.agents.filter(([a]) => a !== "code").length, 0);
/* the agents of each block, shown in the team row of the aside */
export const BLOCK_TEAM: string[][] = [
  ["or", "ds", "cu"],
  ["ss", "aa", "qm", "qs", "qx", "ql", "jd", "ag", "av"],
  ["js", "rp", "mw", "rw", "dw", "rv"],
  ["js", "me", "ev", "wt", "re"],
];
