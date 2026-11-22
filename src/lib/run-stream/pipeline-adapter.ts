// Pipeline runs: the Platform (logos) runs a research run as stages on engines (`hypothesis`) and relays each
// engine's events in one envelope (`class`, `step_key`, `phase`, `stage_run_id`). The engine's content events
// (`<stage_key>.<kind>`, `logos_contract.activity`) carry the payloads the scenes draw; its progress events
// (`<stage_key>.progress`) become the live narration; the run, stage, step and gate events do not map one to one. This
// adapter turns the envelopes into the run studio's events, so the reducer and every scene work as they do for Popper.

import { type ClaimScope, claimScopeSummary, updateClaimScope } from "./claim-scope";
import type {
  AgentRole,
  EligibilityDecision,
  Gate,
  GateAnswer,
  GateKind,
  PiAdvice,
  PlannedStage,
  ReviewFinding,
  ReviewMode,
  RoundKind,
  RunEvent,
  RunStage,
  StagePlan,
  StagePlanStep,
} from "./contract";
import { EXECUTION_STAGE, executionArtifacts, executionCheckStep, executionSteps } from "./execution";
import {
  DESIGN_LOCK,
  DESIGN_STAGE,
  type DesignPublication,
  designAgent,
  designArtifact,
  designCheck,
  designLabel,
  designRecord,
  designText,
  designTool,
} from "./experiment-design";
import { hypothesisWork } from "./hypothesis-work";
import { type PublicationRef, type PublishedHypotheses, publishedMap } from "./published-hypotheses";

/** A stored event of a pipeline run, as the backend sends it. */
export interface PipelineEnvelope {
  seq: number;
  run_id: string;
  ts: string;
  type: string;
  stage_key?: string | null;
  stage_run_id?: string | null;
  step_key?: string | null;
  phase?: string | null;
  actor?: string | null;
  /** A line the backend wrote about the event, such as the PI's reasoning for a decision. */
  summary?: string | null;
  payload: Record<string, unknown>;
}

/** Where an answer goes: a gate of the engine, or the accept of a finished stage. */
export type GateRoute =
  | {
      to: "gate";
      stageRunId: string;
      kind: "question" | "artifact_review";
      engineGateId?: string;
      /** For a hypotheses gate: the set under review, and the reviewer's findings as the engine sent them. */
      artifactId?: string;
      findings?: Record<string, unknown>[];
    }
  | { to: "accept"; stageRunId: string; hypothesisIds?: string[]; stageKey?: typeof DESIGN_STAGE }
  /** The PI's charter: endorse its draft, or write it yourself; `retry` asks the PI again after it failed. */
  | { to: "charter"; consultationId: string };

type Step = Omit<StagePlanStep, "id">;

// The steps the run studio shows for the engine's work, plus the independent review and the accept.
const STEPS: Record<string, Step> = {
  design_work: {
    title: "Repair the contract items",
    actor: "methodologist",
    artifact: "Analysis plan",
    explain: "Define the estimands, study protocols, models and decision rules for the accepted hypotheses.",
  },
  design_review: {
    title: "Review and hand off",
    actor: "reviewer",
    artifact: "Pre-registration",
    explain: "Check the plan, record open findings and publish the design.",
  },
  design_accept: {
    title: "Accept the analysis plan",
    actor: "pi",
    gate: "accept",
    explain: "Pass the analysis plan and its lock to Execution.",
  },
  ...Object.fromEntries(executionSteps.map(({ id, ...step }) => [id, step])),
  charter: {
    title: "Draft the plan",
    actor: "pi",
    pipeline_stage: 1,
    gate: "charter",
    artifact: "Charter",
    explain: "The PI drafts the question, the scope and the criteria every later stage is judged by.",
  },
  goal: {
    title: "Set the goal",
    actor: "strategist",
    pipeline_stage: 1,
    artifact: "Research goal",
    explain: "Writes the goal: problem, objective, scope and success criteria.",
  },
  decompose: {
    title: "Split it into sub-questions",
    actor: "strategist",
    pipeline_stage: 2,
    artifact: "Sub-question tree",
    explain: "Prioritised sub-questions, each linked to the goal, with their risks.",
  },
  evaluate: {
    title: "Rate the topic",
    actor: "pi",
    pipeline_stage: 2,
    artifact: "Topic score",
    explain: "Scores novelty, specificity and feasibility before any search starts.",
  },
  strategy: {
    title: "Plan the searches",
    actor: "librarian",
    pipeline_stage: 3,
    artifact: "Search plan",
    explain: "Search queries for the research question.",
  },
  collect: {
    title: "Collect candidates",
    actor: "librarian",
    pipeline_stage: 4,
    artifact: "Candidate list",
    explain: "Send queries to configured sources and collect the unique records.",
  },
  score: {
    title: "Screen candidate papers",
    actor: "librarian",
    pipeline_stage: 5,
    artifact: "Screened scores",
    explain: "Apply the screening criteria to the selected papers.",
  },
  reject: {
    title: "Record exclusions",
    actor: "librarian",
    pipeline_stage: 5,
    explain: "Record why a screened paper was excluded.",
  },
  shortlist: {
    title: "Keep the shortlist",
    actor: "librarian",
    pipeline_stage: 5,
    artifact: "Shortlist",
    explain: "Keep the papers that meet the review criteria.",
  },
  screen_gate: {
    title: "Human check: shortlist",
    actor: "pi",
    pipeline_stage: 5,
    gate: "screen",
    explain: "Approve the papers, remove ones you do not trust, or search again.",
  },
  extract: {
    title: "Extract a card per paper",
    actor: "librarian",
    pipeline_stage: 6,
    artifact: "Knowledge cards",
    explain: "Problem, method, data, metrics, findings and limitations from the abstract.",
  },
  cluster: {
    title: "Group into schools of thought",
    actor: "theorist",
    pipeline_stage: 7,
    explain: "Cards are grouped by approach.",
  },
  overview: { title: "Sum up the field", actor: "theorist", pipeline_stage: 7, explain: "Where the evidence stands." },
  tension: {
    title: "Find where they disagree",
    actor: "theorist",
    pipeline_stage: 7,
    explain: "Where two groups pull in different directions.",
  },
  gaps: {
    title: "Name the gaps",
    actor: "theorist",
    pipeline_stage: 7,
    artifact: "Gap map",
    explain: "Each gap is traced to the cards that point to it.",
  },
  rank: { title: "Rank the opportunities", actor: "theorist", pipeline_stage: 7, explain: "Gaps ordered by priority." },
  debate: {
    title: "Compare the perspectives",
    actor: "theorist",
    pipeline_stage: 8,
    artifact: "Perspectives",
    explain:
      "Each perspective proposes hypotheses; in debate rounds they challenge each other, answer every challenge, and review the answers.",
  },
  write: {
    title: "Write each hypothesis",
    actor: "theorist",
    pipeline_stage: 8,
    artifact: "Hypotheses",
    explain: "Statement, gap, evidence, prediction and the result that would falsify it.",
  },
  check: {
    title: "Check novelty",
    actor: "librarian",
    pipeline_stage: 8,
    artifact: "Novelty check",
    explain: "Searches the literature for each prediction and judges whether a paper already tests it.",
  },
  select: { title: "Pick the set", actor: "pi", pipeline_stage: 8, explain: "The final hypotheses of this run." },
  review: {
    title: "Independent review",
    actor: "reviewer",
    pipeline_stage: 8,
    artifact: "Review findings",
    explain: "A second model, separate from the writers, checks each hypothesis and reports what must change.",
  },
  hypotheses_gate: {
    title: "Human check: hypotheses",
    actor: "pi",
    pipeline_stage: 8,
    gate: "hypotheses",
    explain: "Read the hypotheses with their review findings and map, then approve the set or send it back.",
  },
  questions: {
    title: "Lay out the questions",
    actor: "strategist",
    pipeline_stage: 9,
    explain: "Your topic and the sub-questions it decomposes into, from stages 1 and 2.",
  },
  foundation: {
    title: "Lay the research foundation",
    actor: "librarian",
    pipeline_stage: 9,
    explain: "The findings from stage 6, the claims they support or contradict, and the gaps from stage 7.",
  },
  reasoning: {
    title: "Tie in the hypotheses",
    actor: "theorist",
    pipeline_stage: 9,
    artifact: "Semantic graph",
    explain:
      "Each hypothesis from stage 8: the sub-question it answers, the gap it addresses, and the claims that give it a rationale or challenge it.",
  },
  contribution: {
    title: "State what each would contribute",
    actor: "theorist",
    pipeline_stage: 9,
    explain: "What each hypothesis would add if it holds. Expected only: nothing has been tested.",
  },
  canvas: {
    title: "Fill the research canvas",
    actor: "reporter",
    pipeline_stage: 9,
    artifact: "Research canvas",
    explain:
      "The nine pieces of the AMJ Management Research Canvas, filled from the run. Findings stay open until something is tested.",
  },
  accept: {
    title: "Accept the hypotheses",
    actor: "pi",
    pipeline_stage: 9,
    gate: "accept",
    explain: "Pick the hypotheses that go forward; the run ends once you accept.",
  },
};

interface Screen {
  key: string;
  stage: RunStage;
  round?: number;
  round_kind?: RoundKind;
  title: string;
  pipeline: number[];
  cast: AgentRole[];
  purpose: string;
  reads: string[];
  steps: string[];
}

// The screens of a hypothesis stage, keyed as a Popper run keys them.
const SCREENS: Screen[] = [
  {
    key: "scope",
    stage: "scope",
    title: "Scope the question",
    pipeline: [1, 2],
    cast: ["strategist", "pi"],
    purpose:
      "Your topic becomes a research goal and a tree of prioritised sub-questions, and the topic is rated before any search starts.",
    reads: ["Your topic", "Your fields"],
    steps: ["charter", "goal", "decompose", "evaluate"],
  },
  {
    key: "search",
    stage: "search",
    title: "Search the literature",
    pipeline: [3, 4],
    cast: ["librarian"],
    purpose:
      "Queries derived from the sub-questions go to the configured scholarly sources and everything found is merged into one deduplicated list.",
    reads: ["Sub-question tree"],
    steps: ["strategy", "collect"],
  },
  {
    key: "screen",
    stage: "screen",
    title: "Screen the papers",
    pipeline: [5],
    cast: ["librarian", "pi"],
    purpose: "Apply the eligibility criteria to the selected papers and record why papers are included or excluded.",
    reads: ["Candidate list", "Sub-question tree"],
    steps: ["score", "reject", "shortlist", "screen_gate"],
  },
  {
    key: "read",
    stage: "read",
    title: "Read and extract",
    pipeline: [6],
    cast: ["librarian"],
    purpose: "Each shortlisted paper becomes one knowledge card; fields the abstract does not support stay empty.",
    reads: ["Shortlist"],
    steps: ["extract"],
  },
  {
    key: "synthesize",
    stage: "synthesize",
    title: "Find the gaps",
    pipeline: [7],
    cast: ["theorist"],
    purpose: "Cards are grouped into schools of thought and research gaps are traced back to the cards behind them.",
    reads: ["Knowledge cards", "Sub-question tree"],
    steps: ["cluster", "overview", "tension", "gaps", "rank"],
  },
  {
    key: "r1-hypothesize",
    stage: "hypothesize",
    title: "Hypothesize",
    pipeline: [8],
    cast: ["theorist", "methodologist", "skeptic", "librarian", "reviewer", "pi"],
    purpose:
      "Several perspectives propose hypotheses; the final set links each one to a gap, to evidence and to the result that would prove it wrong. An independent reviewer checks the set, then each prediction is checked against the literature.",
    reads: ["Gap map", "Shortlist"],
    steps: ["debate", "write", "select", "review", "check"],
  },
  {
    key: "map",
    stage: "map",
    title: "Map the argument",
    pipeline: [9],
    cast: ["strategist", "librarian", "theorist", "reporter"],
    purpose:
      "Everything the run found is drawn as one semantic graph, from the evidence to what each hypothesis would contribute, and laid out on the nine pieces of a research canvas.",
    reads: ["Sub-question tree", "Knowledge cards", "Gap map", "Hypotheses"],
    steps: ["questions", "foundation", "reasoning", "contribution", "canvas", "hypotheses_gate", "accept"],
  },
];

