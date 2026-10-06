// Event stream contract for a research run.
//
// The backend relays Popper's progress as an ordered stream of events
// (`GET /projects/{projectId}/runs/{runId}/events`, Server-Sent Events, resumable with `Last-Event-ID`).
// The client rebuilds everything it shows from these events with `applyRunEvent`, so a mock stream
// and the real stream must emit exactly the same shapes.

export type RunStage = "data" | "understand" | "hypothesize" | "experiment" | "interpret" | "report" | "write";

export type AgentRole =
  | "steward"
  | "theorist"
  | "knowledge"
  | "methodologist"
  | "skeptic"
  | "pi"
  | "interpreter"
  | "reporter"
  | "code";

/** How often the run stops for the person who started it. */
export type ReviewMode = "auto" | "light" | "copilot" | "full";

export type GateKind = "framing" | "hypotheses" | "decision" | "report" | "publish";

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
 * The four rules Popper never bends.
 * 1: every number in the paper comes from the results file.
 * 2: every analysis reports the number its plan promised.
 * 3: data versions and records are never overwritten.
 * 4: the test plan is locked before any code runs.
 */
export type RuleId = 1 | 2 | 3 | 4;

// ---------- shared shapes ----------

export interface StagePlanStep {
  id: string;
  title: string;
  actor: AgentRole;
  /** One or two plain sentences on what happens in this step. */
  explain: string;
  /** Present when this step stops for the person. */
  gate?: GateKind;
}

/** A stage as the backend plans it. Future stages appear in `run.plan` before they start. */
export interface PlannedStage {
  key: string;
  stage: RunStage;
  round?: number;
  round_kind?: RoundKind;
  title: string;
  has_gate: boolean;
}

export interface StagePlan extends PlannedStage {
  purpose: string;
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

export interface FrameSlot {
  slot: "outcome" | "exposure" | "population" | "follow_up" | "unit" | "out_of_reach";
  label: string;
  value: string;
  note: string;
  /** The words of the question this slot came from, when there are any. */
  phrase?: string;
}

export interface LiteraturePaper {
  citation: string;
  claim: string;
  doi: string;
}

export interface IdeaSource {
  kind: "pattern" | "gap" | "literature" | "data" | "question";
  /** Short reference such as `P1`, `Gap 2` or `Okano et al., 2019`. */
  ref: string;
  text: string;
}

export interface Idea {
  id: string;
  statement: string;
  source: IdeaSource;
}

export interface IdeaReview {
  testable: boolean;
  /** Columns the test would use, when testable. */
  columns?: string[];
  /** What the data lacks, when not testable. */
  missing?: string;
  risk: Risk;
  objection: string;
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
  /** Hypotheses the person may drop before approving. Only for `hypotheses` gates. */
  droppable?: string[];
}

export interface GateAnswer {
  option_id: string;
  note?: string;
  /** Hypothesis ids the person dropped. Only for `hypotheses` gates. */
  dropped?: string[];
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
  | EventBase<"run.started", { mode: ReviewMode; question: string; dataset: DatasetRef; context_version: number }>
  | EventBase<"run.plan", { stages: PlannedStage[] }>
  | EventBase<"run.status", { status: RunLifecycle; reason?: string }>
  | EventBase<"run.completed", { paper_title: string }>
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
  // understand
  | EventBase<"understand.frame", { slot: FrameSlot }>
  | EventBase<"understand.chart", { title: string; note: string; bars: { label: string; value: number }[] }>
  | EventBase<"understand.pattern", { id: string; text: string }>
  | EventBase<"literature.searched", { found: number; relevant: number; used: number }>
  | EventBase<"literature.paper", { paper: LiteraturePaper }>
  | EventBase<"literature.gap", { id: string; text: string }>
  // hypothesize
  | EventBase<"idea.proposed", { idea: Idea }>
  | EventBase<"idea.reviewed", { idea_id: string; review: IdeaReview }>
  | EventBase<"hypothesis.selected", { idea_id: string; hypothesis: Hypothesis; override_note?: string }>
  | EventBase<"idea.set_aside", { idea_id: string; reason: string }>
  | EventBase<"plan.locked", { plan_id: string; hypotheses: Hypothesis[] }>
  // experiment
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

/** Commands the client sends back. In the real API each is a POST under the run. */
export interface RunCommands {
  answerGate(gateId: string, answer: GateAnswer): void;
  pause(): void;
  resume(): void;
}
