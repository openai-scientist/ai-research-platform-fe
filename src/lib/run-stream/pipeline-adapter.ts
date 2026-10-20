// Pipeline runs: the backend runs a research run as stages on engines (`hypothesis` on idea2hypothesis) and relays
// each engine's events in one envelope (`class`, `step_key`, `phase`, `stage_run_id`). The engine's content events
// (`i2h.<type>`) carry the same payloads as a Popper run; the run, stage, step and gate events do not. This adapter
// turns the envelopes back into the run studio's events, so the reducer and every scene work as they do for Popper.

import type {
  AgentRole,
  Gate,
  GateAnswer,
  GateKind,
  PlannedStage,
  ReviewFinding,
  ReviewMode,
  RoundKind,
  RunEvent,
  RunStage,
  StagePlan,
  StagePlanStep,
} from "./contract";

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
  payload: Record<string, unknown>;
}

/** Where an answer goes: a gate of the engine, or the accept of a finished stage. */
export type GateRoute =
  | {
      to: "gate";
      stageRunId: string;
      kind: "question" | "artifact_review";
      /** For a hypotheses gate: the set under review, and the reviewer's findings as the engine sent them. */
      artifactId?: string;
      findings?: Record<string, unknown>[];
    }
  | { to: "accept"; stageRunId: string; hypothesisIds: string[] };

type Step = Omit<StagePlanStep, "id">;

// The engine's steps (idea2hypothesis `platform_events._STEPS`), plus the independent review and the accept.
const STEPS: Record<string, Step> = {
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
    explain: "Search strategies and queries, each tied to sub-questions.",
  },
  collect: {
    title: "Collect candidates",
    actor: "librarian",
    pipeline_stage: 4,
    artifact: "Candidate list",
    explain: "Every query goes to every configured source; duplicates are merged.",
  },
  score: {
    title: "Score every paper",
    actor: "librarian",
    pipeline_stage: 5,
    artifact: "Screened scores",
    explain: "Relevance and quality scores from 0 to 1.",
  },
  reject: {
    title: "Reject wrong-field matches",
    actor: "librarian",
    pipeline_stage: 5,
    explain: "Papers that share words but not the field are excluded with a reason.",
  },
  shortlist: {
    title: "Keep the shortlist",
    actor: "librarian",
    pipeline_stage: 5,
    artifact: "Shortlist",
    explain: "What clears both bars is kept with a one-line reason.",
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
    explain: "Read the review findings, then approve the set.",
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

// The engine's screens (idea2hypothesis `platform_events.GROUPS`), keyed as a Popper run keys them.
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
    steps: ["goal", "decompose", "evaluate"],
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
    purpose:
      "Every candidate is scored for relevance and quality; only papers that clear both bars are kept and every decision carries a reason.",
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
      "Several perspectives propose hypotheses; the final set links each one to a gap, to evidence and to the result that would prove it wrong. An independent reviewer checks the set before you see it.",
    reads: ["Gap map", "Shortlist"],
    steps: ["debate", "write", "check", "select", "review", "hypotheses_gate"],
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
    steps: ["questions", "foundation", "reasoning", "contribution", "canvas", "accept"],
  },
];