const DESIGN: Screen = {
  key: DESIGN_STAGE,
  stage: "experiment",
  title: "Experiment design",
  pipeline: [],
  cast: ["methodologist", "reviewer"],
  purpose: "Turn the accepted hypotheses into a study protocol and analysis plan before looking at results.",
  reads: ["Accepted hypotheses", "Dataset snapshot"],
  steps: ["design_work", "design_review", "design_accept"],
};

const EXECUTION: Screen = {
  key: EXECUTION_STAGE,
  stage: "interpret",
  title: "Execution",
  pipeline: [],
  cast: ["code", "reviewer", "pi"],
  purpose: "Run the analyses registered in the accepted experiment design.",
  reads: ["Analysis plan", "Plan lock", "Dataset snapshot"],
  steps: executionSteps.map(({ id }) => id),
};

/**
 * The engine's steps (`step_key`) and the screen each one starts. `verify` checks novelty (the hypotheses screen) and
 * then draws the argument map (the map screen), so its content picks the screen instead.
 */
const SCREEN_OF: Record<string, string> = {
  understand: "scope",
  search: "search",
  screen: "screen",
  extract: "read",
  synthesize: "synthesize",
  // Each round of hypotheses has its own screen, `r1-hypothesize`, `r2-hypothesize`…
  hypothesize: "hypothesize",
  critique: "hypothesize",
  lock: "map",
};

/** The content kinds of the hypothesis engine (`logos_contract.activity.hypothesis`). */
const CONTENT = new Set([
  "scope.goal",
  "problem.subquestion",
  "problem.risk",
  "topic.evaluated",
  "search.strategy",
  "search.query",
  "search.sources",
  "literature.request",
  "literature.batch",
  "literature.merged",
  "literature.collected",
  "screen.criteria",
  "screen.scored",
  "screen.rejected",
  "screen.kept",
  "screen.eligibility",
  "screen.review_progress",
  "card.extracted",
  "synthesis.cluster",
  "synthesis.set_aside",
  "synthesis.overview",
  "synthesis.tension",
  "synthesis.gap",
  "synthesis.ranked",
  "debate.turn",
  "hypothesis.drafted",
  "idea.set_aside",
  "hypothesis.selected",
  "hypothesis.checked",
  "rule.checked",
  "map.node",
  "map.edge",
  "canvas.piece",
]);

/** Withdraws the content of one scope: the engine is doing that work again. */
const RESET = "content.reset";

/** The screen that shows each content scope (a stage of the engine's science). */
const SCOPE_SCREEN: Record<string, string> = {
  "stage-01": "scope",
  "stage-02": "scope",
  "stage-03": "search",
  "stage-04": "search",
  "stage-05": "screen",
  "stage-06": "read",
  "stage-07": "synthesize",
  "stage-08": "hypothesize",
  "stage-09": "map",
};

/** The step each progress event of the engine narrates. */
const PROGRESS_STEP: Record<string, string> = {
  queries: "collect",
  query: "collect",
  screen_plan: "score",
  screen_batch: "score",
  cards_plan: "extract",
  card: "extract",
  perspectives_plan: "debate",
  perspective: "debate",
  critique: "debate",
  review: "debate",
  judged: "debate",
  merge: "write",
  novelty: "check",
};

/** The step each of the engine's nine science stages starts, and what is said while its model works. */
const STARTED: Record<number, { step: string; text: string }> = {
  1: { step: "goal", text: "Turning your topic into a research goal: problem, objective, scope and success." },
  2: { step: "decompose", text: "Splitting the goal into sub-questions and noting the risks of each." },
  3: { step: "strategy", text: "Planning search angles and short queries for each sub-question." },
  4: { step: "collect", text: "Sending the queries to the literature sources." },
  5: { step: "score", text: "Scoring every candidate for relevance and quality." },
  6: { step: "extract", text: "Reading the shortlisted papers, one knowledge card each." },
  7: { step: "cluster", text: "Grouping the cards into schools of thought to find the gaps." },
  8: { step: "debate", text: "The perspectives are reading the gaps to propose hypotheses." },
  9: {
    step: "questions",
    text: "Drawing the argument map: the questions, the foundation, the reasoning and the contribution.",
  },
};

/** The agent who speaks for each perspective of the debate (prompt domains name them differently). */
const PERSPECTIVE: Record<string, AgentRole> = {
  innovator: "theorist",
  pragmatist: "methodologist",
  contrarian: "skeptic",
  theorist: "theorist",
  phenomenologist: "methodologist",
  experimentalist: "skeptic",
  model_builder: "theorist",
  fba_analyst: "methodologist",
};

/**
 * Content that starts a step. Narration starts steps too (its `message_id` ends with the step id), so content that
 * also comes during another step, such as papers rejected while the scores come in, starts none.
 */
const OPENS: Record<string, string> = {
  "scope.goal": "goal",
  "problem.subquestion": "decompose",
  "topic.evaluated": "evaluate",
  "search.strategy": "strategy",
  "literature.request": "collect",
  "literature.batch": "collect",
  "screen.criteria": "score",
  "screen.scored": "score",
  "screen.kept": "shortlist",
  "screen.eligibility": "score",
  "screen.review_progress": "score",
  "card.extracted": "extract",
  "synthesis.cluster": "cluster",
  "synthesis.overview": "overview",
  "synthesis.tension": "tension",
  "synthesis.gap": "gaps",
  "synthesis.ranked": "rank",
  "debate.turn": "debate",
  "hypothesis.drafted": "write",
  "hypothesis.checked": "check",
  "hypothesis.selected": "select",
  "review.finding": "review",
  "canvas.piece": "canvas",
};

/** The map step that draws each kind of node and relation (idea2hypothesis `platform_events._MAP_STEP`). */
const MAP_STEP: Record<string, string> = {
  question: "questions",
  decomposes_into: "questions",
  evidence: "foundation",
  claim: "foundation",
  gap: "foundation",
  supports: "foundation",
  contradicts: "foundation",
  motivates: "foundation",
  hypothesis: "reasoning",
  assumption: "reasoning",
  proposes_answer_to: "reasoning",
  provides_rationale_for: "reasoning",
  addresses: "reasoning",
  depends_on: "reasoning",
  contribution: "contribution",
  informs: "contribution",
  targets: "contribution",
};

const ROLES = new Set<string>([
  "steward",
  "strategist",
  "librarian",
  "theorist",
  "methodologist",
  "skeptic",
  "pi",
  "interpreter",
  "reporter",
  "reviewer",
  "code",
]);

/** Gates of a pipeline run: the shortlist, the hypotheses, then the accept. */
const STOPS: GateKind[] = ["charter", "screen", "hypotheses", "accept"];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The first stop among a screen's steps, if it has one. */
const firstGate = (steps: string[]) => steps.map((id) => STEPS[id].gate).find(Boolean);

function stagePlan(screen: Screen): StagePlan {
  return {
    key: screen.key,
    stage: screen.stage,
    ...(screen.round ? { round: screen.round, round_kind: screen.round_kind } : {}),
    title: screen.title,
    has_gate: screen.steps.some((id) => STEPS[id].gate),
    ...(firstGate(screen.steps) ? { gate: firstGate(screen.steps) } : {}),
    pipeline: screen.pipeline,
    purpose: screen.purpose,
    reads: screen.reads,
    cast: screen.cast,
    steps: screen.steps.map((id) => ({ id, ...STEPS[id] })),
  };
}

function planned(screen: Screen): PlannedStage {
  const { purpose: _purpose, reads: _reads, cast: _cast, steps: _steps, ...rest } = stagePlan(screen);
  return rest;
}

/**
 * A finding of the engine's own review (`<stage_key>.review.finding`) in the Platform's shape, numbered as the engine
 * numbers it in the review it publishes: `F<round>-<n>`, anchored to one field of one hypothesis or to the whole set.
 */
function reviewFinding(raw: Record<string, unknown>, n: number, artifactId?: string): Record<string, unknown> {
  const hypothesis = raw.hypothesis_id ? String(raw.hypothesis_id) : null;
  return {
    finding_id: `F${Number(raw.round ?? 1)}-${n}`,
    anchor: {
      artifact_id: artifactId ?? null,
      locator: hypothesis ? `item:${hypothesis}/${String(raw.field ?? "")}` : "document:hypotheses",
    },
    severity: raw.severity ?? "minor",
    kind: raw.kind ?? "fix",
    category: raw.category ?? "other",
    issue: String(raw.issue ?? ""),
    ...(raw.suggestion ? { suggestion: String(raw.suggestion) } : {}),
    author: "reviewer",
    evidence_refs: [],
  };
}

/** What a progress event of the engine says while the work goes on, or null when it says nothing new. */
function narration(kind: string, p: Record<string, unknown>, sources: string[]): string | null {
  const n = (key: string) => Number(p[key] ?? 0);
  switch (kind) {
    case "queries": {
      const total = n("planned") + n("expanded");
      const names =
        sources.length > 2 ? `${sources.slice(0, -1).join(", ")} and ${sources.at(-1)}` : sources.join(" and ");
      return `Sending ${plural(total, "query", "queries")} to ${names || "the sources"}.`;
    }
    case "query": {
      const hits = Object.values((p.hits ?? {}) as Record<string, number>).reduce((a, b) => a + Number(b), 0);
      const text = String(p.text ?? "");
      const short = text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text;
      return `Query ${n("index")} of ${n("total")}: “${short}”, ${plural(hits, "hit")} (${n("raw")} so far).`;
    }
    case "scout":
      return `Following the citations of ${plural(n("papers"), "paper")} for more candidates.`;
    case "screen_plan": {
      const aside = ((p.prefiltered ?? []) as unknown[]).length;
      return `Scoring ${plural(n("to_screen"), "paper")} in ${plural(n("batches"), "batch", "batches")} against the relevance and quality bars${aside ? `; ${plural(aside, "paper")} set aside before scoring` : ""}.`;
    }
    case "screen_batch": {
      const rows = (p.decisions ?? []) as { decision?: string }[];
      const clear = rows.filter((d) => d.decision === "kept").length;
      return `Batch ${n("index")} of ${n("total")} scored: ${clear} of ${rows.length} clear both bars.`;
    }
    case "cards_plan": {
      const cached = n("cached");
      return `Reading ${plural(n("total"), "abstract")}, one knowledge card each${cached ? ` (${cached} already read)` : ""}.`;
    }
    case "perspectives_plan": {
      const roles = ((p.roles ?? []) as string[]).map((r) => AGENT_NAME[PERSPECTIVE[r] ?? "theorist"]);
      return `${roles.length ? `The ${roles.join(", ")}` : "Each perspective"} ${roles.length === 1 ? "is" : "are"} proposing hypotheses from the gaps.`;
    }
    case "perspective":
    case "critique":
    case "review": {
      const who = AGENT_NAME[PERSPECTIVE[String(p.role)] ?? "theorist"];
      const round = n("round");
      if (kind === "critique") return `The ${who} challenged the other perspectives' hypotheses in round ${round}.`;
      if (kind === "review") return `The ${who} reviewed the answers to its challenges in round ${round}.`;
      return round ? `The ${who} answered the challenges in round ${round}.` : `The ${who} proposed its hypotheses.`;
    }
    case "judged":
      return "An independent reviewer model ranked the positions.";
    case "merge":
      return "Merging the positions into one set of hypotheses.";
    case "novelty":
      return `Searching the literature for each of the ${plural(n("hypotheses"), "hypothesis", "hypotheses")}.`;
    case "restart":
      return "Starting this step again.";
    default:
      return null;
  }
}

const AGENT_NAME: Record<string, string> = { theorist: "Theorist", methodologist: "Methodologist", skeptic: "Skeptic" };

