// Event stream contract for a research run.
//
// The backend relays Popper's progress as an ordered stream of events
// (`GET /projects/{projectId}/runs/{runId}/events`, Server-Sent Events, resumable with `Last-Event-ID`).
// The client rebuilds everything it shows from these events with `applyRunEvent`, so a mock stream
// and the real stream must emit exactly the same shapes.

/**
 * Screens of a run. `scope` to `hypothesize` cover Popper's pipeline stages 1 to 8:
 * scope = 1 topic init + 2 problem decompose, search = 3 search strategy + 4 literature collect,
 * screen = 5 literature screen, read = 6 knowledge extract, synthesize = 7, hypothesize = 8.
 * `experiment` starts with stage 9, experiment design.
 */
export type RunStage =
  | "data"
  | "scope"
  | "search"
  | "screen"
  | "read"
  | "synthesize"
  | "hypothesize"
  /** Everything the run found, drawn as a discourse graph and a research canvas. */
  | "map"
  | "experiment"
  | "interpret"
  | "report"
  | "write";

export type AgentRole =
  | "steward"
  | "strategist"
  | "librarian"
  | "theorist"
  | "methodologist"
  | "skeptic"
  | "pi"
  | "interpreter"
  | "reporter"
  | "code";

/** How often the run stops for the person who started it. */
export type ReviewMode = "auto" | "light" | "copilot" | "full";

export type GateKind = "scope" | "screen" | "hypotheses" | "decision" | "report" | "publish";

export type RunLifecycle = "running" | "paused" | "awaiting_review" | "completed" | "failed";

/** Why a round exists: the first one, a new direction after a pivot, or a deeper rerun of the same set. */
export type RoundKind = "first" | "pivot" | "refine";

export type Verdict = "supported" | "not_supported" | "insufficient";

export type Decision = "proceed" | "refine" | "pivot";

export type Risk = "low" | "medium" | "high";

export type IssueTone = "error" | "warning";

export type NodeKind = "draft" | "debug" | "improve";

export type NodeOutcome = "works" | "crashed" | "out_of_attempts" | "discarded";

/**
 * The rules Popper never bends.
 * 1: every number in the paper comes from the results file.
 * 2: every analysis reports the number its plan promised.
 * 3: data versions and records are never overwritten.
 * 4: the test plan is locked before any code runs.
 * 5: every hypothesis states the result that would prove it wrong.
 * 6: numbers recalled by the agents stay unverified until a paper backs them.
 */
export type RuleId = 1 | 2 | 3 | 4 | 5 | 6;

// ---------- shared shapes ----------

export interface StagePlanStep {
  id: string;
  title: string;
  actor: AgentRole;
  /** One or two plain sentences on what happens in this step. */
  explain: string;
  /** Present when this step stops for the person. */
  gate?: GateKind;
  /** Popper pipeline stage this step belongs to, 1 to 9. */
  pipeline_stage?: number;
  /** Plain name of what the step writes, such as "Research goal". The run folder path stays on the backend. */
  artifact?: string;
}

/** A stage as the backend plans it. Future stages appear in `run.plan` before they start. */
export interface PlannedStage {
  key: string;
  stage: RunStage;
  round?: number;
  round_kind?: RoundKind;
  title: string;
  has_gate: boolean;
  /** Popper pipeline stages this screen covers. */
  pipeline?: number[];
}

export interface StagePlan extends PlannedStage {
  purpose: string;
  /** Plain names of what this stage builds on, from earlier stages or your input. */
  reads?: string[];
  cast: AgentRole[];
  steps: StagePlanStep[];
}

export interface DatasetRef {
  name: string;
  version: number;
  rows: number;
  columns: number;
}

export interface DataColumn {
  name: string;
  type: string;
  unit: string;
}

export interface DataIssue {
  id: string;
  title: string;
  detail: string;
  column: string;
  /** Rows affected in the whole file, not only in the sample. */
  affected_rows: number;
  tone: IssueTone;
  /** Share of the column's cells affected, 0–100. */
  share: number;
  /** Cells in the sample rows; `row` is the sample row index. */
  cells: { row: number; column: string }[];
  /** Sample rows that will be removed whole. */
  rows: number[];
}

export type SkillCategory = "domain" | "experiment" | "tooling" | "writing";

