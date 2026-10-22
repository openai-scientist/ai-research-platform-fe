import type { AgentRole, GateKind, ReviewMode, RuleId, RunStage, Verdict } from "@/lib/run-stream/contract";
import { RUN_ENDS_AT, SHOW_DATA_STAGE, SHOW_MAP_STAGE } from "@/lib/run-stream/features";

export interface AgentMeta {
  name: string;
  initials: string;
  /** Text colour for names and initials. */
  text: string;
  /** Soft background for avatars and chips. */
  soft: string;
  /** Solid background for the agent's cursor. */
  solid: string;
}

export const AGENTS: Record<AgentRole, AgentMeta> = {
  steward: {
    name: "Steward",
    initials: "St",
    text: "text-teal-700 dark:text-teal-300",
    soft: "bg-teal-500/12 ring-teal-500/30",
    solid: "bg-teal-600",
  },
  strategist: {
    name: "Strategist",
    initials: "Sg",
    text: "text-pink-700 dark:text-pink-300",
    soft: "bg-pink-500/12 ring-pink-500/30",
    solid: "bg-pink-600",
  },
  librarian: {
    name: "Librarian",
    initials: "Li",
    text: "text-cyan-700 dark:text-cyan-300",
    soft: "bg-cyan-500/12 ring-cyan-500/30",
    solid: "bg-cyan-600",
  },
  theorist: {
    name: "Theorist",
    initials: "Th",
    text: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-500/12 ring-violet-500/30",
    solid: "bg-violet-600",
  },
  methodologist: {
    name: "Methodologist",
    initials: "Me",
    text: "text-blue-700 dark:text-blue-300",
    soft: "bg-blue-500/12 ring-blue-500/30",
    solid: "bg-blue-600",
  },
  skeptic: {
    name: "Skeptic",
    initials: "Sk",
    text: "text-orange-700 dark:text-orange-300",
    soft: "bg-orange-500/12 ring-orange-500/30",
    solid: "bg-orange-600",
  },
  pi: {
    name: "PI",
    initials: "PI",
    text: "text-foreground",
    soft: "bg-muted ring-foreground/15",
    solid: "bg-foreground",
  },
  interpreter: {
    name: "Interpreter",
    initials: "In",
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-500/12 ring-emerald-500/30",
    solid: "bg-emerald-600",
  },
  reporter: {
    name: "Reporter",
    initials: "Re",
    text: "text-amber-700 dark:text-amber-300",
    soft: "bg-amber-500/12 ring-amber-500/30",
    solid: "bg-amber-600",
  },
  reviewer: {
    name: "Reviewer",
    initials: "Rv",
    text: "text-indigo-700 dark:text-indigo-300",
    soft: "bg-indigo-500/12 ring-indigo-500/30",
    solid: "bg-indigo-600",
  },
  code: {
    name: "Code check",
    initials: "{ }",
    text: "text-muted-foreground",
    soft: "bg-muted ring-foreground/10",
    solid: "bg-muted-foreground",
  },
};

export const TEAM: AgentRole[] = [
  ...(SHOW_DATA_STAGE ? (["steward"] as const) : []),
  "strategist",
  "librarian",
  "theorist",
  "methodologist",
  "skeptic",
  "reviewer",
  "pi",
  "interpreter",
  "reporter",
];

export const MODES: Record<ReviewMode, { label: string; line: string; stops: GateKind[] }> = {
  auto: {
    label: "Auto",
    line: "Never stops. The PI endorses its own plan and picks the hypotheses, and every call is logged.",
    stops: [],
  },
  light: {
    label: "Light",
    line: "You endorse the PI's plan, approve the reading list and the hypotheses, and accept the final set.",
    stops: ["charter", "screen", "hypotheses", "accept"],
  },
  copilot: {
    label: "Copilot",
    line: "You approve the reading list, the hypotheses, each round's next step, and the paper.",
    stops: ["screen", "hypotheses", "decision", "publish"],
  },
  full: {
    label: "Full",
    line: "Like Copilot, plus checks of the scope and the report.",
    stops: ["scope", "screen", "hypotheses", "decision", "report", "publish"],
  },
};

/** The modes a run can start in. */
export const RUN_MODES: ReviewMode[] = ["light", "auto"];

export const STOP_INFO: Record<
  GateKind,
  { title: string; where: string; what: string; verb: string; noun: string; stage: RunStage }
> = {
  charter: {
    title: "Endorse the PI's plan",
    where: "Before Scope",
    what: "The PI drafts the question, scope and criteria. Nothing runs until you endorse or edit it.",
    verb: "you endorse the plan",
    noun: "the PI's plan",
    stage: "scope",
  },
  scope: {
    title: "Check the scope",
    where: "After Scope",
    what: "Confirm the goal and sub-questions before the search is built on them.",
    verb: "you check it",
    noun: "the scope",
    stage: "scope",
  },
  screen: {
    title: "Approve the shortlist",
    where: "After Screen",
    what: "Approve or remove papers before they are read.",
    verb: "you approve",
    noun: "the reading list",
    stage: "screen",
  },
  hypotheses: {
    title: "Approve the hypotheses",
    where: "After Hypothesize, each round",
    what: "Approve or drop hypotheses before any code runs.",
    verb: "you approve",
    noun: "the hypotheses",
    stage: "hypothesize",
  },
  decision: {
    title: "Decide what's next",
    where: "After Interpret, each round",
    what: "Write it up, rerun the experiments, or try new hypotheses.",
    verb: "you decide",
    noun: "each round's next step",
    stage: "interpret",
  },
  report: {
    title: "Check the report",
    where: "After the report is built",
    what: "Confirm the record before the paper is written from it.",
    verb: "you check it",
    noun: "the report",
    stage: "report",
  },
  publish: {
    title: "Approve the paper",
    where: "Before publishing",
    what: "Nothing leaves the run without your OK.",
    verb: "you approve",
    noun: "the paper",
    stage: "write",
  },
  accept: {
    title: "Accept the hypotheses",
    where: "After Map",
    what: "Pick the hypotheses the run ends with.",
    verb: "you accept",
    noun: "the final set",
    stage: "map",
  },
};