/** A finding as the engine sends it, in the run studio's shape. */
function toFinding(raw: Record<string, unknown>): ReviewFinding {
  const anchor = (raw.anchor ?? {}) as { locator?: string };
  return {
    finding_id: String(raw.finding_id),
    locator: anchor.locator ?? "",
    severity: (raw.severity ?? "minor") as ReviewFinding["severity"],
    kind: (raw.kind ?? "fix") as ReviewFinding["kind"],
    category: String(raw.category ?? ""),
    issue: String(raw.issue ?? ""),
    ...(raw.suggestion ? { suggestion: String(raw.suggestion) } : {}),
    ...(raw.author === "researcher" || raw.author === "reviewer" ? { author: raw.author } : {}),
  };
}

/** What the run says about itself before its events: the topic, its fields and how often it stops. */
export interface PipelineRunInfo {
  topic: string;
  domains: string[];
  mode: ReviewMode;
  datasetFirst?: boolean;
  continuesToDesign?: boolean;
}

/** One content item as it was shown: the scenes' event and who said it. */
interface Shown {
  kind: string;
  payload: Record<string, unknown>;
  actor?: AgentRole;
}

/**
 * Turns a pipeline run's envelopes, in `seq` order, into run studio events. It keeps what it has seen (the screen and
 * step the run is on, the content of each scope for the summaries and redraws, the open gate), so one adapter follows
 * one run from its first event.
 */
export class PipelineAdapter {
  private started = false;
  private datasetAccepted = false;
  private claimScope?: ClaimScope;
  private screen: Screen | null = null;
  /** Index of the furthest step reached on this screen; steps only move forward. */
  private reached = -1;
  private step: string | null = null;
  private stageRun: string | null = null;
  private gate: {
    id: string;
    kind: GateKind;
    engineKind: "question" | "artifact_review" | null;
    stageKey?: string;
    stageRunId?: string;
    engineGateId?: string;
    options?: Gate["options"];
  } | null = null;
  private designStageRun?: string;
  private executionStageRun?: string;
  private designPublication?: PublicationRef;
  private designBlocked?: string;
  private designIds: string[] = [];
  private designAsked?: string;
  private designGateHistory = new Map<string, string>();
  private decision: Record<string, unknown> | null = null;
  private failed = false;
  private completed = false;
  /** Who settles the charter: you (Light), or the PI on its own (Auto). */
  private charterBy: "you" | "pi" = "pi";
  /** The set the stage published: without the hypotheses dropped at the last stop, with any idea kept there. */
  private published: string[] | null = null;
  private publication?: PublicationRef;
  private pendingPublication?: PublicationRef;
  private publishedDetails?: PublishedHypotheses;
  /** What the PI advised, by consultation kind (`charter`, `stage_outcome`). */
  private advice: Record<string, PiAdvice> = {};
  /** The round of hypotheses: each set sent back for revision starts the next one. */
  private round = 1;
  /** Comments sent back at the last hypotheses gate; the next round answers them. */
  private sent: ReviewFinding[] | null = null;
  /** Comments each round was sent back with, by round. */
  private sentBack: Record<number, { count: number; by: "you" | "reviewer" }> = {};
  /** How each round of hypotheses began: the first set, your revision, or the reviewer's. */
  private roundKinds: RoundKind[] = ["first"];
  /** The independent review just failed the set: the engine revises it before you see it. */
  private failedReview = false;
  /** This round's review: the findings in the Platform's shape, and the set they are about. */
  private review: { raw: Record<string, unknown>[]; artifactId?: string } = { raw: [] };
  /** Findings of each review round so far, to number the next one as the engine does. */
  private reviewed: Record<number, number> = {};
  /** What each content scope holds now, by item key: what the summaries count and a redraw shows again. */
  private shown = new Map<string, Map<string, Shown>>();
  /** The live narration line of the current step, if any. */
  private message: { id: string; step: string | null; actor?: AgentRole } | null = null;
  /** The card a progress event announced; the line names it once the card arrives. */
  private cardAt: { index: number; total: number } | null = null;
  private lastEnvelope = -1;
  private seq = 0;
  private out: RunEvent[] = [];
  private at: PipelineEnvelope | null = null;

  constructor(private readonly run: PipelineRunInfo) {}

  designToLoad() {
    return this.designPublication;
  }

  applyDesign(ref: PublicationRef, publication: DesignPublication): RunEvent[] {
    this.out = [];
    if (ref === this.designPublication) this.emit("design.updated", { publication }, undefined, DESIGN_STAGE);
    return this.out;
  }

  publicationToLoad(): PublicationRef | undefined {
    return this.pendingPublication;
  }

  applyPublication(ref: PublicationRef, publication?: PublishedHypotheses): RunEvent[] {
    this.out = [];
    if (ref !== this.pendingPublication) return this.out;
    this.pendingPublication = undefined;
    if (publication) {
      this.publishedDetails = publication;
      this.emit("hypothesis.published", { hypotheses: publication.hypotheses }, undefined, this.keyOf("hypothesize"));
      const question = this.claimScope?.protocol.question ?? this.claimScope?.claim?.question;
      this.emit("map.published", publishedMap(publication, question), undefined, "map");
      if (this.screen?.key === DESIGN_STAGE && !this.designPublication) {
        const hypotheses = publication.hypotheses.filter(
          (h) => !this.designIds.length || this.designIds.includes(h.id),
        );
        this.emit("design.updated", {
          hypotheses: hypotheses.map(({ id, statement, exposure, outcome }) => ({
            id,
            statement,
            inputExposure: exposure,
            inputOutcome: outcome,
          })),
        });
      }
    }
    if (this.gate?.kind === "accept" && this.gate.stageRunId === ref.stageRunId)
      this.emit("gate.opened", { gate: this.acceptGate(this.gate.id) }, "pi", "map");
    return this.out;
  }

  /**
   * A run can end with no event saying so, such as one abandoned before its first stage opened. Given how the run
   * ended, returns the events that close it; none when its events already did, or when none were shown.
   */
  end(status: "completed" | "failed" | "stopped", reason?: string | null): RunEvent[] {
    this.out = [];
    if (!this.started) return this.out;
    if (status !== "completed") this.fail(reason ?? "The run ended before it finished.", status === "stopped");
    else if (!this.completed) {
      this.completed = true;
      this.gate = null;
      this.emit("run.completed", {});
    }
    return this.out;
  }

  /** Where an answer to this gate goes, or null when the gate is not open. */
  route(gateId: string): GateRoute | null {
    if (this.gate?.kind === "charter" && this.gate.id === gateId) return { to: "charter", consultationId: gateId };
    if (!this.gate || this.gate.id !== gateId) return null;
    const stageRunId = this.gate.stageRunId ?? this.stageRun;
    if (!stageRunId) return null;
    if (this.gate.kind === "accept")
      return {
        to: "accept",
        stageRunId,
        ...(this.gate.stageKey === DESIGN_STAGE ? { stageKey: DESIGN_STAGE } : {}),
        ...(this.isHypothesisStage(this.gate.stageKey) ? { hypothesisIds: this.final() } : {}),
      };
    if (!this.gate.engineKind) return null;
    const engineGateId = this.gate.engineGateId;
    if (this.gate.engineKind === "question")
      return { to: "gate", stageRunId, kind: "question", ...(engineGateId ? { engineGateId } : {}) };
    return {
      to: "gate",
      stageRunId,
      kind: "artifact_review",
      ...(engineGateId ? { engineGateId } : {}),
      ...(this.review.artifactId ? { artifactId: this.review.artifactId } : {}),
      findings: [...this.review.raw],
    };
  }

  /** The gate POST succeeded, so do not leave the UI waiting for a second delivery of `run.gate_closed`. */
  acknowledgeGate(gateId: string, answer: GateAnswer): RunEvent[] {
    this.out = [];
    const gate = this.gate?.id === gateId ? this.gate : null;
    if (!gate) return this.out;
    if (gate.kind !== "decision") this.closeStep();
    const kind = gate.kind;
    const summary =
      gate.stageKey === DESIGN_STAGE
        ? this.designAnswer(gate.options?.find((option) => option.id === answer.option_id)?.label)
        : this.answered(
            kind,
            answer.option_id,
            answer.dropped ?? [],
            answer.findings?.length ?? 0,
            answer.kept?.length ?? 0,
          );
    this.emit(
      "gate.resolved",
      { gate_id: gateId, answer, summary },
      "pi",
      gate.stageKey === "dataset" ? "dataset" : undefined,
    );
    this.gate = null;
    this.decision = null;
    this.emit("run.status", { status: "running" });
    return this.out;
  }

  /** The screens of the run: one per round of hypotheses. */
  private screens(): Screen[] {
    return [...SCREENS, ...(this.run.continuesToDesign || this.designStageRun ? [DESIGN, EXECUTION] : [])].flatMap(
      (screen) => {
        if (screen.stage === "scope" && this.datasetAccepted) {
          return [{ ...screen, reads: ["Accepted data card", ...(screen.reads ?? [])] }];
        }
        if (screen.stage !== "hypothesize") return [screen];
        return Array.from({ length: this.round }, (_, i) => ({
          ...screen,
          key: `r${i + 1}-hypothesize`,
          // Rounds are only told apart once there is more than one.
          ...(this.round > 1 ? { round: i + 1, round_kind: this.roundKinds[i] ?? "revise" } : {}),
        }));
      },
    );
  }

  /** The key of the screen of this kind the run is on now: the hypotheses have one per round. */
  private keyOf(stage: string) {
    return stage === "hypothesize" ? `r${this.round}-hypothesize` : stage;
  }

  /** The hypotheses came back to be revised: the next round gets its own screen. */
  private revise() {
    const sent = this.sent ?? [];
    this.sent = null;
    this.nextRound("revise", sent, "you");
  }

  /**
   * The reviewer failed the set and the engine writes it again: the set it rejected stays on its own screen, with the
   * findings that sent it back, and the rewrite starts the next round.
   */
  private reviseForReviewer() {
    this.failedReview = false;
    const blocking = this.review.raw.filter((f) => f.severity === "blocking").map(toFinding);
    this.sentBack[this.round] = { count: blocking.length, by: "reviewer" };
    this.nextRound("review", blocking, "reviewer");
    this.say(
      `The reviewer found ${plural(blocking.length, "blocking issue")}. The perspectives write the set again to answer ${blocking.length === 1 ? "it" : "them"}.`,
      "reviewer",
    );
  }

  private nextRound(kind: RoundKind, sent: ReviewFinding[], by: "you" | "reviewer") {
    // The round was closed when the run moved to the map; it is summed up again now that it was sent back.
    const previous = this.keyOf("hypothesize");
    if (this.screen?.key !== previous)
      this.emit("stage.completed", { summary: this.summary(previous) }, undefined, previous);
    this.round += 1;
    this.published = null;
    this.roundKinds[this.round - 1] = kind;
    this.emit("run.plan", { stages: this.screens().map(planned) });
    // The round before is completed with its own content, then the next one starts empty.
    this.enter(`r${this.round}-hypothesize`);
    this.review = { raw: [], ...(this.review.artifactId ? { artifactId: this.review.artifactId } : {}) };
    this.emit("review.sent", { findings: sent, by }, "reviewer");
  }