/** A skill matched to this stage by keywords and injected into the agents' instructions. */
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  /** Words from the question or data that made it match. Empty when it always applies to the stage. */
  matched: string[];
}

// ---------- scope: topic init and problem decompose ----------

export type GoalField = "title" | "problem" | "objective" | "scope" | "success";

export interface ComputeProfile {
  label: string;
  detail: string;
}

/** A number the agents recall before reading any paper. It stays unverified until the literature backs it. */
export interface Estimate {
  id: string;
  text: string;
}

export interface EstimateCheck {
  estimate_id: string;
  status: "verified" | "unsupported";
  /** Citation that backs or contradicts it. */
  source?: string;
  note: string;
}

export interface SubQuestion {
  id: string;
  text: string;
  /** What the test would compare, in column terms. */
  tests: string;
  /** 1 is answered first. */
  priority: number;
  /** Phrases of the question this sub-question covers, quoted exactly. */
  covers: string[];
}

export interface ScopeRisk {
  id: string;
  sq_id: string;
  text: string;
  level: Risk;
}

export interface TopicScores {
  novelty: number;
  specificity: number;
  feasibility: number;
}

// ---------- search and collect ----------

export interface SearchStrategy {
  id: string;
  title: string;
  why: string;
}

export interface SearchQuery {
  id: string;
  strategy_id: string;
  text: string;
}

export interface LiteratureSource {
  id: string;
  name: string;
}

/** One source's record of a paper found more than once. */
export interface SourceRecord {
  source: string;
  /** The source's own id for the paper. */
  record_id: string;
  citations: number;
  has_doi: boolean;
}

// ---------- screen ----------

export interface ScreenPoint {
  id: string;
  /** 0 to 1. */
  relevance: number;
  /** 0 to 1. */
  quality: number;
}

export interface ShortlistPaper {
  id: string;
  citation: string;
  title: string;
  venue: string;
  year: number;
  relevance: number;
  quality: number;
  /** Why it was kept. */
  reason: string;
  doi?: string;
  /** Kept for being foundational even though it is old. */
  seminal?: boolean;
  /** Where the kept record came from, and its citation count then. */
  source: string;
  citations: number;
}

/** A paper that shares the words of the question but is about something else. */
export interface RejectedPaper {
  id: string;
  title: string;
  venue: string;
  /** The shared word that made it match. Empty when the paper was set aside for another reason. */
  false_friend: string;
  reason: string;
  /** Why it is out: judged off-topic, ranked below the shortlist cut, or never scored. */
  decision?: "rejected" | "below_cutoff" | "unscored" | "prefiltered";
}

// ---------- read and synthesize ----------

/** The six fields a knowledge card reads from an abstract. */
export type CardField = "problem" | "method" | "data" | "metrics" | "findings" | "limitations";

export interface KnowledgeCard {
  /** Cite key, such as `okano2019`. */
  id: string;
  paper_id: string;
  citation: string;
  problem: string;
  method: string;
  data: string;
  metrics: string;
  findings: string;
  limitations: string;
  /**
   * The abstract's own words behind each filled field, checked word for word by the engine. Missing on cards made
   * before quotes existed and on the scripted run.
   */
  quotes?: Partial<Record<CardField, string[]>>;
}

export interface Cluster {
  id: string;
  title: string;
  claim: string;
  card_ids: string[];
}

/** Cards that bear on no school of thought, left out of the clusters with the reason. */
export interface SetAside {
  id: string;
  card_ids: string[];
  reason: string;
}

/** One side of a tension: what its cards find. */
export interface TensionSide {
  claim: string;
  card_ids: string[];
}

/** A point where cards disagree. Newer runs give it an id (`X1`) and the cards on each of its two sides. */
export interface Tension {
  id?: string;
  between: [string, string];
  text: string;
  sides?: [TensionSide, TensionSide];
}

export interface Gap {
  id: string;
  text: string;
  /** Cards whose limitations point to it. */
  from: string[];
}

/** A gap ranked as a research opportunity. Priority 1 is pursued first. */
export interface Opportunity {
  gap_id: string;
  priority: number;
  text: string;
}

// ---------- hypothesize ----------

/** `defend` is an author keeping its claim against a challenge, with a reason. */
export type DebateStance = "propose" | "test" | "challenge" | "refine" | "defend" | "concede";

