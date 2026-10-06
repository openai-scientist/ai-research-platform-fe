import type { AgentRole, GateKind, ReviewMode, RunStage, Verdict } from "@/lib/run-stream/contract";

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
  theorist: {
    name: "Theorist",
    initials: "Th",
    text: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-500/12 ring-violet-500/30",
    solid: "bg-violet-600",
  },
  knowledge: {
    name: "Knowledge",
    initials: "Kn",
    text: "text-cyan-700 dark:text-cyan-300",
    soft: "bg-cyan-500/12 ring-cyan-500/30",
    solid: "bg-cyan-600",
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
  code: {
    name: "Code check",
    initials: "{ }",
    text: "text-muted-foreground",
    soft: "bg-muted ring-foreground/10",
    solid: "bg-muted-foreground",
  },
};

export const TEAM: AgentRole[] = [
  "steward",
  "theorist",
  "knowledge",
  "methodologist",
  "skeptic",
  "pi",
  "interpreter",
  "reporter",
];

export const MODES: Record<ReviewMode, { label: string; line: string; stops: GateKind[] }> = {
  auto: { label: "Auto", line: "Never stops. The PI makes every call, and every call is logged.", stops: [] },
  light: { label: "Light", line: "Stops once, before the paper is published.", stops: ["publish"] },
  copilot: {
    label: "Copilot",
    line: "You approve the hypotheses, each round's next step, and the paper.",
    stops: ["hypotheses", "decision", "publish"],
  },
  full: {
    label: "Full",
    line: "Like Copilot, plus checks of the question framing and the report.",
    stops: ["framing", "hypotheses", "decision", "report", "publish"],
  },
};

export const STOP_INFO: Record<
  GateKind,
  { title: string; where: string; what: string; verb: string; noun: string; stage: RunStage }
> = {
  framing: {
    title: "Check the question",
    where: "After Understand",
    what: "Confirm the framing before anything is built on it.",
    verb: "you check it",
    noun: "the framing",
    stage: "understand",
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
};

export const STAGE_SHORT: Record<RunStage | "done", string> = {
  data: "Data",
  understand: "Understand",
  hypothesize: "Hypothesize",
  experiment: "Experiment",
  interpret: "Interpret",
  report: "Report",
  write: "Write",
  done: "Paper",
};

export const PIPELINE: { stage: RunStage; title: string; text: string }[] = [
  { stage: "data", title: "Check the data", text: "The Steward fixes problems and saves a cleaned version." },
  { stage: "understand", title: "Understand", text: "The question is made precise and prior work is read." },
  { stage: "hypothesize", title: "Hypothesize", text: "Ideas are proposed, attacked, and a few are picked." },
  { stage: "experiment", title: "Experiment", text: "Code is written, run in a sandbox and fixed; the best is kept." },
  { stage: "interpret", title: "Interpret", text: "Each result gets a verdict and a second opinion." },
  { stage: "report", title: "Build the report", text: "Code gathers every result, figure and how to reproduce it." },
  { stage: "write", title: "Write the paper", text: "The paper is written from the report, reviewed and checked." },
];

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
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
} as const;

export const RULES: Record<1 | 2 | 3 | 4, string> = {
  1: "Every number in the paper comes from results.json.",
  2: "Every analysis reports the number its plan promised.",
  3: "Data versions and records are never overwritten.",
  4: "The test plan is locked before any code runs.",
};