  convert(envelope: PipelineEnvelope): RunEvent[] {
    this.out = [];
    // A stream that reconnects may send an envelope again.
    if (envelope.seq <= this.lastEnvelope) return this.out;
    this.lastEnvelope = envelope.seq;
    this.at = envelope;
    if (envelope.stage_run_id) this.stageRun = envelope.stage_run_id;
    if (!this.started) {
      this.started = true;
      this.emit("run.started", { mode: this.run.mode, topic: this.run.topic, domains: this.run.domains });
      this.emit("run.plan", { stages: this.screens().map(planned) });
    }
    if (envelope.type === "dataset.superseded") {
      if (envelope.payload.dataset_superseded === true) {
        const version = envelope.payload.superseded_by_version;
        this.emit("dataset.superseded", {
          dataset_superseded: true,
          ...(typeof version === "number" && Number.isInteger(version) && version > 0
            ? { superseded_by_version: version }
            : {}),
        });
      }
      return this.out;
    }
    if (envelope.stage_key === DESIGN_STAGE || envelope.type.startsWith(DESIGN_STAGE + ".")) {
      this.convertDesign(envelope);
      return this.out;
    }
    if (envelope.stage_key === EXECUTION_STAGE) {
      if (this.screens().includes(EXECUTION)) this.convertExecution(envelope);
      return this.out;
    }
    if (this.sent && (envelope.phase === "revising" || envelope.step_key === "critique")) this.revise();
    const base = envelope.step_key ? SCREEN_OF[envelope.step_key] : undefined;
    if (base && envelope.stage_key !== "dataset" && envelope.type !== "decision.recorded") this.goTo(this.keyOf(base));

    const { type, payload } = envelope;
    const engine = `${envelope.stage_key ?? "hypothesis"}.`;
    if (envelope.stage_key === "hypothesis") {
      const claimScope = updateClaimScope(this.claimScope, type, payload);
      if (claimScope && claimScope !== this.claimScope) {
        this.claimScope = claimScope;
        if (!this.screen) {
          this.goTo("scope");
          this.openStep("charter");
        }
        this.emit("scope.claim", claimScope, undefined, "scope");
      }
    }
    if (
      type === "run.step_changed" &&
      envelope.stage_key === "hypothesis" &&
      envelope.step_key === "work" &&
      !this.screen
    ) {
      this.goTo("scope");
      this.openStep("charter");
    }
    if (type.startsWith(engine)) this.activity(type.slice(engine.length), payload);
    else this.lifecycle(type, payload, envelope.phase);
    return this.out;
  }

  private convertExecution(envelope: PipelineEnvelope) {
    const { type, payload, phase, stage_run_id: stageRunId, step_key: engineStep } = envelope;
    if (this.screen?.key !== EXECUTION_STAGE && stageRunId && stageRunId === this.executionStageRun) return;
    if (this.screen?.key !== EXECUTION_STAGE) {
      this.goTo(EXECUTION_STAGE);
      this.openStep("execution_verify");
    } else if (stageRunId && this.executionStageRun && this.executionStageRun !== stageRunId) {
      this.reached = -1;
      this.step = null;
      this.emit("stage.started", { plan: stagePlan(EXECUTION) });
      this.openStep("execution_verify");
    }
    this.executionStageRun = stageRunId ?? this.executionStageRun;

    if (type === "artifact.delivered") {
      const schema = designText(payload.schema);
      const id = designText(payload.artifact_id);
      if (schema && id && Object.hasOwn(executionArtifacts, schema)) {
        this.openStep("execution_deliver");
        this.emit("execution.updated", { artifact: { schema, id } });
      }
    } else if (type === "execution.item") {
      const key = designText(payload.key);
      const state = designText(payload.state);
      const step = key && executionCheckStep(key);
      if (key && state && step) {
        // The first contract scan reports unmet downstream items before that work begins.
        if (state === "green") this.openStep(step);
        this.emit("execution.updated", { check: { key, state, reason: designText(payload.reason) } });
      }
    } else if (type === "execution.progress" && (payload.phase === "sealed" || payload.phase === "rerun")) {
      this.openStep("execution_run");
      if (envelope.summary) {
        this.emit("execution.updated", { progress: { step: "execution_run", text: envelope.summary } });
        this.say(envelope.summary, "code");
      }
    } else if (type === "run.published" || (type === "stage.status_changed" && payload.status === "COMPLETED")) {
      this.openStep("execution_readout");
    } else if (engineStep === "review" || phase === "reviewing") {
      this.openStep("execution_check");
    }
    if (type === "stage.status_changed" && payload.status === "ACCEPTED") {
      this.openStep("execution_readout");
      this.emit("execution.updated", { accepted: true });
      this.emit("stage.completed", { summary: this.summary(EXECUTION_STAGE) });
    }
    if (type === "run.gate_closed") {
      this.closeGate(this.executionGateId(String(payload.gate_id ?? "")), String(payload.action ?? ""));
      return;
    }
    this.lifecycle(type, payload, phase);
  }

  private executionGateId(id: string) {
    return `${EXECUTION_STAGE}:${this.executionStageRun ?? "stage"}:${id}`;
  }

  private convertDesign(envelope: PipelineEnvelope) {
    const { type, payload, phase, step_key: step, stage_run_id: stageRunId } = envelope;
    if (this.screen?.key === EXECUTION_STAGE && (!stageRunId || this.designStageRun === stageRunId)) return;
    if (stageRunId && this.designStageRun !== stageRunId) {
      const first = !this.designStageRun;
      this.designStageRun = stageRunId;
      this.designPublication = undefined;
      this.designBlocked = undefined;
      this.advice = {};
      if (first && !this.run.continuesToDesign) this.emit("run.plan", { stages: this.screens().map(planned) });
      if (this.screen?.key === DESIGN_STAGE) {
        if (this.gate?.stageKey === DESIGN_STAGE) {
          this.emit(
            "gate.resolved",
            {
              gate_id: this.gate.id,
              answer: { option_id: "send_back", note: this.decision?.note },
              summary: "Sent the design back for another pass.",
            },
            "pi",
          );
          this.gate = null;
          this.decision = null;
          this.emit("run.status", { status: "running" });
        }
        this.reached = -1;
        this.step = null;
        this.emit("stage.started", { plan: stagePlan(DESIGN) });
        this.emit("design.updated", {
          hypotheses: this.designIds.map((id) => ({ id, statement: this.drafts().get(id) })),
        });
      }
    }
    if (this.screen?.key !== DESIGN_STAGE) {
      // A fresh Design stage after an Execution send-back has its own artifacts and review.
      if (this.screen?.key === EXECUTION_STAGE) this.enter(DESIGN_STAGE);
      else this.goTo(DESIGN_STAGE);
      this.completed = false;
      this.emit("run.status", { status: "running" });
      const drafts = this.drafts();
      const hypotheses = (this.designIds.length ? this.designIds : this.final()).map((id) => {
        const published = this.publishedDetails?.hypotheses.find((hypothesis) => hypothesis.id === id);
        return {
          id,
          statement: published?.statement ?? drafts.get(id),
          inputExposure: published?.exposure,
          inputOutcome: published?.outcome,
        };
      });
      this.emit("design.updated", { hypotheses });
    }

    if (step === "review" || phase === "reviewing") this.openStep("design_review");
    else if (step === "work" || phase === "drafting" || type.startsWith(DESIGN_STAGE + "."))
      this.openStep("design_work");

    if (type.startsWith(DESIGN_STAGE + ".")) {
      this.designActivity(type.slice(DESIGN_STAGE.length + 1), payload);
      return;
    }

    switch (type) {
      case "run.cost": {
        const usage = designRecord(designRecord(payload.usage).stage);
        const tokens = [usage.input_tokens, usage.output_tokens].reduce<number>(
          (total, value) => total + (typeof value === "number" ? value : 0),
          0,
        );
        if (tokens) this.emit("design.updated", { tokens });
        break;
      }
      case "run.published":
        if (stageRunId) this.designPublication = { stageRunId, primaryId: designText(payload.artifact_id) };
        break;
      case "artifact.delivered": {
        const artifact = designArtifact(payload.artifact_id, payload.schema);
        if (artifact) this.emit("design.updated", { artifact });
        break;
      }
      case "stage.status_changed":
        if (payload.status === "COMPLETED" || payload.status === "ACCEPTED") {
          this.designPublication ??= stageRunId ? { stageRunId } : undefined;
          this.openStep("design_accept");
        }
        this.stageStatus(String(payload.status ?? ""), payload.reason);
        if (payload.status === "ACCEPTED") {
          this.emit("design.updated", { accepted: true, blocked: "" });
          this.emit("stage.completed", { summary: this.summary(DESIGN_STAGE) });
        }
        break;
      case "run.gate_closed":
        this.closeGate(this.designGateId(String(payload.gate_id ?? "")), String(payload.action ?? ""));
        break;
      case "attention.required":
        if (payload.reason === "next_stage_input_missing") {
          this.designBlocked = designText(payload.text) ?? "Execution needs additional outputs from this stage.";
          this.emit("design.updated", { blocked: this.designBlocked });
          if (this.gate?.kind === "accept") this.emit("gate.opened", { gate: this.acceptGate(this.gate.id) }, "pi");
        }
        break;
      case "review.completed":
        if (payload.passed === false)
          this.designLine("The independent review flagged issues in the design.", "reviewer");
        break;
      default:
        this.lifecycle(type, payload, phase);
    }
  }

  private designGateId(id: string) {
    return `${DESIGN_STAGE}:${this.designStageRun ?? "stage"}:${id}`;
  }

  private designAnswer(label?: string) {
    return label ? `Decided: ${label}` : "Answered the design question.";
  }

  private designLine(text: string, actor: AgentRole = "methodologist", live = true) {
    this.emit("run.activity", { text, step_id: this.step, ...(live && !this.gate ? { live: "replace" } : {}) }, actor);
  }

  private designActivity(kind: string, payload: Record<string, unknown>) {
    const actor = this.step === "design_review" ? "reviewer" : "methodologist";
    switch (kind) {
      case "item": {
        const check = designCheck(payload);
        if (check)
          this.emit(
            "run.activity",
            { text: `${check.label} · ${check.status}`, step_id: "design_work", check, note: check.reason },
            actor,
          );
        break;
      }
      case "agent.tool": {
        const work = designTool(payload);
        this.designLine(work.failed ? `${work.text} · Needs another attempt` : work.text, actor);
        if (work.hypotheses.length) this.emit("design.updated", { hypotheses: work.hypotheses });
        break;
      }
      case "agent.turn":
        // The turn follows its tools. Keep the last specific tool in the Now card.
        this.designLine(designAgent(payload), actor, !Array.isArray(payload.tools) || payload.tools.length === 0);
        break;
      case "agent.done":
        this.designLine(`${designAgent(payload)} · Finished this pass`, actor, false);
        break;
      case "action": {
        const action = designText(payload.action)?.split(".").at(-1);
        if (action)
          this.designLine(
            `${designLabel(action)} · ${designLabel(String(payload.outcome ?? "recorded"))}`,
            actor,
            false,
          );
        break;
      }
      case "span":
        this.designLine(designLabel(String(payload.name ?? "Design check")), "code", false);
        break;
      case "inbox_item": {
        const id = designText(payload.id);
        const question = designText(payload.question);
        if (id && question && payload.kind !== "ask_user")
          this.emit("design.updated", {
            notice: { id, question, why: designText(payload.why), needsInput: payload.kind === "needs_you" },
          });
        break;
      }
      case "ask_user":
        this.designAsked = designText(payload.question);
        this.designLine("Preparing a question for you", actor, false);
        break;
      case "ask_user_answered": {
        const question = designText(payload.question);
        const id = question ? this.designGateHistory.get(question) : undefined;
        if (id)
          this.emit("gate.answer_details", {
            id,
            text: this.designAnswer(designText(payload.label)),
            note: designText(payload.text),
          });
        else this.designLine(`Question answered · ${designText(payload.label) ?? "Answer recorded"}`, actor, false);
        break;
      }
      case "decision": {
        const choices = Object.entries(designRecord(payload.choice)).map(([key, value]) => `${key}: ${String(value)}`);
        const source = payload.source === "typesafe" ? "TypeSafe" : designLabel(String(payload.source ?? "engine"));
        this.designLine(
          `${source} decision · ${choices.join(", ") || designLabel(String(payload.name ?? "Design check"))}`,
          "code",
          false,
        );
        break;
      }
      case "review": {
        const findings = Number(payload.findings ?? 0);
        this.designLine(`Reviewed the plan · ${plural(findings, "finding")}`, "reviewer");
        break;
      }
      default:
        if (this.at?.summary) this.designLine(this.at.summary, actor, false);
    }
  }