/** How serious a challenge is: `fatal` stops the claim as written; a `caveat` is a limit worth recording. */
export type ObjectionSeverity = "fatal" | "caveat";

/** The only reasons a challenge may be fatal. */
export type ObjectionFlaw = "unsupported" | "unfalsifiable" | "undecidable_test" | "already_established";

/** An objection that still stands after the debate, carried by the hypothesis built on what it targets. */
export interface StandingObjection {
  by: AgentRole;
  /** The debate thread it targets, such as `T1`. */
  about: string;
  severity: ObjectionSeverity;
  flaw?: ObjectionFlaw | null;
  field?: string | null;
  card_id?: string | null;
  text: string;
}

export interface DebateTurn {
  id: string;
  actor: AgentRole;
  stance: DebateStance;
  text: string;
  reply_to?: string;
  /** Hypothesis or idea the turn is about. */
  about?: string;
  /** Challenges this turn answers (an author's answer) or reviews (a critic's review). */
  answers?: string[];
  /** Why the author rewrote the claim. */
  note?: string;
  /** Part of a debate round: the critique, the authors' answers, or the critics' review of them. */
  phase?: "critique" | "answer" | "review";
  /** For a challenge: how serious it is, and for a fatal one its flaw and where it is. */
  severity?: ObjectionSeverity;
  flaw?: ObjectionFlaw;
  field?: string;
  card_id?: string;
}

/**
 * What would prove a hypothesis wrong: the estimate's 95% range must stay clear of `zone`.
 * A null end is open; a zone with equal ends is a single value, such as zero.
 */
export interface Falsifier {
  text: string;
  zone: [number | null, number | null];
  unit: string;
  /** For a negligible-effect prediction (`≈ 0`): the band the result must land in; it is wrong anywhere outside. */
  within?: [number, number];
}

export interface NoveltyCheck {
  /** False when a paper found already tests the prediction. */
  novel: boolean;
  /** The paper the verdict names, or the closest by word overlap when it names none. */
  closest: string;
  /** 0 to 1: the share of the hypothesis's words that paper holds. */
  similarity: number;
  /** False when the novelty search found nothing and only the run's own papers were compared. */
  searched?: boolean;
  /**
   * The model's reading of the closest papers: `tested` (one already tests the prediction), `related` (one studies the
   * same exposure or outcome without testing it) or `new`. Absent on runs checked by word overlap alone.
   */
  verdict?: "tested" | "related" | "new";
  /** One sentence on what in the paper decides the verdict. */
  reason?: string;
}

export interface FeasibilityCheck {
  ok: boolean;
  note: string;
}

export interface TestDesign {
  independent: string[];
  dependent: string[];
  controls: string[];
}

export interface Hypothesis {
  id: string;
  statement: string;
  short: string;
  /** Expected sign, such as `> 0`, `< 0` or `≠ 0`. */
  prediction: string;
  outcome: string;
  exposure: string;
  estimand: string;
  method: string;
  /** Name of the number this hypothesis must write to the results file. */
  report_key: string;
  /** Sub-question it answers. */
  sub_question: string;
  /** Gap it fills, such as `G2`. */
  gap: string;
  /** Why nobody has shown this yet. */
  novelty: string;
  /** Why it should be true. */
  rationale: string;
  falsify: Falsifier;
  /** Tensions of the synthesis this hypothesis settles, such as `X1`. */
  tension_ids?: string[];
  /** The debate threads it is built from, such as `T1`. */
  from?: string[];
  /** For one built from several threads: what it takes from each. */
  merge_note?: string;
  /** Fatal objections that still stand against what it is built from. */
  contested?: StandingObjection[];
  /** Caveats that still stand; they are also listed among its limitations. */
  caveats?: StandingObjection[];
  /** Why the reviewer kept it, although the debate had set it aside. */
  kept_by_reviewer?: string;
}

// ---------- map ----------

/**
 * An entity of the scientific research canvas: five core types and two optional ones (assumption, expected
 * contribution). A sub-question is a research question too. A hypothesis is a prediction still to be tested, never a
 * claim; a claim is a statement, from the literature or proposed; evidence is what a claim is judged by.
 */