export const STAGE_SHORT: Record<RunStage | "done", string> = {
  data: "Data",
  scope: "Scope",
  search: "Search",
  screen: "Screen",
  read: "Read",
  synthesize: "Synthesize",
  hypothesize: "Hypothesize",
  map: "Map",
  experiment: "Experiment",
  interpret: "Interpret",
  report: "Report",
  write: "Write",
  done: "Paper",
};

const FULL_PIPELINE: { stage: RunStage; title: string; text: string }[] = [
  { stage: "data", title: "Check the data", text: "The Steward fixes problems and saves a cleaned version." },
  { stage: "scope", title: "Scope the question", text: "A goal in five parts, split into sub-questions and rated." },
  {
    stage: "search",
    title: "Search the literature",
    text: "Short queries go to three sources; duplicates are merged.",
  },
  { stage: "screen", title: "Screen the papers", text: "Each paper is scored; only the relevant and solid are kept." },
  { stage: "read", title: "Read and extract", text: "Each paper becomes a card; its limitations become gap material." },
  { stage: "synthesize", title: "Find the gaps", text: "Cards are grouped into schools of thought to find the gaps." },
  { stage: "hypothesize", title: "Hypothesize", text: "Agents debate; survivors say what would prove them wrong." },
  {
    stage: "map",
    title: "Map the argument",
    text: "The run is drawn as a discourse graph and a research canvas, ready to download.",
  },
  { stage: "experiment", title: "Experiment", text: "Code is written, run in a sandbox and fixed; the best is kept." },
  { stage: "interpret", title: "Interpret", text: "Each result gets a verdict and a second opinion." },
  { stage: "report", title: "Build the report", text: "Code gathers every result, figure and how to reproduce it." },
  { stage: "write", title: "Write the paper", text: "The paper is written from the report, reviewed and checked." },
];

const SHOWN_PIPELINE = FULL_PIPELINE.filter(
  (p) => (SHOW_DATA_STAGE || p.stage !== "data") && (SHOW_MAP_STAGE || p.stage !== "map"),
);
const LAST_REACHED =
  RUN_ENDS_AT === "hypotheses"
    ? SHOWN_PIPELINE.findIndex((p) => p.stage === (SHOW_MAP_STAGE ? "map" : "hypothesize")) + 1
    : undefined;

/** Stages as the start screens describe them. */
export const PIPELINE = SHOWN_PIPELINE.slice(0, LAST_REACHED);

/** Stages after the hypotheses that runs don't reach yet: shown, but locked. */
export const LOCKED_PIPELINE = LAST_REACHED === undefined ? [] : SHOWN_PIPELINE.slice(LAST_REACHED);

export const LOCKED_HINT = `Coming soon. For now a run ends once the hypotheses are picked${SHOW_MAP_STAGE ? " and mapped" : ""}.`;

/** Stops a run in this mode really makes, given where runs end for now: a run that ends at the hypotheses still
 * stops to have them approved. */
export function stopsFor(mode: ReviewMode): GateKind[] {
  return MODES[mode].stops.filter(
    (k) =>
      RUN_ENDS_AT === "paper" ||
      k === "charter" ||
      k === "scope" ||
      k === "screen" ||
      k === "hypotheses" ||
      k === "accept",
  );
}

export const VERDICT: Record<Verdict, { label: string; className: string; dot: string; stroke: string; fill: string }> =
  {
    supported: {
      label: "Supported",
      className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
      stroke: "stroke-emerald-500",
      fill: "fill-emerald-500",
    },
    not_supported: {
      label: "Not supported",
      className: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
      stroke: "stroke-rose-500",
      fill: "fill-rose-500",
    },
    insufficient: {
      label: "Not enough evidence",
      className: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
      dot: "bg-amber-500",
      stroke: "stroke-amber-500",
      fill: "fill-amber-500",
    },
  };

export const STATUS_TONE = {
  running: { label: "Running", className: "bg-sky-500/12 text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  waiting: {
    label: "Waiting for you",
    className: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  completed: {
    label: "Completed",
    className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  stopped: { label: "Stopped", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
} as const;

export const RULES: Record<RuleId, string> = {
  1: "Every number in the paper comes from results.json.",
  2: "Every analysis reports the number its plan promised.",
  3: "Data versions and records are never overwritten.",
  4: "The test plan is locked before any code runs.",
  5: "Every hypothesis says what result would prove it wrong.",
  6: "Numbers recalled from memory stay unverified until a paper backs them.",
};

export const RULE_IDS: RuleId[] = [1, 2, 3, 4, 5, 6];

/** "Curcio, Ferrara & De Gennaro, 2006" → "Curcio 2006": short enough for a chip. */
export function shortCite(citation: string) {
  const year = citation.match(/\d{4}/)?.[0] ?? "";
  const author = citation.split(/[ ,&]/)[0];
  return year ? `${author} ${year}` : author;
}