  private emit(type: RunEvent["type"], payload: unknown, actor?: AgentRole, stageKey?: string) {
    const at = this.at as PipelineEnvelope;
    this.seq += 1;
    const key =
      stageKey ?? (type.startsWith("gate.") && this.gate?.stageKey === "dataset" ? "dataset" : this.screen?.key);
    this.out.push({
      seq: this.seq,
      run_id: at.run_id,
      ts: at.ts,
      type,
      ...(key && type !== "run.started" && type !== "run.plan" ? { stage_key: key } : {}),
      ...(actor ? { actor } : {}),
      payload,
    } as RunEvent);
  }

  /** Moves to a screen when the run reaches it; a screen the run has passed is never entered again from here. */
  private goTo(key: string) {
    if (key === this.screen?.key) return;
    const order = this.screens().map((s) => s.key);
    if (this.screen && order.indexOf(key) < order.indexOf(this.screen.key) && !this.again(key)) return;
    const resumeScreen =
      key === "screen" && this.items("screen.criteria").some((item) => item.protocol_version !== undefined);
    this.enter(key, resumeScreen);
  }

  /** The run goes back to a screen only when that work starts over: a new search after the shortlist. */
  private again(key: string) {
    return (
      key === "search" &&
      this.screen?.key === "screen" &&
      !this.items("search.strategy").some((item) => item.review_round !== undefined)
    );
  }

  private enter(key: string, preserveContent = false) {
    const next = this.screens().find((s) => s.key === key);
    if (!next) return;
    if (this.screen) {
      this.closeStep();
      this.emit("stage.completed", { summary: this.summary(this.screen.key) });
    }
    // What its scopes showed before belongs to the earlier pass; the engine sends the new pass.
    if (!preserveContent)
      for (const scope of [...this.shown.keys()]) if (SCOPE_SCREEN[scope] === next.stage) this.shown.delete(scope);
    this.screen = next;
    this.reached = -1;
    this.emit("stage.started", { plan: stagePlan(next), ...(preserveContent ? { preserve_content: true } : {}) });
  }

  /** Starts a step of this screen, unless the run is already past it. */
  private openStep(id: string) {
    if (!this.screen) return;
    const index = this.screen.steps.indexOf(id);
    if (index <= this.reached) return;
    this.closeStep();
    // A step the run passed without content of its own (papers rejected while the scores came in) is done too; a stop
    // that did not open (none opens in auto mode) is not.
    for (const passed of this.screen.steps.slice(this.reached + 1, index))
      if (!STEPS[passed].gate) {
        this.emit("step.started", { step_id: passed }, STEPS[passed].actor);
        this.emit("step.completed", { step_id: passed });
      }
    this.reached = index;
    this.step = id;
    this.emit("step.started", { step_id: id }, STEPS[id].actor);
  }

  private closeStep() {
    if (!this.step) return;
    const step = this.step;
    const note = this.note(step);
    const live = this.message?.step === step ? this.message : null;
    if (live)
      this.emit("agent.message", { message_id: live.id, ...(note ? { text: note } : {}), done: true }, live.actor);
    else if (note)
      this.emit("agent.message", { message_id: this.messageId(step), text: note, done: true }, STEPS[step].actor);
    this.message = null;
    this.emit("step.completed", { step_id: step });
    this.step = null;
  }

  private messageId(step: string | null) {
    return `${this.stageRun ?? "stage"}.${this.screen?.key ?? "run"}.${step ?? "stage"}`;
  }

  /** The live line of the current step: each new line replaces the one before. */
  private say(text: string, actor?: AgentRole) {
    if (!this.screen) return;
    const step = this.step;
    const id = this.messageId(step);
    const speaker = actor ?? (step ? STEPS[step].actor : undefined);
    this.message = { id, step, actor: speaker };
    this.emit("agent.message", { message_id: id, text, done: false }, speaker);
  }

  private activity(kind: string, payload: Record<string, unknown>) {
    if (CONTENT.has(kind)) this.content(kind, payload);
    else if (kind === "screen_progress" && payload.state && payload.protocol_version)
      this.content("screen.review_progress", { ...payload, scope: "stage-05", key: "review_progress" });
    else if (kind === RESET) this.reset(String(payload.scope ?? ""));
    else if (kind === "progress") this.progress(payload);
    else if (kind === "review.finding") this.finding(payload);
    else if (kind === "decision") this.claimCheck(payload);
    else if (this.at?.stage_key === "hypothesis") this.work(kind, payload);
  }

  private work(kind: string, payload: Record<string, unknown>) {
    const work = hypothesisWork(kind, payload);
    if (!work) return;
    const { text, target, check, note, queries } = work;
    const key = target ? this.keyOf(target.stage) : this.screen?.key;
    if (!check && !this.gate) {
      if (target && key && this.at?.step_key === "work") {
        this.goTo(key);
        if (key === this.screen?.key) this.openStep(target.step);
      } else if (!this.screen) {
        this.goTo("scope");
        this.openStep("charter");
      }
    }
    const stageKey = key ?? this.screen?.key;
    const step = target?.step ?? this.step ?? undefined;
    const live =
      !check && !this.gate && stageKey === this.screen?.key && step === (this.step ?? undefined)
        ? work.live && kind !== "action"
          ? "replace"
          : "fallback"
        : undefined;
    const actor = step ? STEPS[step]?.actor : undefined;
    this.emit("run.activity", { text, step_id: step, live, check, note, queries }, actor, stageKey);
  }

  /** The reviewer asks whether the papers a hypothesis cites back it, one hypothesis at a time. */
  private claimCheck(payload: Record<string, unknown>) {
    const name = String(payload.name ?? "");
    if (!name.startsWith("claim_support:") || this.step !== "review" || this.screen?.stage !== "hypothesize") return;
    const n = Array.isArray(payload.questions) ? payload.questions.length : 0;
    const papers = n === 1 ? "the paper" : n ? `the ${n} papers` : "the papers";
    this.say(`Checking whether ${papers} ${name.slice("claim_support:".length)} cites back it.`, "reviewer");
  }

  private content(kind: string, payload: Record<string, unknown>) {
    const scope = String(payload.scope ?? "");
    const stage = SCOPE_SCREEN[scope];
    if (kind === "search.strategy" && payload.review_round !== undefined && this.screen?.key === "screen")
      this.enter("search", true);
    else if (stage) this.goTo(this.keyOf(stage));
    const target = stage ? this.keyOf(stage) : this.screen?.key;
    const actor = this.actorOf(kind, payload);
    const items = this.shown.get(scope) ?? new Map<string, Shown>();
    items.set(String(payload.key ?? items.size), { kind, payload, actor });
    this.shown.set(scope, items);
    if (target !== this.screen?.key) {
      // Content of a screen the run has moved past (a label added later): it updates that screen in place.
      this.emit(kind as RunEvent["type"], payload, actor, target);
      return;
    }
    const step = this.stepOf(kind, payload);
    if (step) this.openStep(step);
    if (kind === "search.sources")
      this.sources = ((payload.sources ?? []) as { name?: string }[]).map((s) => String(s.name));
    // The pause between requests is optional in the payload; the search scene shows it.
    const body = kind === "search.sources" ? { delay_ms: 0, ...payload } : payload;
    this.emit(kind as RunEvent["type"], body, actor);
    if (kind === "card.extracted" && this.cardAt) {
      const card = payload.card as { title?: string; citation?: string } | undefined;
      const title = [card?.title, card?.citation].find(Boolean) ?? "";
      const short = title.length > 70 ? `${title.slice(0, 67).trimEnd()}…` : title;
      this.say(`Card ${this.cardAt.index} of ${this.cardAt.total}: ${short}`);
      this.cardAt = null;
    }
  }

  private sources: string[] = [];

  /** Who says a content item: a debate turn is its perspective's; anything else, its step's agent. */
  private actorOf(kind: string, payload: Record<string, unknown>): AgentRole | undefined {
    if (kind === "debate.turn") {
      const actor = (payload.turn as { actor?: string } | undefined)?.actor;
      if (actor && ROLES.has(actor)) return actor as AgentRole;
    }
    const step = this.stepOf(kind, payload);
    return step ? STEPS[step].actor : undefined;
  }

  /**
   * The engine does the work of a scope again (a retried step, a resumed run): what that scope showed is withdrawn.
   * The screen showing it is drawn again from what its other scopes still hold; the engine then sends the new items.
   */
  private reset(scope: string) {
    if (scope === "stage-08" && this.failedReview) {
      this.reviseForReviewer();
      return;
    }
    // Nothing of it is shown (a round that has just started): there is nothing to withdraw.
    if (!this.shown.delete(scope)) return;
    const stage = SCOPE_SCREEN[scope];
    if (!stage) return;
    if (stage === "hypothesize") {
      this.review = { raw: [], ...(this.review.artifactId ? { artifactId: this.review.artifactId } : {}) };
      delete this.reviewed[this.round];
    }
    if (!this.screen || this.screen.key !== this.keyOf(stage)) return; // drawn afresh when the run gets there
    this.message = null;
    this.step = null;
    this.reached = -1;
    this.emit("stage.started", { plan: stagePlan(this.screen) });
    for (const [other, items] of this.shown) {
      if (SCOPE_SCREEN[other] !== stage) continue;
      for (const item of items.values()) {
        const step = this.stepOf(item.kind, item.payload);
        if (step) this.openStep(step);
        this.emit(item.kind as RunEvent["type"], item.payload, item.actor);
      }
    }
  }

  private progress(payload: Record<string, unknown>) {
    const waiting = "Waiting for release review on the Local Node.";
    if (payload.text === waiting || payload.message === waiting || this.at?.summary === waiting) {
      this.say(waiting);
      return;
    }
    const kind = String(payload.kind ?? "");
    if (kind === "started") {
      // A set being rewritten announces its own round once the old one is withdrawn.
      const started = STARTED[Number(payload.stage)];
      if (!started || (Number(payload.stage) === 8 && (this.failedReview || this.sent))) return;
      // A stage that starts on a screen ahead (the map, while novelty is still on the hypotheses screen) moves the
      // run there first, so its first step and its narration land together.
      const owner = this.screens().find((s) => s.steps.includes(started.step));
      if (owner) this.goTo(this.keyOf(owner.stage));
      this.openStep(started.step);
      this.say(started.text);
      return;
    }
    const step = PROGRESS_STEP[kind];
    if (step) this.openStep(step);
    if (kind === "card") {
      this.cardAt = { index: Number(payload.index ?? 0), total: Number(payload.total ?? 0) };
      return;
    }
    if (kind === "screen_plan" && payload.to_screen != null)
      this.emit("screen.planned", {
        to_screen: Number(payload.to_screen),
        set_aside: ((payload.prefiltered ?? []) as unknown[]).length,
      });
    const text = narration(kind, payload, this.sources);
    if (!text) return;
    const role = payload.role ? PERSPECTIVE[String(payload.role)] : undefined;
    this.say(text, role);
  }

  /** A finding of the engine's independent review. */
  private finding(payload: Record<string, unknown>) {
    const round = Number(payload.round ?? 1);
    this.reviewed[round] = (this.reviewed[round] ?? 0) + 1;
    const raw = reviewFinding(payload, this.reviewed[round], this.review.artifactId);
    this.review.raw.push(raw);
    const target = this.keyOf("hypothesize");
    if (target === this.screen?.key) this.openStep("review");
    this.emit("review.finding", { finding: toFinding(raw) }, "reviewer", target);
  }

  private stepOf(kind: string, payload: Record<string, unknown>) {
    if (kind === "screen.review_progress" && payload.state === "completed") return "shortlist";
    if (kind === "map.node") return MAP_STEP[String((payload.node as { type?: string } | undefined)?.type)];
    if (kind === "map.edge") return MAP_STEP[String((payload.edge as { relation?: string } | undefined)?.relation)];
    return OPENS[kind];
  }