export type EntityType = "gap" | "question" | "hypothesis" | "claim" | "evidence" | "assumption" | "contribution";

export interface MapNode {
  id: string;
  type: EntityType;
  /** The record's own id, shown on the node, such as `SQ1`, `C1`, `G1` or `H1`. */
  code: string;
  /** What the node says, shown on it (clipped to a few lines). */
  label: string;
  /** The full statement, shown when the node is opened. */
  text: string;
  /** The stage of the run that produced it. */
  stage: number;
  /** For a claim: from the literature, or proposed by the run. */
  origin?: "literature" | "proposed";
  /** For evidence: the sample it comes from. */
  detail?: string;
  /** For evidence: the paper's citation. */
  source?: string;
  /** For a gap: the papers whose limitations point to it, each with what it left open. */
  provenance?: { source: string; text: string }[];
  /** Further facts shown when the node is opened, such as a hypothesis's method and falsifier. */
  facts?: { label: string; value: string }[];
}

/**
 * The eleven relations, each read from `from` to `to`: evidence `supports` or `contradicts` a claim; a claim
 * `substantiates` a gap (only one that states a limitation) or `provides_rationale_for` a hypothesis; a gap
 * `motivates` a question; a question `decomposes_into` sub-questions; a hypothesis `proposes_answer_to` a question,
 * `addresses` a gap, `depends_on` an assumption and `informs` an expected contribution, which `targets` a gap.
 */
export type MapRelation =
  | "supports"
  | "contradicts"
  | "substantiates"
  | "motivates"
  | "decomposes_into"
  | "proposes_answer_to"
  | "provides_rationale_for"
  | "depends_on"
  | "addresses"
  | "informs"
  | "targets";

/**
 * How far a relation can be trusted: `stated` by a record of the run, `derived` from other relations, or a judgement
 * still `unreviewed` by anyone.
 */
export type RelationStatus = "stated" | "derived" | "unreviewed";

export interface MapEdge {
  id: string;
  /** The node the relation reads from: evidence `supports` claim. It is never flipped for the layout. */
  from: string;
  to: string;
  relation: MapRelation;
  /** For `provides_rationale_for`: whether the claim speaks for the hypothesis or challenges it. */
  polarity?: "supports" | "challenges";
  status: RelationStatus;
  /** Why the relation holds. */
  rationale: string;
  /** The record of the run it comes from, such as `Stage 8 · H1`. */
  provenance: string;
}

/**
 * The nine pieces of the AMJ Management Research Canvas (Dorobantu, Gruber, Ravasi & Wellman, 2024, AMJ 67(5),
 * 1163–1174), with the puzzle at the centre.
 */
export type CanvasPieceId =
  | "puzzle"
  | "audience"
  | "question"
  | "theory"
  | "setting"
  | "design"
  | "findings"
  | "contributions"
  | "boundaries";

export interface CanvasPiece {
  id: CanvasPieceId;
  /** What the run puts in this piece, each line with the records it comes from. */
  items: { text: string; refs?: string[] }[];
  /** `pending` until the run has what this piece needs, such as findings before any experiment ran. */
  status: "filled" | "pending";
  /** Why the piece is pending, or a caveat on what it holds. */
  note?: string;
}

export interface SearchNode {
  id: string;
  hypothesis_id: string;
  /** 1-based version number within this hypothesis and round. */
  version: number;
  parent_id: string | null;
  kind: NodeKind;
  title: string;
}

export interface CodeLine {
  text: string;
  /** True for lines this version added on top of its parent. */
  added: boolean;
}

export type LogLevel = "command" | "info" | "error" | "success";

export interface RecordedResult {
  /** Key in the results file, unique per run. */
  key: string;
  hypothesis_id: string;
  round: number;
  /** Null when no version of the analysis ran. */
  node_id: string | null;
  estimate: number | null;
  ci_low: number | null;
  ci_high: number | null;
}

export interface GateOption {
  id: string;
  label: string;
  description: string;
  /** What happens next if this option is chosen. */
  leads_to: string;
  confirm_label: string;
  recommended?: boolean;
  disabled?: boolean;
}

