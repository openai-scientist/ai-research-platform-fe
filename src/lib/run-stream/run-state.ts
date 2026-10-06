import type {
  AgentRole,
  CodeLine,
  DataColumn,
  DataIssue,
  DatasetRef,
  Decision,
  Figure,
  FrameSlot,
  Gate,
  Hypothesis,
  Idea,
  IdeaReview,
  LiteraturePaper,
  LogLevel,
  NodeOutcome,
  PaperBlock,
  PaperPiece,
  PaperSectionPlan,
  PaperSource,
  PlannedStage,
  RecordedResult,
  ReportRow,
  ReviewMode,
  RuleId,
  RunLifecycle,
  SearchNode,
  StagePlan,
  Verdict,
} from "./contract";

export interface DataContent {
  stage: "data";
  file: string;
  columns: DataColumn[];
  rows: string[][];
  totalRows: number;
  rowsNow: number;
  /** Clean share per profiled column, 0–100. */
  profiled: Record<string, number>;
  issues: DataIssue[];
  fixes: Record<string, { fix: string; method: string }>;
  /** Replaced cells keyed by `${row}:${column}`. */
  replaced: Record<string, { from: string; to: string }>;
  removed: number[];
  version?: { version: number; rows: number; removed: number; fixes: number; sha256: string };
}

export interface UnderstandContent {
  stage: "understand";
  frame: FrameSlot[];
  chart?: { title: string; note: string; bars: { label: string; value: number }[] };
  patterns: { id: string; text: string }[];
  literature?: { found: number; relevant: number; used: number };
  papers: LiteraturePaper[];
  gaps: { id: string; text: string }[];
}

export type IdeaColumn = "ideas" | "review" | "set" | "aside";

export interface IdeaState {
  idea: Idea;
  column: IdeaColumn;
  review?: IdeaReview;
  hypothesis?: Hypothesis;
  overrideNote?: string;
  setAsideReason?: string;
}

export interface HypothesizeContent {
  stage: "hypothesize";
  ideas: Record<string, IdeaState>;
  order: string[];
  planId?: string;
  plan: Hypothesis[];
  dropped: string[];
}

export type NodeStatus = "writing" | "ready" | "running" | NodeOutcome;

export interface NodeState extends SearchNode {
  code: CodeLine[];
  logs: { level: LogLevel; text: string }[];
  status: NodeStatus;
  error?: string;
  score?: number;
  best?: boolean;
}

export interface ExperimentContent {
  stage: "experiment";
  hypotheses: Hypothesis[];
  nodes: Record<string, NodeState>;
  nodeOrder: Record<string, string[]>;
  activeNodeId: string | null;
  results: Record<string, RecordedResult>;
}

export interface EvidenceRow {
  hypothesis: Hypothesis;
  result: RecordedResult;
  verdict?: Verdict;
  reason?: string;
  checked?: boolean;
  objection?: string;
}

export interface InterpretContent {
  stage: "interpret";
  rows: EvidenceRow[];
  recommendation?: { recommendation: Decision; rationale: string; goBacksUsed: number; goBacksAllowed: number };
  decision?: { decision: Decision; by: "pi" | "you"; note?: string };
}

export interface ReportContent {
  stage: "report";
  rows: ReportRow[];
  figures: Figure[];
  notes: Record<string, { note: string; objection?: string }>;
  repro: { label: string; value: string }[];
}

export interface PaperComment {
  id: string;
  spanId: string;
  text: string;
  /** The reporter's tracked change answering this comment, made on `spanId`. */
  revision?: { spanId: string; from: string; to: string };
}

export interface WriteContent {
  stage: "write";
  title?: string;
  authors?: string;
  sections: PaperSectionPlan[];
  sources: PaperSource[];
  sectionStatus: Record<string, "planned" | "writing" | "done">;
  blocks: Record<string, PaperBlock[]>;
  pieces: Record<string, PaperPiece[]>;
  /** How many times each report source was quoted, keyed by source. */
  sourcesUsed: Record<string, number>;
  checked?: { numbers: number; figures: number };
  blocked?: { spanId: string; text: string };
  fixedNumbers: Record<string, { value: string; source: string }>;
  comments: PaperComment[];
  accepted: boolean;
  drafts: { draft: number; score: number; note: string; best: boolean }[];
  typeset: boolean;
}

export type StageContent =
  | DataContent
  | UnderstandContent
  | HypothesizeContent
  | ExperimentContent
  | InterpretContent
  | ReportContent
  | WriteContent;

export interface StageState {
  plan: StagePlan;
  status: "active" | "done";
  currentStepId: string | null;
  doneStepIds: string[];
  summary?: string;
  content: StageContent;
}

export interface FeedItem {
  seq: number;
  actor: AgentRole | "you";
  text: string;
  kind: "message" | "event" | "decision";
  /** Stage the item happened in. */
  stageKey?: string;
  /** The person's note, for decisions made at a review stop. */
  note?: string;
}

export interface RunState {
  runId: string;
  lastSeq: number;
  lifecycle: RunLifecycle;
  mode: ReviewMode;
  question: string;
  dataset?: DatasetRef;
  contextVersion?: number;
  startedAt?: string;
  plan: PlannedStage[];
  stages: Record<string, StageState>;
  stageOrder: string[];
  currentStageKey: string | null;
  /** The narration being streamed right now, or the last one. */
  message: { id: string; actor: AgentRole; text: string; done: boolean } | null;
  feed: FeedItem[];
  rules: Partial<Record<RuleId, "pass" | "hit">>;
  gate: Gate | null;
  decisions: FeedItem[];
  results: Record<string, RecordedResult>;
  completed: boolean;
  paperTitle?: string;
}

export function emptyContent(plan: StagePlan): StageContent {
  switch (plan.stage) {
    case "data":
      return {
        stage: "data",
        file: "",
        columns: [],
        rows: [],
        totalRows: 0,
        rowsNow: 0,
        profiled: {},
        issues: [],
        fixes: {},
        replaced: {},
        removed: [],
      };
    case "understand":
      return { stage: "understand", frame: [], patterns: [], papers: [], gaps: [] };
    case "hypothesize":
      return { stage: "hypothesize", ideas: {}, order: [], plan: [], dropped: [] };
    case "experiment":
      return { stage: "experiment", hypotheses: [], nodes: {}, nodeOrder: {}, activeNodeId: null, results: {} };
    case "interpret":
      return { stage: "interpret", rows: [] };
    case "report":
      return { stage: "report", rows: [], figures: [], notes: {}, repro: [] };
    case "write":
      return {
        stage: "write",
        sections: [],
        sources: [],
        sectionStatus: {},
        blocks: {},
        pieces: {},
        sourcesUsed: {},
        fixedNumbers: {},
        comments: [],
        accepted: false,
        drafts: [],
        typeset: false,
      };
  }
}

export function initialRunState(runId: string): RunState {
  return {
    runId,
    lastSeq: 0,
    lifecycle: "running",
    mode: "copilot",
    question: "",
    plan: [],
    stages: {},
    stageOrder: [],
    currentStageKey: null,
    message: null,
    feed: [],
    rules: {},
    gate: null,
    decisions: [],
    results: {},
    completed: false,
  };
}