  /** The payloads of one content kind that the run shows now, across its scopes. */
  private items<T = Record<string, unknown>>(kind: string): T[] {
    const out: T[] = [];
    for (const items of this.shown.values())
      for (const item of items.values()) if (item.kind === kind) out.push(item.payload as T);
    return out;
  }

  private lifecycle(type: string, payload: Record<string, unknown>, phase?: string | null) {
    if (type.startsWith("pi.") || type === "attention.required") {
      if (type === "pi.decision" && payload.kind) this.advise(String(payload.kind), payload);
      if (payload.kind === "charter" || type.startsWith("pi.charter_")) this.charter(type, payload);
      return;
    }
    switch (type) {
      case "review.completed":
        // Only a failed review that the engine answers itself is followed by a rewrite of the set.
        this.failedReview = payload.passed === false && !payload.error;
        break;
      case "run.gate_opened":
      case "run.step_changed":
        if (type === "run.step_changed" && this.screen?.stage === "hypothesize") break;
        this.failedReview = false;
        if (type === "run.gate_opened") this.openGate(payload);
        break;
      case "run.phase_changed":
        if (phase === "reviewing" && this.screen?.stage === "hypothesize") {
          this.openStep("review");
          const n = this.items("hypothesis.selected").length;
          this.say(
            `Reading ${n ? `the ${plural(n, "hypothesis", "hypotheses")}` : "the set"} against the papers they cite: the conditions, the statistics, and whether each paper backs the claim.`,
            "reviewer",
          );
        }
        if (phase === "paused") this.emit("run.status", { status: "paused", reason: payload.reason });
        else if (payload.from === "paused") this.emit("run.status", { status: "running" });
        break;
      case "run.published": {
        if (this.isHypothesisStage(this.at?.stage_key ?? undefined)) {
          const ids = (payload.selection as { valid_ids?: unknown } | undefined)?.valid_ids;
          if (Array.isArray(ids)) this.published = ids.map(String);
          if (this.stageRun && typeof payload.artifact_id === "string")
            this.publication = { stageRunId: this.stageRun, primaryId: payload.artifact_id };
        }
        break;
      }
      case "decision.recorded":
        this.decision = payload;
        break;
      case "run.gate_closed":
        this.closeGate(String(payload.gate_id ?? ""), String(payload.action ?? ""));
        break;
      case "stage.status_changed":
        this.stageStatus(String(payload.status ?? ""), payload.reason);
        break;
      case "run.failed":
        this.fail(
          String(payload.message || "The engine could not finish this run."),
          false,
          typeof payload.code === "string" ? payload.code : undefined,
        );
        break;
      case "run.cancelled":
        this.fail("The run was cancelled.");
        break;
      // The Platform starts a stage that failed on its own again, after a wait.
      case "stage.healing":
        this.recover();
        this.say(String(payload.reason || "The stage failed. Trying again by itself."));
        break;
      case "stage.heal_exhausted": {
        const tries = Number(payload.attempts ?? 0);
        this.say(`Tried again ${tries === 1 ? "once" : `${tries} times`} without success. The stage needs you now.`);
        break;
      }
      case "stage.stalled":
        this.emit("run.stalled", { minutes: Number(payload.minutes_since_last_event ?? 0) });
        break;
    }
  }

  /**
   * The PI's charter, before Scope: the PI drafts it, then you endorse or rewrite it (Light), or it stands as the PI
   * wrote it (Auto). A PI that fails leaves it to you: ask again or write it yourself.
   */
  private charter(type: string, payload: Record<string, unknown>) {
    const id = String(payload.consultation_id ?? "");
    switch (type) {
      case "pi.consultation_requested":
        this.charterBy = payload.authority === "researcher" ? "you" : "pi";
        // Asked again after a failure: the stop that offered the retry is answered.
        if (this.gate?.kind === "charter") this.resolveCharter("Asked the PI to draft the plan again.", "retry");
        this.goTo("scope");
        this.openStep("charter");
        this.say("Drafting the plan: the question, what is in and out of scope, and how the run will be judged.", "pi");
        break;
      case "pi.decision":
        if (this.at?.summary) this.say(this.at.summary, "pi");
        break;
      case "pi.recommendation":
        if (this.charterBy === "you") this.openCharter(id, false);
        break;
      case "attention.required":
        if (payload.reason === "pi_failed") this.openCharter(id, true);
        break;
      case "pi.charter_settled": {
        const yours = payload.author === "researcher";
        if (this.gate?.kind === "charter")
          this.resolveCharter(
            yours ? "Wrote the plan yourself." : "Endorsed the PI's plan.",
            yours ? "edit" : "endorse",
          );
        else this.say(yours ? "The plan you wrote stands." : "The PI endorsed its own plan.", "pi");
        this.closeStep();
        break;
      }
      case "pi.charter_skipped":
        this.say("The PI could not write the plan, so the run goes on without one.", "pi");
        this.closeStep();
        break;
    }
  }

  /** The PI's advice: kept for the stop it is about, and shown on that stop when it is already open. */
  private advise(kind: string, payload: Record<string, unknown>) {
    const text = this.at?.summary?.trim();
    if (!text) return;
    this.advice[kind] = {
      consultationId: String(payload.consultation_id ?? ""),
      action: String(payload.action ?? ""),
      ...(typeof payload.confidence === "number" ? { confidence: payload.confidence } : {}),
      text,
    };
    if (kind === "stage_outcome" && this.gate?.kind === "accept")
      this.emit("gate.opened", { gate: this.acceptGate(this.gate.id) }, "pi");
  }

  private openCharter(id: string, failed: boolean) {
    const dataset = this.run.datasetFirst && !this.datasetAccepted;
    if (!dataset) {
      this.goTo("scope");
      this.openStep("charter");
    }
    this.gate = { id, kind: "charter", engineKind: null, stageKey: dataset ? "dataset" : undefined };
    this.emit("run.status", { status: "awaiting_review" });
    this.emit("gate.opened", { gate: this.charterGate(id, failed) }, "pi");
  }

  private resolveCharter(summary: string, option: string) {
    if (!this.gate) return;
    this.emit("gate.resolved", { gate_id: this.gate.id, answer: { option_id: option }, summary }, "pi");
    this.gate = null;
    this.emit("run.status", { status: "running" });
  }

  private charterGate(id: string, failed: boolean): Gate {
    return {
      id,
      kind: "charter",
      title: failed ? "The PI could not draft the plan" : "Endorse the PI's plan",
      why: failed
        ? "Nothing starts without a plan. Ask the PI again, or write it yourself."
        : "Every later stage, the reviewer and the final accept are judged against this plan, so it is fixed before any result exists.",
      summary: [],
      ...(!failed && this.advice.charter ? { advice: this.advice.charter } : {}),
      options: failed
        ? [
            {
              id: "retry",
              label: "Ask the PI again",
              description: "The PI drafts the plan from your topic once more.",
              leads_to: "You review the new draft",
              confirm_label: "Ask again",
              recommended: true,
            },
            {
              id: "write",
              label: "Write the plan yourself",
              description: "Fill in the question, the scope and the criteria.",
              leads_to: "Scope starts from your plan",
              confirm_label: "Save and start",
            },
          ]
        : [
            {
              id: "endorse",
              label: "Endorse the plan",
              description: "Start the run with the plan as the PI wrote it.",
              leads_to: "Scope starts",
              confirm_label: "Endorse",
              recommended: true,
            },
            {
              id: "edit",
              label: "Edit the plan",
              description: "Change the question, the scope or the criteria first. Your version replaces the PI's.",
              leads_to: "Scope starts from your version",
              confirm_label: "Save and start",
            },
          ],
      ...this.stop("charter"),
    };
  }

  private openGate(payload: Record<string, unknown>) {
    const engineKind = payload.kind === "artifact_review" ? "artifact_review" : "question";
    const id = String(payload.gate_id ?? "");
    if (!id) return;
    const stageKey = this.at?.stage_key ?? undefined;
    // A review gate belongs to the stage that opened it: only the Hypothesis stage's is "Approve the hypotheses".
    const otherStage = engineKind === "artifact_review" && !!stageKey && !this.isHypothesisStage(stageKey);
    if (stageKey === DESIGN_STAGE || stageKey === EXECUTION_STAGE || stageKey === "dataset" || otherStage) {
      const key =
        stageKey === DESIGN_STAGE
          ? this.designGateId(id)
          : stageKey === EXECUTION_STAGE
            ? this.executionGateId(id)
            : id;
      const title =
        stageKey === DESIGN_STAGE
          ? "Experiment design decision"
          : stageKey === EXECUTION_STAGE
            ? "Execution decision"
            : stageKey === "dataset"
              ? "Dataset decision"
              : `${designLabel(stageKey ?? "stage")} decision`;
      const gate = this.questionGate(
        key,
        {
          ...payload,
          header: designText(payload.header) ?? title,
          prompt: designText(payload.prompt) ?? (stageKey === DESIGN_STAGE ? this.designAsked : undefined),
        },
        true,
      );
      gate.stageKey = stageKey;
      if (engineKind === "artifact_review") {
        gate.options = [
          {
            id: "approve",
            label: "Approve the review",
            description: "",
            leads_to: "The stage continues",
            confirm_label: "Approve",
            recommended: true,
          },
        ];
      }
      if (stageKey === DESIGN_STAGE) {
        for (const question of [this.designAsked, gate.why]) {
          if (question) this.designGateHistory.set(question, key);
        }
        this.designAsked = undefined;
      }
      this.gate = {
        id: key,
        engineGateId: id,
        kind: "decision",
        engineKind,
        stageRunId: this.stageRun ?? undefined,
        stageKey,
        options: gate.options,
      };
      this.decision = null;
      this.emit("run.status", { status: "awaiting_review" });
      this.emit("gate.opened", { gate }, "pi");
      return;
    }
    const selection = payload.selection as { valid_ids?: unknown } | undefined;
    const currentStep = payload.step_key ?? this.at?.step_key ?? this.step;
    const isScreenGate =
      engineKind === "question" &&
      (currentStep === "screen" ||
        (this.screen?.key === "screen" && (this.step === "shortlist" || this.step === "screen_gate")) ||
        Array.isArray(selection?.valid_ids));
    let kind: GateKind = "decision";
    if (engineKind === "artifact_review") kind = "hypotheses";
    else if (isScreenGate) kind = "screen";
    const reviewed = (payload.artifact_ids as string[] | undefined)?.[0];
    if (kind === "hypotheses" && reviewed) {
      this.review.artifactId = reviewed;
      this.review.raw = this.review.raw.map((f) => ({
        ...f,
        anchor: { ...(f.anchor as object), artifact_id: reviewed },
      }));
    }
    const valid = selection?.valid_ids as string[] | undefined;
    if (kind === "hypotheses") this.goTo("map");
    if (kind === "screen") this.openStep("screen_gate");
    else if (kind === "hypotheses") this.openStep("hypotheses_gate");
    this.gate = {
      id,
      kind,
      engineKind,
      stageKey: this.at?.stage_key ?? undefined,
      stageRunId: this.stageRun ?? undefined,
    };
    this.decision = null;
    this.emit("run.status", { status: "awaiting_review" });
    let gate: Gate;
    if (kind === "screen") gate = this.screenGate(id, valid);
    else if (kind === "hypotheses") gate = this.hypothesesGate(id);
    else gate = this.questionGate(id, payload);
    this.emit("gate.opened", { gate }, "pi");
  }