export interface Gate {
  id: string;
  kind: GateKind;
  title: string;
  /** Why the run stopped here, in terms of the review mode. */
  why: string;
  /** What is ready for review. */
  summary: string[];
  options: GateOption[];
  /** Position of this stop among all stops planned so far. */
  stop_index: number;
  stop_total: number;
  /** Items the person may drop before approving: hypothesis ids for `hypotheses`, paper ids for `screen`. */
  droppable?: string[];
  /** Held-back ideas the person may keep despite their objection (`hypotheses` gates). */
  keepable?: string[];
}

export interface GateAnswer {
  option_id: string;
  note?: string;
  /** Ids the person dropped. Only for `hypotheses` and `screen` gates. */
  dropped?: string[];
  /** Held-back ideas the person keeps. Only for `hypotheses` gates. */
  kept?: string[];
}

export type FigureData =
  | {
      kind: "bars";
      y_label: string;
      y_min: number;
      y_max: number;
      bars: { label: string; value: number; highlight?: boolean }[];
    }
  | {
      kind: "forest";
      x_min: number;
      x_max: number;
      rows: {
        hypothesis_id: string;
        label: string;
        estimate: number;
        ci_low: number;
        ci_high: number;
        verdict: Verdict;
      }[];
    }
  | {
      kind: "paths";
      exposure: string;
      outcome: string;
      direct: { label: string; tested: boolean };
      mediators: { name: string; label: string; tested: boolean; clear: boolean }[];
    };

export interface Figure {
  id: number;
  title: string;
  caption: string;
  data: FigureData;
}

export interface ReportRow {
  hypothesis_id: string;
  statement: string;
  status: "result" | "crashed" | "dropped";
  result_key?: string;
  round?: number;
  estimate?: number;
  ci_low?: number;
  ci_high?: number;
  verdict?: Verdict;
}

export interface PaperSectionPlan {
  id: string;
  title: string;
  numbered: boolean;
  /** What the section will use from the report. */
  uses: string;
}

/** A piece of streamed paper text. Numbers are never plain text: they always carry their source. */
export type PaperPiece =
  | { kind: "text"; text: string }
  | { kind: "number"; value: string; source: string }
  | { kind: "cite"; refs: number[] }
  | { kind: "figure_ref"; figure: number }
  /** A number typed without a source. Rule 1 blocks publishing until it is replaced. */
  | { kind: "typed_number"; span_id: string; text: string }
  /** Text the reviewer may comment on or the reporter may revise later. */
  | { kind: "span"; span_id: string; text: string };

export interface PaperSource {
  /** `result:<key>`, `figure:<n>`, `table:<n>`, `ref:<n>` or a data fact such as `data:rows_v2`. */
  id: string;
  label: string;
  detail: string;
}

export type PaperBlock =
  | { id: string; kind: "paragraph" }
  | { id: string; kind: "figure"; figure: number }
  | { id: string; kind: "table"; title: string; caption: string; header: string[]; rows: string[][] }
  | { id: string; kind: "references"; items: { citation: string; doi: string }[] }
  | { id: string; kind: "appendix"; rows: ReportRow[] };

// ---------- events ----------

interface EventBase<T extends string, P> {
  /** Strictly increasing per run, starting at 1. Used as the SSE event id. */
  seq: number;
  run_id: string;
  /** ISO 8601 time the backend recorded the event. */
  ts: string;
  type: T;
  /** Stage the event belongs to; content events always carry it. */
  stage_key?: string;
  actor?: AgentRole;
  payload: P;
}

