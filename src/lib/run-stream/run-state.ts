import type {
  AgentRole,
  CanvasPiece,
  Cluster,
  CodeLine,
  ComputeProfile,
  DataColumn,
  DataIssue,
  DatasetRef,
  DebateTurn,
  Decision,
  Estimate,
  EstimateCheck,
  FeasibilityCheck,
  Figure,
  Gap,
  Gate,
  GoalField,
  Hypothesis,
  KnowledgeCard,
  LiteratureSource,
  LogLevel,
  MapEdge,
  MapNode,
  NodeOutcome,
  NoveltyCheck,
  Opportunity,
  PaperBlock,
  PaperPiece,
  PaperSectionPlan,
  PaperSource,
  PlannedStage,
  RecordedResult,
  RejectedPaper,
  ReportRow,
  ReviewFinding,
  ReviewMode,
  RuleId,
  RunLifecycle,
  ScopeRisk,
  ScreenPoint,
  SearchNode,
  SearchQuery,
  SearchStrategy,
  SetAside,
  ShortlistPaper,
  Skill,
  SourceRecord,
  StagePlan,
  SubQuestion,
  Tension,
  TestDesign,
  TopicScores,
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

export interface ScopeContent {
  stage: "scope";
  domains: string[];
  compute?: ComputeProfile;
  goal: { field: GoalField; label: string; value: string }[];
  adjusted: { field: GoalField; from: string; to: string; reason: string }[];
  subQuestions: SubQuestion[];
  risks: ScopeRisk[];
  evaluation?: {
    scores: TopicScores;
    reasons?: Partial<Record<keyof TopicScores, string>>;
    overall: number;
    threshold: number;
    advice: string;
  };
  approved?: { at: string; note: string };
}

export interface SearchContent {
  stage: "search";
  strategies: SearchStrategy[];
  queries: SearchQuery[];
  sources: LiteratureSource[];
  delayMs: number;
  /** Hits per `${queryId}:${sourceId}`; null while the request is out. */
  cells: Record<string, number | null>;
  requests: number;
  merged: { title: string; records: SourceRecord[]; kept: string; kept_record?: string }[];
  collected?: {
    raw: number;
    unique: number;
    duplicates: number;
    expansion?: { queries: number; hits: number };
    repeats?: number | null;
    files: { name: string; detail: string }[];
    collected_at: string;
  };
}

export interface ScreenContent {
  stage: "screen";
  criteria?: { rules: string[]; relevanceMin: number; qualityMin: number; candidates?: number };
  points: ScreenPoint[];
  rejected: RejectedPaper[];
  kept: ShortlistPaper[];
  /** Papers the person removed at the review stop. */
  dropped: string[];
}

export interface ReadContent {
  stage: "read";
  cards: KnowledgeCard[];
}

export interface SynthesizeContent {
  stage: "synthesize";
  clusters: Cluster[];
  setAside: SetAside[];
  tensions: Tension[];
  gaps: Gap[];
  overview?: string;
  ranking: Opportunity[];
}

/** The run drawn as a discourse graph and as the nine pieces of a research canvas. */
export interface MapContent {
  stage: "map";
  nodes: MapNode[];
  edges: MapEdge[];
  pieces: CanvasPiece[];
}

export interface DraftState {
  hypothesis: Hypothesis;
  novelty?: NoveltyCheck;
  feasibility?: FeasibilityCheck;
  selected: boolean;
  overrideNote?: string;
}

export interface HypothesizeContent {
  stage: "hypothesize";
  turns: DebateTurn[];
  drafts: Record<string, DraftState>;
  order: string[];
  asides: { id: string; kind?: "held_back" | "not_used"; statement: string; reason: string }[];
  dropped: string[];
  /** What the independent reviewer reported on the set. */
  findings: ReviewFinding[];
  /** For a revision: the comments sent back from the round before, which this round answers. */
  sent: ReviewFinding[];
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
  /** The locked test plan, written in pipeline stage 9 before any code. */
  planId?: string;
  plan: Hypothesis[];
  design?: TestDesign;
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
  | ScopeContent
  | SearchContent
  | ScreenContent
  | ReadContent
  | SynthesizeContent
  | HypothesizeContent
  | MapContent
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
  /** Skills matched to this stage. */
  skills: Skill[];
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
  /** The review stop a decision answered. */
  gateId?: string;
}

export interface RunState {
  runId: string;
  lastSeq: number;
  lifecycle: RunLifecycle;
  mode: ReviewMode;
  /** The topic the person typed when starting the run. */
  topic: string;
  domains: string[];
  dataset?: DatasetRef;
  startedAt?: string;
  plan: PlannedStage[];
  stages: Record<string, StageState>;
  stageOrder: string[];
  currentStageKey: string | null;
  /** When the step running now started, ISO 8601. */
  stepStartedAt?: string;
  /** The narration being streamed right now, or the last one. */
  message: { id: string; actor: AgentRole; text: string; done: boolean } | null;
  feed: FeedItem[];
  rules: Partial<Record<RuleId, "pass" | "hit">>;
  gate: Gate | null;
  decisions: FeedItem[];
  results: Record<string, RecordedResult>;
  /** Numbers recalled while scoping, and what the literature later said about them. */
  estimates: { estimate: Estimate; check?: EstimateCheck }[];
  completed: boolean;
  paperTitle?: string;
  /** Why the run stopped, once it failed. */
  failure?: string;
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
    case "scope":
      return { stage: "scope", domains: [], goal: [], adjusted: [], subQuestions: [], risks: [] };
    case "search":
      return {
        stage: "search",
        strategies: [],
        queries: [],
        sources: [],
        delayMs: 0,
        cells: {},
        requests: 0,
        merged: [],
      };
    case "screen":
      return { stage: "screen", points: [], rejected: [], kept: [], dropped: [] };
    case "read":
      return { stage: "read", cards: [] };
    case "synthesize":
      return { stage: "synthesize", clusters: [], setAside: [], tensions: [], gaps: [], ranking: [] };
    case "hypothesize":
      return {
        stage: "hypothesize",
        turns: [],
        drafts: {},
        order: [],
        asides: [],
        dropped: [],
        findings: [],
        sent: [],
      };
    case "map":
      return { stage: "map", nodes: [], edges: [], pieces: [] };
    case "experiment":
      return {
        stage: "experiment",
        hypotheses: [],
        nodes: {},
        nodeOrder: {},
        activeNodeId: null,
        results: {},
        plan: [],
      };
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
    topic: "",
    domains: [],
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
    estimates: [],
    completed: false,
  };
}