/** The engine's pipeline steps (`step_key`) and the screen each one shows on. */
const SCREEN_OF: Record<string, string> = {
  topic_init: "scope",
  problem_decompose: "scope",
  search_strategy: "search",
  literature_collect: "search",
  literature_screen: "screen",
  knowledge_extract: "read",
  synthesis: "synthesize",
  // Each round of hypotheses has its own screen, `r1-hypothesize`, `r2-hypothesize`…
  hypothesis_gen: "hypothesize",
  argument_map: "map",
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
  "screen.criteria": "score",
  "screen.scored": "score",
  "screen.kept": "shortlist",
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
const STOPS: GateKind[] = ["screen", "hypotheses", "accept"];

/** Room in `seq` for the events made from one envelope. */
const SPREAD = 64;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function stagePlan(screen: Screen): StagePlan {
  return {
    key: screen.key,
    stage: screen.stage,
    ...(screen.round ? { round: screen.round, round_kind: screen.round_kind } : {}),
    title: screen.title,
    has_gate: screen.steps.some((id) => STEPS[id].gate),
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
}

interface Counts {
  subQuestions: number;
  overall?: number;
  collected?: { raw: number; unique: number; duplicates: number };
  candidates?: number;
  kept: string[];
  excluded: Record<string, number>;
  cards: number;
  clusters: number;
  tensions: number;
  gaps: number;
  drafts: Map<string, string>;
  selected: string[];
  findings: Record<string, number>;
  nodes: number;
  edges: number;
  pieces: number;
  filled: number;
}

/**
 * Turns a pipeline run's envelopes, in `seq` order, into run studio events. It keeps what it has seen (the screen and
 * step the run is on, counts for the summaries, the open gate), so one adapter follows one run from its first event.
 */
export class PipelineAdapter {
  private started = false;
  private screen: Screen | null = null;
  /** Index of the furthest step reached on this screen; steps only move forward. */
  private reached = -1;
  private step: string | null = null;
  private stageRun: string | null = null;
  private gate: { id: string; kind: GateKind; engineKind: "question" | "artifact_review" | null } | null = null;
  private decision: Record<string, unknown> | null = null;
  private failed = false;
  /** The round of hypotheses: each set sent back for revision starts the next one. */
  private round = 1;
  /** Comments sent back at the last hypotheses gate; the next round answers them. */
  private sent: ReviewFinding[] | null = null;
  /** Comments each round was sent back with, by round. */
  private sentBack: Record<number, number> = {};
  /** This round's review: the findings as the engine sent them, and the set they are about. */
  private review: { raw: Record<string, unknown>[]; artifactId?: string } = { raw: [] };
  private counts: Counts = {
    subQuestions: 0,
    kept: [],
    excluded: {},
    cards: 0,
    clusters: 0,
    tensions: 0,
    gaps: 0,
    drafts: new Map(),
    selected: [],
    findings: {},
    nodes: 0,
    edges: 0,
    pieces: 0,
    filled: 0,
  };
  private out: RunEvent[] = [];
  private at: PipelineEnvelope | null = null;

  constructor(private readonly run: PipelineRunInfo) {}

  /** Where an answer to this gate goes, or null when the gate is not open. */
  route(gateId: string): GateRoute | null {
    if (!this.gate || this.gate.id !== gateId || !this.stageRun) return null;
    if (this.gate.kind === "accept") return { to: "accept", stageRunId: this.stageRun, hypothesisIds: this.set() };
    if (!this.gate.engineKind) return null;
    if (this.gate.engineKind === "question") return { to: "gate", stageRunId: this.stageRun, kind: "question" };
    return {
      to: "gate",
      stageRunId: this.stageRun,
      kind: "artifact_review",
      ...(this.review.artifactId ? { artifactId: this.review.artifactId } : {}),
      findings: [...this.review.raw],
    };
  }

  /** The screens of the run: one per round of hypotheses. */
  private screens(): Screen[] {
    return SCREENS.flatMap((screen) => {
      if (screen.stage !== "hypothesize") return [screen];
      return Array.from({ length: this.round }, (_, i) => ({
        ...screen,
        key: `r${i + 1}-hypothesize`,
        // Rounds are only told apart once there is more than one.
        ...(this.round > 1 ? { round: i + 1, round_kind: (i ? "revise" : "first") as RoundKind } : {}),
      }));
    });
  }

  /** The hypotheses came back to be revised: the next round gets its own screen. */
  private revise() {
    const sent = this.sent ?? [];
    this.sent = null;
    this.round += 1;
    this.emit("run.plan", { stages: this.screens().map(planned) });
    // The round before is completed with its own counts, then they start again.
    this.enter(`r${this.round}-hypothesize`);
    this.counts = { ...this.counts, drafts: new Map(), selected: [], findings: {} };
    this.review = { raw: [] };
    this.emit("review.sent", { findings: sent }, "reviewer");
  }

  convert(envelope: PipelineEnvelope): RunEvent[] {
    this.out = [];
    this.at = envelope;
    if (envelope.stage_run_id) this.stageRun = envelope.stage_run_id;
    if (!this.started) {
      this.started = true;
      this.emit("run.started", { mode: this.run.mode, topic: this.run.topic, domains: this.run.domains });
      this.emit("run.plan", { stages: this.screens().map(planned) });
    }
    if (this.sent && (envelope.phase === "revising" || envelope.step_key === "hypothesis_gen")) this.revise();
    const base = envelope.step_key ? SCREEN_OF[envelope.step_key] : undefined;
    const screen = base === "hypothesize" ? `r${this.round}-hypothesize` : base;
    if (screen && screen !== this.screen?.key && envelope.type !== "decision.recorded") this.enter(screen);

    const { type, payload } = envelope;
    if (type.startsWith("i2h.")) this.activity(type.slice(4), payload, envelope.actor);
    else this.lifecycle(type, payload, envelope.phase);
    return this.out;
  }

  private emit(type: RunEvent["type"], payload: unknown, actor?: AgentRole) {
    const at = this.at as PipelineEnvelope;
    this.out.push({
      seq: at.seq * SPREAD + this.out.length,
      run_id: at.run_id,
      ts: at.ts,
      type,
      ...(this.screen && type !== "run.started" && type !== "run.plan" ? { stage_key: this.screen.key } : {}),
      ...(actor ? { actor } : {}),
      payload,
    } as RunEvent);
  }

  private enter(key: string) {
    const next = this.screens().find((s) => s.key === key);
    if (!next) return;
    if (this.screen) {
      this.closeStep();
      this.emit("stage.completed", { summary: this.summary(this.screen.key) });
    }
    this.screen = next;
    this.reached = -1;
    this.emit("stage.started", { plan: stagePlan(next) });
  }

  /** Starts a step of this screen, unless the run is already past it. */
  private openStep(id: string) {
    if (!this.screen) return;
    const index = this.screen.steps.indexOf(id);
    if (index <= this.reached) return;
    this.closeStep();
    this.reached = index;
    this.step = id;
    this.emit("step.started", { step_id: id }, STEPS[id].actor);
  }

  private closeStep() {
    if (!this.step) return;
    this.emit("step.completed", { step_id: this.step });
    this.step = null;
  }

  private activity(kind: string, payload: Record<string, unknown>, rawActor?: string | null) {
    if (kind === "question.defaulted") return;
    const actor = rawActor && ROLES.has(rawActor) ? (rawActor as AgentRole) : undefined;
    if (kind === "agent.message") {
      const step = String(payload.message_id ?? "")
        .split(".")
        .pop();
      if (step && STEPS[step]) this.openStep(step);
      this.emit("agent.message", payload, actor ?? (this.step ? STEPS[this.step].actor : undefined));
      return;
    }
    const step = this.stepOf(kind, payload);
    if (step) this.openStep(step);
    this.observe(kind, payload);
    if (kind === "review.finding") {
      this.review.raw.push(payload);
      this.emit("review.finding", { finding: toFinding(payload) }, "reviewer");
      return;
    }
    this.emit(kind as RunEvent["type"], payload, actor);
  }

  private stepOf(kind: string, payload: Record<string, unknown>) {
    if (kind === "map.node") return MAP_STEP[String((payload.node as { type?: string } | undefined)?.type)];
    if (kind === "map.edge") return MAP_STEP[String((payload.edge as { relation?: string } | undefined)?.relation)];
    return OPENS[kind];
  }

  /** Counts kept for the stage summaries and the review stops. */
  private observe(kind: string, payload: Record<string, unknown>) {
    const c = this.counts;
    switch (kind) {
      case "problem.subquestion":
        c.subQuestions += 1;
        break;
      case "topic.evaluated":
        c.overall = Number(payload.overall);
        break;
      case "literature.collected":
        c.collected = payload as unknown as Counts["collected"];
        break;
      case "screen.criteria":
        if (typeof payload.candidates === "number") c.candidates = payload.candidates;
        break;
      case "screen.kept": {
        const id = (payload.paper as { id?: string } | undefined)?.id;
        if (id && !c.kept.includes(id)) c.kept.push(id);
        break;
      }
      case "screen.rejected": {
        const decision = (payload.paper as { decision?: string } | undefined)?.decision ?? "rejected";
        c.excluded[decision] = (c.excluded[decision] ?? 0) + 1;
        break;
      }
      case "card.extracted":
        c.cards += 1;
        break;
      case "synthesis.cluster":
        c.clusters += 1;
        break;
      case "synthesis.tension":
        c.tensions += 1;
        break;
      case "synthesis.gap":
        c.gaps += 1;
        break;
      case "hypothesis.drafted": {
        const h = payload.hypothesis as { id?: string; short?: string; statement?: string } | undefined;
        if (h?.id) c.drafts.set(h.id, [h.short, h.statement].find(Boolean) ?? h.id);
        break;
      }
      case "hypothesis.selected": {
        const id = String(payload.hypothesis_id ?? "");
        if (id && !c.selected.includes(id)) c.selected.push(id);
        break;
      }
      case "review.finding": {
        const severity = String(payload.severity ?? "minor");
        c.findings[severity] = (c.findings[severity] ?? 0) + 1;
        break;
      }
      case "map.node":
        c.nodes += 1;
        break;
      case "map.edge":
        c.edges += 1;
        break;
      case "canvas.piece":
        c.pieces += 1;
        if ((payload.piece as { status?: string } | undefined)?.status === "filled") c.filled += 1;
        break;
    }
  }

  private lifecycle(type: string, payload: Record<string, unknown>, phase?: string | null) {
    switch (type) {
      case "run.phase_changed":
        if (phase === "reviewing") this.openStep("review");
        if (phase === "paused") this.emit("run.status", { status: "paused" });
        else if (payload.from === "paused") this.emit("run.status", { status: "running" });
        break;
      case "run.gate_opened":
        this.openGate(payload);
        break;
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
        this.fail(String(payload.message || "The engine could not finish this run."));
        break;
      case "run.cancelled":
        this.fail("The run was cancelled.");
        break;
    }
  }

  private openGate(payload: Record<string, unknown>) {
    const engineKind = payload.kind === "artifact_review" ? "artifact_review" : "question";
    const id = String(payload.gate_id ?? "");
    const kind: GateKind = engineKind === "artifact_review" ? "hypotheses" : "screen";
    const reviewed = (payload.artifact_ids as string[] | undefined)?.[0];
    if (kind === "hypotheses" && reviewed) this.review.artifactId = reviewed;
    this.openStep(kind === "screen" ? "screen_gate" : "hypotheses_gate");
    this.gate = { id, kind, engineKind };
    this.decision = null;
    this.emit("run.status", { status: "awaiting_review" });
    this.emit("gate.opened", { gate: kind === "screen" ? this.screenGate(id) : this.hypothesesGate(id) }, "pi");
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
      this.sentBack[this.round] = this.sent.length;
    }
    const answer: GateAnswer = {
      option_id: option,
      ...(dropped.length ? { dropped } : {}),
      ...(params.kept?.length ? { kept: params.kept } : {}),
      ...(decision.text ? { note: String(decision.text) } : {}),
    };
    const summary = this.answered(gate.kind, option, dropped, this.sent?.length ?? 0);
    this.emit("gate.resolved", { gate_id: gateId, answer, summary }, "pi");
    this.closeStep();
    this.gate = null;
    this.decision = null;
    this.emit("run.status", { status: "running" });
  }

  private stageStatus(status: string, reason?: unknown) {
    if (status === "COMPLETED") {
      this.openStep("accept");
      this.gate = { id: `accept-${this.stageRun ?? "stage"}`, kind: "accept", engineKind: null };
      this.emit("run.status", { status: "awaiting_review" });
      this.emit("gate.opened", { gate: this.acceptGate(this.gate.id) }, "pi");
    } else if (status === "ACCEPTED") {
      const selection = ((this.decision?.selection ?? {}) as { hypothesis_ids?: string[] }).hypothesis_ids;
      const set = this.set();
      const taken = selection ?? set;
      const dropped = set.filter((id) => !taken.includes(id));
      if (this.gate?.kind === "accept") {
        const answer: GateAnswer = {
          option_id: "accept",
          ...(dropped.length ? { dropped } : {}),
          ...(this.decision?.note ? { note: String(this.decision.note) } : {}),
        };
        const summary = `Accepted ${taken.length === set.length ? `all ${set.length}` : `${taken.length} of ${set.length}`} hypotheses: ${taken.join(", ")}.`;
        this.emit("gate.resolved", { gate_id: this.gate.id, answer, summary }, "pi");
      }
      this.gate = null;
      this.decision = null;
      this.closeStep();
      if (this.screen) this.emit("stage.completed", { summary: this.summary(this.screen.key) });
      this.emit("run.completed", {});
    } else if (status === "FAILED") this.fail("The engine could not finish this run.");
    else if (status === "STOPPED")
      this.fail(
        reason === "project_budget_exceeded"
          ? "The run stopped because the project reached its monthly model budget. A Project Manager can raise the limit in Settings → Spending."
          : "The run was stopped.",
      );
  }

  private fail(reason: string) {
    if (this.failed) return;
    this.failed = true;
    this.gate = null;
    this.emit("run.status", { status: "failed", reason });
  }

  /** The hypotheses in the set, in the order they were picked. */
  private set() {
    const { selected, drafts } = this.counts;
    return selected.length ? selected : [...drafts.keys()];
  }

  private stop(kind: GateKind) {
    return { stop_index: STOPS.indexOf(kind) + 1, stop_total: STOPS.length };
  }

  private screenGate(id: string): Gate {
    const { kept, excluded, collected, candidates } = this.counts;
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
    const f = this.counts.findings;
    const total = (f.blocking ?? 0) + (f.major ?? 0) + (f.minor ?? 0);
    const parts = (["blocking", "major", "minor"] as const).filter((s) => f[s]).map((s) => `${f[s]} ${s}`);
    const revised = this.round > 1;
    return {
      id,
      kind: "hypotheses",
      title: revised ? `Approve the revised hypotheses` : "Approve the hypotheses",
      why: revised
        ? "The hypotheses were rewritten to answer your comments, and the reviewer has read them again. Approve them, or send them back once more."
        : "An independent reviewer has read the set. Approve it, or send it back to be revised with the findings you pick.",
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
          leads_to: "The argument map and research canvas are drawn from them",
          confirm_label: "Approve the hypotheses",
          recommended: true,
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
      review: {
        findings: this.review.raw.map(toFinding),
        hypotheses: set.map((h) => ({ id: h, label: this.counts.drafts.get(h) ?? h })),
      },
    };
  }

  private acceptGate(id: string): Gate {
    const set = this.set();
    return {
      id,
      kind: "accept",
      title: "Accept the hypotheses",
      why: "The hypotheses and their map are published. Accepting closes the run with the ones you pick.",
      summary: [
        `${plural(set.length, "hypothesis", "hypotheses")} published with the argument map and research canvas`,
        "Uncheck any you do not want to take forward",
      ],
      options: [
        {
          id: "accept",
          label: "Accept the picked hypotheses",
          description: "They become this run's result.",
          leads_to: "The run is complete",
          confirm_label: "Accept",
          recommended: true,
        },
      ],
      ...this.stop("accept"),
      selection: set.map((h) => ({ id: h, label: this.counts.drafts.get(h) ?? h })),
    };
  }

  /** The one-line record of an answer, as a Popper run words it. */
  private answered(kind: GateKind, option: string, dropped: string[], comments: number) {
    if (option === "reject")
      return kind === "screen" ? "Asked for a new search." : "Asked for a new set of hypotheses.";
    if (option === "comment") return `Sent the hypotheses back for revision with ${plural(comments, "comment")}.`;
    const noun = kind === "screen" ? "shortlist" : "hypotheses";
    const without = dropped.length
      ? ` without ${plural(dropped.length, kind === "screen" ? "paper" : "hypothesis", kind === "screen" ? "papers" : "hypotheses")}`
      : "";
    return `Approved the ${noun}${without}.`;
  }

  private summary(key: string) {
    const c = this.counts;
    switch (key) {
      case "scope":
        return [
          "Goal set",
          `${plural(c.subQuestions, "sub-question")}, ranked`,
          ...(c.overall !== undefined && Number.isFinite(c.overall) ? [`topic scored ${c.overall} of 10`] : []),
        ].join(" • ");
      case "search":
        return c.collected
          ? `${c.collected.raw} hits • ${c.collected.unique} unique papers • ${c.collected.duplicates} duplicates merged`
          : "Search finished";
      case "screen": {
        const excluded = Object.values(c.excluded).reduce((a, b) => a + b, 0);
        const candidates = c.candidates ?? c.kept.length + excluded;
        return `${candidates} candidates • ${c.kept.length} kept • ${candidates - c.kept.length} excluded`;
      }
      case "read":
        return plural(c.cards, "knowledge card");
      case "synthesize":
        return `${plural(c.clusters, "group")} • ${plural(c.tensions, "tension")} • ${plural(c.gaps, "gap")}`;

      case "map":
        return `${plural(c.nodes, "entity", "entities")} • ${plural(c.edges, "relation")} • ${c.filled} of ${c.pieces} canvas pieces filled; findings wait for the experiment`;
      default: {
        // A round of hypotheses, `r2-hypothesize`: summed up with its own counts, before the next round starts.
        const round = /^r(\d+)-hypothesize$/.exec(key)?.[1];
        if (!round) return "";
        const set = plural(this.set().length, "hypothesis", "hypotheses");
        const back = this.sentBack[Number(round)];
        return back === undefined
          ? `${set} to test, each with a way to be wrong`
          : `${set} sent back for revision with ${plural(back, "comment")}`;
      }
    }
  }
}