export type RunEvent =
  /**
   * `topic` is what the person typed; `domains` are the fields they kept. Sub-questions are derived in `scope`.
   * `dataset` is absent for a run that starts from the topic alone.
   */
  | EventBase<"run.started", { mode: ReviewMode; topic: string; domains: string[]; dataset?: DatasetRef }>
  | EventBase<"run.plan", { stages: PlannedStage[] }>
  | EventBase<"run.status", { status: RunLifecycle; reason?: string }>
  /** `paper_title` is absent when the run ends before the paper, such as right after hypotheses (stage 8). */
  | EventBase<"run.completed", { paper_title?: string }>
  | EventBase<"stage.started", { plan: StagePlan }>
  | EventBase<"stage.completed", { summary: string }>
  | EventBase<"step.started", { step_id: string }>
  | EventBase<"step.completed", { step_id: string }>
  /** Streamed narration. Deltas with the same `message_id` append; `done` closes the message. */
  | EventBase<"agent.message", { message_id: string; delta: string; done?: boolean }>
  | EventBase<"rule.checked", { rule: RuleId; state: "pass" | "hit"; detail?: string }>
  // data
  | EventBase<"data.sample", { file: string; columns: DataColumn[]; rows: string[][]; total_rows: number }>
  | EventBase<"data.column_profiled", { column: string; clean_share: number }>
  | EventBase<"data.issue_found", { issue: DataIssue }>
  | EventBase<
      "data.issue_fixed",
      {
        issue_id: string;
        fix: string;
        method: string;
        replacements: { row: number; column: string; value: string }[];
        removed_rows: number[];
      }
    >
  | EventBase<"data.version_created", { version: number; rows: number; removed: number; fixes: number; sha256: string }>
  | EventBase<"skills.loaded", { skills: Skill[] }>
  // scope: stages 1 and 2
  | EventBase<"scope.profile", { domains: string[]; compute: ComputeProfile }>
  | EventBase<"scope.goal", { field: GoalField; label: string; value: string }>
  | EventBase<"scope.estimate", { estimate: Estimate }>
  | EventBase<"scope.adjusted", { field: GoalField; from: string; to: string; reason: string }>
  /** The goal passed the PI's check and was saved; stage 2 may start. `at` is ISO 8601 UTC. */
  | EventBase<"scope.approved", { at: string; note: string }>
  | EventBase<"problem.subquestion", { sub_question: SubQuestion }>
  | EventBase<"problem.risk", { risk: ScopeRisk }>
  | EventBase<
      "topic.evaluated",
      {
        scores: TopicScores;
        /** One sentence per score: what in the topic or goal earned it. */
        reasons?: Partial<Record<keyof TopicScores, string>>;
        overall: number;
        threshold: number;
        advice: string;
      }
    >
  // search: stages 3 and 4
  | EventBase<"search.strategy", { strategy: SearchStrategy }>
  | EventBase<"search.query", { query: SearchQuery }>
  | EventBase<"search.sources", { sources: LiteratureSource[]; delay_ms: number }>
  | EventBase<"literature.request", { query_id: string; source_id: string }>
  | EventBase<"literature.batch", { query_id: string; source_id: string; hits: number }>
  /** A paper found in several sources. `kept` is the source whose record survives: DOI first, then most citations. */
  | EventBase<
      "literature.merged",
      /** `kept_record` is the record_id of the kept record, needed when one source has two records. */
      { title: string; records: SourceRecord[]; kept: string; kept_record?: string }
    >
  | EventBase<
      "literature.collected",
      {
        raw: number;
        unique: number;
        duplicates: number;
        /** Queries added during the search from the topic's words: not in the plan, so not in its grid. */
        expansion?: { queries: number; hits: number };
        /** Duplicates that were the same record returned to another query; null when unknown. */
        repeats?: number | null;
        files: { name: string; detail: string }[];
        /** ISO 8601 UTC. */
        collected_at: string;
      }
    >
  // screen: stage 5
  | EventBase<
      "screen.criteria",
      { rules: string[]; relevance_min: number; quality_min: number /** Papers to screen. */; candidates?: number }
    >
  | EventBase<"screen.scored", { points: ScreenPoint[] }>
  | EventBase<"screen.rejected", { paper: RejectedPaper }>
  | EventBase<"screen.kept", { paper: ShortlistPaper }>
  // read: stage 6
  | EventBase<"card.extracted", { card: KnowledgeCard }>
  | EventBase<"estimate.checked", { check: EstimateCheck }>
  // synthesize: stage 7
  | EventBase<"synthesis.cluster", { cluster: Cluster }>
  | EventBase<"synthesis.set_aside", { aside: SetAside }>
  | EventBase<"synthesis.tension", { tension: Tension }>
  | EventBase<"synthesis.gap", { gap: Gap }>
  /** The field at a glance, written once the clusters are set. */
  | EventBase<"synthesis.overview", { text: string }>
  | EventBase<"synthesis.ranked", { ranking: Opportunity[] }>
  // hypothesize: stage 8
  | EventBase<"debate.turn", { turn: DebateTurn }>
  | EventBase<"hypothesis.drafted", { hypothesis: Hypothesis }>
  | EventBase<"hypothesis.checked", { hypothesis_id: string; novelty: NoveltyCheck; feasibility: FeasibilityCheck }>
  | EventBase<"hypothesis.selected", { hypothesis_id: string; override_note?: string }>
  | EventBase<
      "idea.set_aside",
      {
        idea_id: string;
        /** `held_back`: a fatal objection stands; `not_used`: no objection stands, the set left it out. */
        kind?: "held_back" | "not_used";
        statement: string;
        reason: string;
      }
    >
  // map: after the hypotheses
  | EventBase<"map.node", { node: MapNode }>
  | EventBase<"map.edge", { edge: MapEdge }>
  | EventBase<"canvas.piece", { piece: CanvasPiece }>
  // experiment: stage 9 onwards
  | EventBase<"plan.locked", { plan_id: string; hypotheses: Hypothesis[]; design: TestDesign }>
  | EventBase<"experiment.hypotheses", { hypotheses: Hypothesis[] }>
  | EventBase<"node.created", { node: SearchNode }>
  | EventBase<"node.code", { node_id: string; lines: CodeLine[] }>
  | EventBase<"node.run_started", { node_id: string }>
  | EventBase<"node.log", { node_id: string; level: LogLevel; text: string }>
  | EventBase<"node.finished", { node_id: string; outcome: NodeOutcome; error?: string }>
  | EventBase<"node.scored", { node_id: string; score: number }>
  | EventBase<"result.recorded", { result: RecordedResult; best_node_id: string | null }>
  // interpret
  | EventBase<"evidence.row", { hypothesis: Hypothesis; result: RecordedResult }>
  | EventBase<"verdict.written", { hypothesis_id: string; verdict: Verdict; reason: string }>
  | EventBase<"verdict.checked", { hypothesis_id: string; objection?: string }>
  | EventBase<
      "decision.recommended",
      { recommendation: Decision; rationale: string; go_backs_used: number; go_backs_allowed: number }
    >
  | EventBase<"decision.committed", { decision: Decision; by: "pi" | "you"; note?: string }>
  // report
  | EventBase<"report.row", { row: ReportRow }>
  | EventBase<"report.figure", { figure: Figure }>
  | EventBase<"report.note", { hypothesis_id: string; note: string; objection?: string }>
  | EventBase<"report.repro", { items: { label: string; value: string }[] }>
  // write
  | EventBase<
      "paper.outline",
      {
        title: string;
        authors: string;
        sections: PaperSectionPlan[];
        /** Everything in the report the paper may quote. Number pieces and blocks refer to these ids. */
        sources: PaperSource[];
      }
    >
  | EventBase<"paper.section_started", { section_id: string }>
  | EventBase<"paper.block", { section_id: string; block: PaperBlock }>
  | EventBase<"paper.delta", { block_id: string; piece: PaperPiece }>
  | EventBase<"paper.section_done", { section_id: string }>
  | EventBase<"paper.checked", { numbers: number; figures: number }>
  | EventBase<"paper.blocked", { span_id: string; text: string }>
  | EventBase<"paper.number_fixed", { span_id: string; value: string; source: string }>
  | EventBase<"review.comment", { comment_id: string; span_id: string; text: string }>
  | EventBase<"review.revision", { comment_id: string; span_id: string; from: string; to: string }>
  | EventBase<"review.accepted", Record<string, never>>
  | EventBase<"draft.scored", { draft: number; score: number; note: string; best: boolean }>
  | EventBase<"paper.typeset", Record<string, never>>
  // review stops
  | EventBase<"gate.opened", { gate: Gate }>
  | EventBase<"gate.resolved", { gate_id: string; answer: GateAnswer; summary: string }>;

export type RunEventType = RunEvent["type"];
export type RunEventOf<T extends RunEventType> = Extract<RunEvent, { type: T }>;

/** What the person gives when starting a run. In the real API this is the body of `POST …/runs`. */
export interface RunInput {
  topic: string;
  domains: string[];
}

/** Commands the client sends back. In the real API each is a POST under the run. */
export interface RunCommands {
  /** A promise that resolves to false when the answer was not recorded. */
  answerGate(gateId: string, answer: GateAnswer): void | Promise<boolean>;
  pause(): void;
  resume(): void;
}