  private questionGate(id: string, payload: Record<string, unknown>, design = false): Gate {
    const defaultOptionId = payload.default_option_id;
    const rawOptions = Array.isArray(payload.options) ? payload.options : [];
    const options = rawOptions.flatMap((raw): Gate["options"] => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const option = raw as Record<string, unknown>;
      if (typeof option.option_id !== "string" || typeof option.label !== "string") return [];
      return [
        {
          id: option.option_id,
          label: option.label,
          description: typeof option.description === "string" ? option.description : "",
          leads_to: "The stage continues with your answer.",
          confirm_label: "Confirm answer",
          recommended: option.option_id === defaultOptionId,
          ...(design && option.option_id === "other" ? { needsText: true } : {}),
        },
      ];
    });
    return {
      id,
      kind: "decision",
      title: typeof payload.header === "string" ? payload.header : "Question",
      why: typeof payload.prompt === "string" ? payload.prompt : "",
      summary: [],
      options,
      stop_index: 1,
      stop_total: 1,
    };
  }

  private closeGate(gateId: string, action: string) {
    const gate = this.gate;
    if (!gate || gate.id !== gateId) return;
    const decision = this.decision ?? {};
    const params = (decision.params ?? {}) as { dropped?: string[]; kept?: string[] };
    const option = String(decision.option_id ?? (action === "comment" ? "comment" : "approve"));
    const dropped = params.dropped ?? [];
    if (option === "comment") {
      // What was sent back: the next round answers it.
      this.sent = ((decision.findings ?? []) as Record<string, unknown>[]).map(toFinding);
      this.sentBack[this.round] = { count: this.sent.length, by: "you" };
    }
    const answer: GateAnswer = {
      option_id: option,
      ...(dropped.length ? { dropped } : {}),
      ...(params.kept?.length ? { kept: params.kept } : {}),
      ...(decision.text ? { note: String(decision.text) } : {}),
    };
    const summary =
      gate.stageKey === DESIGN_STAGE
        ? this.designAnswer(gate.options?.find((choice) => choice.id === option)?.label)
        : this.answered(gate.kind, option, dropped, this.sent?.length ?? 0, params.kept?.length ?? 0);
    this.emit("gate.resolved", { gate_id: gateId, answer, summary }, "pi");
    if (
      gate.stageKey !== DESIGN_STAGE &&
      gate.stageKey !== EXECUTION_STAGE &&
      !(this.claimScope && gate.kind === "decision" && this.screen?.key === "scope")
    )
      this.closeStep();
    this.gate = null;
    this.decision = null;
    this.emit("run.status", { status: "running" });
  }

  private stageStatus(status: string, reason?: unknown) {
    const stageKey = this.at?.stage_key ?? undefined;
    if ((status === "COMPLETED" || status === "ACCEPTED") && this.isHypothesisStage(stageKey)) {
      const stageRunId = this.stageRun;
      const missingMap = !this.items("map.node").length || !this.items("canvas.piece").length;
      if (
        stageRunId &&
        !this.publishedDetails &&
        (!this.final().length || (this.publication && (!this.drafts().size || missingMap)))
      )
        this.pendingPublication ??= this.publication?.stageRunId === stageRunId ? this.publication : { stageRunId };
    }
    if (status === "RUNNING" || status === "PENDING") this.recover();
    if (status === "COMPLETED") {
      if (this.isHypothesisStage(stageKey)) {
        this.goTo("map");
        this.openStep("accept");
      }
      this.gate = {
        id: `accept-${this.stageRun ?? "stage"}`,
        kind: "accept",
        engineKind: null,
        stageKey,
        stageRunId: this.stageRun ?? undefined,
      };
      this.emit("run.status", { status: "awaiting_review" });
      this.emit("gate.opened", { gate: this.acceptGate(this.gate.id) }, "pi");
    } else if (status === "ACCEPTED") {
      const acceptedStageKey = this.gate?.stageKey ?? stageKey;
      if (acceptedStageKey === "dataset") this.datasetAccepted = true;
      const hypothesisStage = this.isHypothesisStage(acceptedStageKey);
      if (hypothesisStage) {
        const selection = (this.decision?.selection as { hypothesis_ids?: string[] } | undefined)?.hypothesis_ids;
        this.designIds = selection ?? this.final();
      }
      if (this.gate?.kind === "accept") {
        let answer: GateAnswer = { option_id: "accept" };
        let summary: string;
        if (hypothesisStage) {
          const selection = ((this.decision?.selection ?? {}) as { hypothesis_ids?: string[] }).hypothesis_ids;
          const published = this.final();
          const set = published.length ? published : (selection ?? []);
          const taken = selection ?? set;
          const dropped = set.filter((id) => !taken.includes(id));
          answer = { option_id: "accept", ...(dropped.length ? { dropped } : {}) };
          summary = `Accepted ${taken.length === set.length ? `all ${set.length}` : `${taken.length} of ${set.length}`} hypotheses: ${taken.join(", ")}.`;
        } else {
          summary = `Accepted the ${this.acceptSubject(acceptedStageKey)}.`;
        }
        if (this.decision?.note) answer.note = String(this.decision.note);
        this.emit("gate.resolved", { gate_id: this.gate.id, answer, summary }, "pi");
      }
      this.gate = null;
      this.decision = null;
      this.closeStep();
      if (hypothesisStage) {
        if (this.screen) this.emit("stage.completed", { summary: this.summary(this.screen.key) });
        if (!this.run.continuesToDesign) {
          this.completed = true;
          this.emit("run.completed", {});
        } else this.emit("run.status", { status: "running" });
      } else this.emit("run.status", { status: "running" });
    } else if (status === "FAILED") this.fail("The stage stopped before it finished.");
    else if (status === "STOPPED")
      this.fail(
        reason === "project_budget_exceeded"
          ? "The run stopped because the project reached its monthly model budget. A Project Manager can raise the limit in Settings → Spending."
          : "The run was stopped.",
        reason !== "project_budget_exceeded",
      );
  }

  private fail(reason: string, stopped = false, code?: string) {
    if (this.failed) return;
    this.failed = true;
    this.gate = null;
    this.emit("run.status", { status: "failed", reason, ...(code ? { code } : {}), ...(stopped ? { stopped } : {}) });
  }

  /** A stage that failed or was stopped starts again (a rerun, by hand or by itself): the run goes on. */
  private recover() {
    if (!this.failed) return;
    this.failed = false;
    this.emit("run.status", { status: "running" });
  }

  /** The hypotheses written in this round, by id, with their short statement. */
  private drafts() {
    const drafts = new Map<string, string>();
    for (const { hypothesis: h } of this.items<{ hypothesis: { id: string; short?: string; statement?: string } }>(
      "hypothesis.drafted",
    ))
      drafts.set(h.id, [h.short, h.statement].find(Boolean) ?? h.id);
    return drafts;
  }

  /** The hypotheses in the set, in the order they were picked. */
  private set() {
    const selected = this.items<{ hypothesis_id: string }>("hypothesis.selected").map((p) => p.hypothesis_id);
    return selected.length ? selected : [...this.drafts().keys()];
  }

  /** The set to accept: as the stage published it, or as it was picked when no publication was read. */
  private final() {
    const eventSet = this.set();
    return this.published ?? (eventSet.length ? eventSet : (this.publishedDetails?.hypotheses.map((h) => h.id) ?? []));
  }

  private kept() {
    return [
      ...this.items<{ paper: { id: string } }>("screen.kept").map((p) => p.paper.id),
      ...this.items<EligibilityDecision>("screen.eligibility")
        .filter((p) => p.included)
        .map((p) => p.id),
    ];
  }

  private excluded() {
    const out: Record<string, number> = {};
    for (const { paper } of this.items<{ paper: { decision?: string } }>("screen.rejected")) {
      const decision = paper.decision ?? "rejected";
      out[decision] = (out[decision] ?? 0) + 1;
    }
    return out;
  }

  private findings() {
    const out: Record<string, number> = {};
    for (const f of this.review.raw) out[String(f.severity)] = (out[String(f.severity)] ?? 0) + 1;
    return out;
  }

  private stop(kind: GateKind) {
    return { stop_index: STOPS.indexOf(kind) + 1, stop_total: STOPS.length };
  }

  private screenGate(id: string, valid?: string[]): Gate {
    const kept = valid?.length ? valid : this.kept();
    const excluded = this.excluded();
    const collected = this.items<{ unique: number }>("literature.collected")[0];
    const candidates = this.items<{ candidates?: number }>("screen.criteria")[0]?.candidates;
    const below = excluded.below_cutoff ?? 0;
    const unscored = (excluded.unscored ?? 0) + (excluded.prefiltered ?? 0);
    return {
      id,
      kind: "screen",
      title: "Approve the shortlist",
      why: "You check the reading list, because every gap and hypothesis is built on it.",
      summary: [
        `${kept.length} of ${collected?.unique ?? candidates ?? "?"} papers kept, each with a reason`,
        ...(below ? [`${below} more cleared both bars but ranked below the best-scored papers kept`] : []),
        `${excluded.rejected ?? 0} papers rejected, ${unscored} excluded unscored`,
      ],
      options: [
        {
          id: "approve",
          label: `Read all ${kept.length}`,
          description: "Approve the shortlist as screened.",
          leads_to: "Each paper becomes a knowledge card",
          confirm_label: "Approve the shortlist",
          recommended: true,
        },
        {
          id: "drop",
          label: "Remove some first",
          description: "Click papers in the shortlist to leave them out.",
          leads_to: "Removed papers are not read or cited",
          confirm_label: "Choose what to remove",
        },
        {
          id: "reject",
          label: "Search again",
          description: "Reject the shortlist and redo the search strategy.",
          leads_to: "The search, screen and later steps run again with your note as feedback",
          confirm_label: "Reject and search again",
        },
      ],
      ...this.stop("screen"),
      droppable: [...kept],
    };
  }

  private hypothesesGate(id: string): Gate {
    const set = this.set();
    const drafts = this.drafts();
    const f = this.findings();
    const total = (f.blocking ?? 0) + (f.major ?? 0) + (f.minor ?? 0);
    const parts = (["blocking", "major", "minor"] as const).filter((s) => f[s]).map((s) => `${f[s]} ${s}`);
    const yours = this.roundKinds.includes("revise");
    const reviewer = this.roundKinds.filter((k) => k === "review").length;
    return {
      id,
      kind: "hypotheses",
      title: yours || reviewer ? `Approve the revised hypotheses` : "Approve the hypotheses",
      why: yours
        ? "The hypotheses were rewritten to answer your comments, and the reviewer has read them again. Approve them, or send them back once more."
        : reviewer
          ? `The independent reviewer sent the set back ${reviewer === 1 ? "once" : `${reviewer} times`} before you saw it; this is the rewrite, with the reviewer's last findings. Approve it, or send it back with the findings you pick.`
          : "An independent reviewer has read the set and the argument map is drawn. Approve it, or send it back to be revised with the findings you pick.",
      summary: [
        `${plural(set.length, "hypothesis", "hypotheses")} in the set, each built from debate candidates that survived the challenges`,
        total
          ? `The reviewer reported ${plural(total, "finding")} (${parts.join(", ")}), shown on each hypothesis`
          : "The reviewer found nothing to change",
        "You choose which hypotheses go forward at the end of the run",
      ],
      options: [
        {
          id: "approve",
          label: "Approve the set",
          description: "Keep the hypotheses as written and the findings on record.",
          leads_to: "The hypotheses are published with their evidence and argument map",
          confirm_label: "Approve the hypotheses",
          recommended: true,
        },
        {
          id: "drop",
          label: "Remove some first",
          description: "Drop hypotheses you don't want, or keep an idea the debate set aside.",
          leads_to: "The set is published with your changes",
          confirm_label: "Choose what to change",
        },
        {
          id: "revise",
          label: "Send back for revision",
          description: "Pick the findings to fix and add your own comments.",
          leads_to: "The hypotheses are rewritten to answer them and reviewed again",
          confirm_label: "Send back",
        },
      ],
      ...this.stop("hypotheses"),
      droppable: [...set],
      keepable: this.items<{ idea_id: string }>("idea.set_aside").map((p) => p.idea_id),
      review: {
        findings: this.review.raw.map(toFinding),
        hypotheses: set.map((h) => ({ id: h, label: drafts.get(h) ?? h })),
      },
    };
  }

  private acceptGate(id: string): Gate {
    const stageKey = this.gate?.stageKey ?? this.at?.stage_key ?? undefined;
    if (stageKey === DESIGN_STAGE) {
      return {
        id,
        kind: "accept",
        stageKey,
        title: this.designBlocked ? "Review the design hand-off" : "Accept the analysis plan",
        why: this.designBlocked?.includes(DESIGN_LOCK) ? "" : (this.designBlocked ?? ""),
        summary: [],
        options: this.designBlocked
          ? [
              {
                id: "send_back",
                label: "Send the design back",
                description: "Return to Experiment design to produce what Execution needs.",
                leads_to: "Experiment design runs again",
                confirm_label: "Send back",
              },
            ]
          : [
              {
                id: "accept",
                label: "Accept and continue to Execution",
                description: "Pass the registered analyses and decision rules to Execution.",
                leads_to: "Execution can begin",
                confirm_label: "Accept and continue",
                recommended: true,
              },
            ],
        stop_index: 1,
        stop_total: 1,
      };
    }
    if (!this.isHypothesisStage(stageKey)) {
      const subject = this.acceptSubject(stageKey);
      const execution = stageKey === EXECUTION_STAGE;
      return {
        id,
        kind: "accept",
        ...(stageKey === "dataset" || execution ? { stageKey } : {}),
        title: `Accept the ${subject}`,
        why: execution
          ? "Read the published results before recording your acceptance."
          : `The ${subject} is published and ready for the next stage. Accept it to continue the run.`,
        summary: execution ? [] : [`The ${subject} is ready to pass to the next stage.`],
        options: [
          {
            id: "accept",
            label: `Accept the ${subject}`,
            description: execution ? "" : `Use this published ${subject} in the next stage.`,
            leads_to: execution ? "Acceptance recorded" : "The next stage can begin",
            confirm_label: "Accept",
            recommended: true,
          },
        ],
        stop_index: 1,
        stop_total: 1,
        ...(this.advice.stage_outcome ? { advice: this.advice.stage_outcome } : {}),
      };
    }

    const set = this.final();
    const drafts = this.drafts();
    const published = new Map(this.publishedDetails?.hypotheses.map((h) => [h.id, h]));
    return {
      id,
      kind: "accept",
      title: "Accept the hypotheses",
      why: this.run.continuesToDesign
        ? "The published hypotheses you pick go forward to Experiment design."
        : "The hypotheses and their map are published. Accepting closes the run with the ones you pick.",
      summary: [
        `${plural(set.length, "hypothesis", "hypotheses")} published with the argument map and research canvas`,
        "Uncheck any you do not want to take forward",
      ],
      options: [
        {
          id: "accept",
          label: "Accept the picked hypotheses",
          description: this.run.continuesToDesign
            ? "Design the analyses for the hypotheses you pick."
            : "They become this run's result.",
          leads_to: this.run.continuesToDesign ? "Experiment design starts" : "The run is complete",
          confirm_label: "Accept",
          recommended: true,
        },
      ],
      ...this.stop("accept"),
      ...(this.advice.stage_outcome ? { advice: this.advice.stage_outcome } : {}),
      selection: set.map((h) => ({
        id: h,
        label: drafts.get(h) ?? published.get(h)?.statement ?? h,
        ...(!drafts.has(h) && published.has(h) ? { fromArtifact: true } : {}),
        ...(published.get(h)?.falsify ? { falsify: published.get(h)?.falsify } : {}),
      })),
      ...(!set.length && this.pendingPublication ? { selectionPending: true } : {}),
    };
  }

  private isHypothesisStage(stageKey?: string) {
    return (
      stageKey === "hypothesis" ||
      stageKey === "hypothesize" ||
      stageKey === "map" ||
      (!stageKey && (this.screen?.stage === "hypothesize" || this.screen?.stage === "map"))
    );
  }

  private acceptSubject(stageKey?: string) {
    if (stageKey === "dataset") return "data card";
    if (stageKey === DESIGN_STAGE) return "analysis plan";
    if (stageKey === EXECUTION_STAGE) return "execution results";
    if (this.isHypothesisStage(stageKey)) return "hypotheses";
    const label = stageKey?.replace(/[_-]+/g, " ").trim();
    return label || "stage";
  }

  /** The one-line record of an answer, as a Popper run words it. */
  private answered(kind: GateKind, option: string, dropped: string[], comments: number, kept = 0) {
    if (kind === "decision") return "Answered the question.";
    if (option === "reject")
      return kind === "screen" ? "Asked for a new search." : "Asked for a new set of hypotheses.";
    if (option === "comment") return `Sent the hypotheses back for revision with ${plural(comments, "comment")}.`;
    const noun = kind === "screen" ? "shortlist" : "hypotheses";
    const without = dropped.length
      ? ` without ${plural(dropped.length, kind === "screen" ? "paper" : "hypothesis", kind === "screen" ? "papers" : "hypotheses")}`
      : "";
    const keeping = kept ? ` and kept ${plural(kept, "set-aside idea")}` : "";
    return `Approved the ${noun}${without}${keeping}.`;
  }

  /** What a step produced, said when it closes (it goes to the activity feed), or null. */
  private note(step: string): string | null {
    const count = (kind: string) => this.items(kind).length;
    switch (step) {
      case "goal": {
        const title = this.items<{ field: string; value: string }>("scope.goal").find((g) => g.field === "title");
        return title ? `Research goal set: “${title.value}”.` : count("scope.goal") ? "Research goal set." : null;
      }
      case "decompose":
        return count("problem.subquestion")
          ? `${plural(count("problem.subquestion"), "sub-question")}, ranked by priority.`
          : null;
      case "evaluate": {
        const score = this.items<{ overall: number }>("topic.evaluated")[0];
        return score ? `Topic scored ${score.overall} of 10 before any search.` : null;
      }
      case "strategy":
        if (this.items("search.strategy").some((item) => item.review_round !== undefined))
          return `${plural(count("search.strategy"), "search round")} with ${plural(count("search.query"), "query", "queries")}.`;
        return count("search.query")
          ? `${plural(count("search.strategy"), "strategy", "strategies")}, ${plural(count("search.query"), "query", "queries")}.`
          : null;
      case "collect": {
        const c = this.items<{
          raw: number;
          unique: number;
          duplicates: number;
          review_round?: number;
          round_answered?: boolean;
        }>("literature.collected")[0];
        if (c?.review_round !== undefined)
          return c.round_answered
            ? `${c.raw} hits across the search · ${c.unique} unique papers.`
            : `No provider answered search round ${c.review_round} successfully.`;
        return c ? `${c.raw} hits, ${c.unique} unique papers, ${c.duplicates} duplicates merged.` : null;
      }
      case "score": {
        const review = this.items<{ done: number; total: number; state: string }>("screen.review_progress")[0];
        if (review) return `${review.done} of ${review.total} selected papers screened.`;
        const scored = this.items<{ points: unknown[] }>("screen.scored").reduce((a, p) => a + p.points.length, 0);
        return scored ? `${plural(scored, "paper")} scored for relevance and quality.` : null;
      }
      case "shortlist": {
        const kept = this.kept().length;
        return kept ? `${plural(kept, "paper")} kept, each with a reason.` : null;
      }
      case "extract":
        return count("card.extracted") ? `${plural(count("card.extracted"), "knowledge card")} written.` : null;
      case "cluster":
        return count("synthesis.cluster") ? `${plural(count("synthesis.cluster"), "school")} of thought.` : null;
      case "tension":
        return count("synthesis.tension") ? `${plural(count("synthesis.tension"), "tension")} between them.` : null;
      case "gaps":
        return count("synthesis.gap") ? `${plural(count("synthesis.gap"), "gap")}, each traced to its cards.` : null;
      case "debate":
        return count("debate.turn") ? `${plural(count("debate.turn"), "turn")} in the debate.` : null;
      case "write":
        return count("hypothesis.drafted")
          ? `${plural(count("hypothesis.drafted"), "hypothesis", "hypotheses")} written, each with a way to be wrong.`
          : null;
      case "review": {
        const total = this.review.raw.length;
        return total ? `The reviewer reported ${plural(total, "finding")}.` : "The reviewer found nothing to change.";
      }
      case "check":
        return count("hypothesis.checked")
          ? `${plural(count("hypothesis.checked"), "prediction")} checked against the literature.`
          : null;
      case "canvas": {
        const pieces = this.items<{ piece: { status?: string } }>("canvas.piece");
        const filled = pieces.filter((p) => p.piece.status === "filled").length;
        return pieces.length ? `${filled} of ${pieces.length} canvas pieces filled.` : null;
      }
      default:
        return null;
    }
  }

  private summary(key: string) {
    const count = (kind: string) => this.items(kind).length;
    switch (key) {
      case DESIGN_STAGE:
        return "Analysis plan accepted for Execution.";
      case "scope": {
        if (this.claimScope && !count("scope.goal") && !count("problem.subquestion") && !count("topic.evaluated"))
          return claimScopeSummary(this.claimScope);
        const overall = this.items<{ overall: number }>("topic.evaluated")[0]?.overall;
        return [
          "Goal set",
          `${plural(count("problem.subquestion"), "sub-question")}, ranked`,
          ...(overall !== undefined && Number.isFinite(overall) ? [`topic scored ${overall} of 10`] : []),
        ].join(" • ");
      }
      case "search": {
        const c = this.items<{
          raw: number;
          unique: number;
          duplicates: number;
          review_round?: number;
          round_answered?: boolean;
        }>("literature.collected")[0];
        if (c?.review_round !== undefined)
          return c.round_answered
            ? `${c.raw} hits • ${c.unique} unique papers`
            : `No provider answered search round ${c.review_round} successfully`;
        return c
          ? `${c.raw} hits • ${c.unique} unique papers • ${c.duplicates} duplicates merged`
          : "Candidate totals were not published";
      }
      case "screen": {
        const kept = this.kept().length;
        const eligibility = this.items<EligibilityDecision>("screen.eligibility");
        const progress = this.items<{ not_screened: number }>("screen.review_progress")[0];
        if (progress)
          return `${eligibility.length} screened • ${kept} kept • ${eligibility.length - kept} excluded${progress.not_screened ? ` • ${progress.not_screened} left unscreened` : ""}`;
        const excluded = Object.values(this.excluded()).reduce((a, b) => a + b, 0);
        const recordedCandidates = this.items<{ candidates?: number }>("screen.criteria")[0]?.candidates;
        if (recordedCandidates === undefined && kept + excluded === 0)
          return count("screen.scored") ? "Screening scores recorded" : "No screening results recorded";
        const candidates = recordedCandidates ?? kept + excluded;
        return `${candidates} candidates • ${kept} kept • ${candidates - kept} excluded`;
      }
      case "read":
        return plural(count("card.extracted"), "knowledge card");
      case "synthesize": {
        const ranked = this.items<{ gaps?: unknown[] }>("synthesis.ranked")[0]?.gaps;
        if (ranked) return ranked.length ? `${plural(ranked.length, "ranked gap")} shown` : "No gaps ranked";
        return `${plural(count("synthesis.cluster"), "group")} • ${plural(count("synthesis.tension"), "tension")} • ${plural(count("synthesis.gap"), "gap")}`;
      }
      case "map": {
        const pieces = this.items<{ piece: { status?: string } }>("canvas.piece");
        const filled = pieces.filter((p) => p.piece.status === "filled").length;
        return `${plural(count("map.node"), "entity", "entities")} • ${plural(count("map.edge"), "relation")} • ${filled} of ${pieces.length} canvas pieces filled; findings wait for the experiment`;
      }
      default: {
        // A round of hypotheses, `r2-hypothesize`: summed up with its own content, before the next round starts.
        const round = /^r(\d+)-hypothesize$/.exec(key)?.[1];
        if (!round) return "";
        const set = plural(this.set().length, "hypothesis", "hypotheses");
        const back = this.sentBack[Number(round)];
        if (!back) return `${set} to test, each with a way to be wrong`;
        return back.by === "reviewer"
          ? `${set} sent back by the reviewer with ${plural(back.count, "blocking finding")}`
          : `${set} sent back for revision with ${plural(back.count, "comment")}`;
      }
    }
  }
}
