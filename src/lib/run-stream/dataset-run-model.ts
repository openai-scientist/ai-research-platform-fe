// The Dataset stage's own run model. Its engine (`logos/stages/dataset`) reports a contract of items that a
// steward agent repairs and code checks, then an independent review and a hand-off. The Platform relays those events
// in the envelope Research runs use. Both Dataset views fold those original events into this model.
// Event names and item keys are the engine's: `dataset.item`, `dataset.review`,
// `dataset.progress`, `dataset.action`, `dataset.ask_user`, `dataset.decision`, `dataset.inbox_item`,
// `dataset.assumption`, plus the lifecycle events `run.step_changed`, `run.phase_changed`, `run.gate_opened`,
// `run.gate_closed`, `artifact.delivered`, `run.published`, `run.failed`, `run.cancelled`.

import type { PipelineEnvelope } from "@/lib/run-stream/pipeline-adapter";

export const RELEASE_WAIT = "Waiting for release review on the Local Node.";

export type DatasetAgent = "steward" | "reviewer" | "code" | "pi" | "you";

export const DATASET_CAST = ["steward", "reviewer", "pi"] as const;

export type ItemState = "unknown" | "red" | "green" | "needs_you" | "not_applicable";

export interface DatasetStepDef {
  key: string;
  title: string;
  /** One word for the step track. */
  short: string;
  explain: string;
  /** Left out until the engine says it applies (it is not applicable for most runs). */
  optional?: boolean;
}

/** The contract items of the dataset engine, in its order, and the closing review. */
export const STEP_DEFS: DatasetStepDef[] = [
  { key: "sources", short: "Sources", title: "Record the sources", explain: "Hash, licence and role of each file." },
  { key: "table_model", short: "Tables", title: "Model the tables", explain: "Which tables and keys the file holds." },
  {
    key: "profile_quality",
    short: "Quality",
    title: "Check data quality",
    explain: "Profile every column and screen the table.",
  },
  {
    key: "dictionary",
    short: "Dictionary",
    title: "Write the dictionary",
    explain: "Meaning, type, role and time axis of each column.",
  },
  {
    key: "cleaning_recipe",
    short: "Cleaning",
    title: "Plan the cleaning",
    explain: "Steps that fix wrong values only.",
  },
  {
    key: "question_map",
    short: "Question",
    title: "Link the question",
    explain: "Which columns answer your question.",
  },
  { key: "split", short: "Split", title: "Split the rows", explain: "Fix the partition before any analysis." },
  {
    key: "data_checks",
    short: "Checks",
    title: "Run the data checks",
    explain: "Rules run by code, as counts of failing rows.",
  },
  { key: "fitness", short: "Fitness", title: "Judge fitness", explain: "Whether the data can answer the question." },
  {
    key: "disclosure",
    short: "Data card",
    title: "Build the data card",
    explain: "The variable table the next stages read.",
  },
  {
    key: "harmonisation",
    short: "Pairing",
    title: "Pair with the validation source",
    explain: "Columns matched to a second source.",
    optional: true,
  },
  {
    key: "gap_search",
    short: "Public data",
    title: "Search public data",
    explain: "Open datasets for the gaps.",
    optional: true,
  },
];

/** The engine's own step after the contract is met: an independent review, then the hand-off you accept. */
export const REVIEW_KEY = "review";
export const REVIEW_DEF: DatasetStepDef = {
  key: REVIEW_KEY,
  short: "Review",
  title: "Review and hand off",
  explain: "An independent reviewer reads the card; you accept it at the end.",
};
/** A local version's rounded card must be released by you on the Local Node before the engine reads it. */
export const RELEASE_KEY = "release";
export const RELEASE_DEF: DatasetStepDef = {
  key: RELEASE_KEY,
  short: "Release",
  title: "Review the release",
  explain: "You approve what leaves the Local Node. Rows never do.",
};

const STEP_ARTIFACTS: Record<string, string> = {
  sources: "Source records",
  dictionary: "Data dictionary",
  cleaning_recipe: "Cleaning recipe",
  question_map: "Question map",
  split: "Partition",
  data_checks: "Check results",
  disclosure: "Data card",
  review: "Dataset brief",
};

export const datasetStepArtifact = (key: string): string | undefined => STEP_ARTIFACTS[key];

export interface FeedItem {
  seq: number;
  actor: DatasetAgent;
  text: string;
  kind: "event" | "message";
}

export interface GateOption {
  id: string;
  label: string;
}

export interface GateView {
  id: string;
  prompt: string;
  options?: GateOption[];
  recommended?: string;
}

export interface DatasetRunModel {
  lastSeq: number;
  startedAt?: string;
  stepStartedAt?: string;
  /** Item key to its state and what code says about it. */
  items: Record<string, { state: ItemState; reason?: string; tokens?: number }>;
  /** The engine's step: `work` repairs items, `review` reviews and hands off. */
  engineStep: "work" | "review" | null;
  phase: string | null;
  pauseReason?: string;
  review: { object: string; round: number; findings: number; blocking: number } | null;
  reviewResult?: { round: number; passed?: boolean; artifactId?: string; error?: boolean };
  /** The long computation going on now, as the engine words it. */
  progress: { task: string; state: "running" | "done"; seconds: number; text: string } | null;
  message: { actor: DatasetAgent; text: string } | null;
  /** What the newest `dataset.item`, `dataset.progress` or `dataset.action` was about: `item:<key>` or `progress`. */
  cursor: string | null;
  feed: FeedItem[];
  gate: GateView | null;
  /** The stage run the gate answers go to (from the envelope). */
  stageRunId?: string;
  releaseWait: boolean;
  /** The run waited for your release decision at some point; when it never did, the Node sent the release itself. */
  releaseAsked?: boolean;
  /** Durable Local Node review state, by Dataset stage run (including resolved with false). */
  localNodeReviews?: Record<string, boolean>;
  /** Schemas the run delivered, such as `dataset.data_card/v1`. */
  delivered: string[];
  dataCardArtifactId?: string;
  published: boolean;
  accepted?: boolean;
  readyToAccept?: boolean;
  /** The question put to you when the stage is complete: accept it or not. `decided` once an answer is recorded. */
  /** The PI's plan for the run: drafted, ready for you to endorse, then settled. Null when the run has none. */
  charter: { consultationId?: string; authority?: string; ready: boolean; settled: boolean } | null;
  outcome: { consultationId?: string; action?: string; confidence?: number; decided: boolean } | null;
  failure?: { message: string; code?: string };
  superseded?: { by?: number };
  tokens: number;
  stalledMinutes?: number;
}

export const emptyDatasetRun = (): DatasetRunModel => ({
  lastSeq: 0,
  items: {},
  engineStep: null,
  phase: null,
  review: null,
  progress: null,
  cursor: null,
  message: null,
  feed: [],
  gate: null,
  releaseWait: false,
  delivered: [],
  published: false,
  charter: null,
  outcome: null,
  tokens: 0,
});

const FEED_LIMIT = 200;
const ITEM_STATES = new Set<string>(["red", "green", "needs_you", "not_applicable"]);

const str = (value: unknown) => (typeof value === "string" ? value : undefined);
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/** Who an engine event is from: code checks and reports progress, the reviewer reviews, the steward does the rest. */
function actorOf(kind: string): DatasetAgent {
  if (kind === "item" || kind === "progress") return "code";
  if (kind === "review") return "reviewer";
  return "steward";
}

function gateOptions(payload: Record<string, unknown>): Pick<GateView, "options" | "recommended"> {
  const options = (Array.isArray(payload.options) ? payload.options : []).flatMap((raw): GateOption[] => {
    const o = raw as Record<string, unknown>;
    const id = str(o?.option_id) ?? str(o?.id);
    return id ? [{ id, label: str(o.label) ?? id }] : [];
  });
  const recommended = str(payload.default_option_id);
  return { ...(options.length ? { options } : {}), ...(recommended ? { recommended } : {}) };
}

/** Span and timing names from the engine's trace ("derive screening: 34 ms", "fanout search[13]"): never shown as work. */
export const isTraceText = (text: string) =>
  /\b\d+(\.\d+)?\s*ms\b/i.test(text) || /\b[a-z_]+\[\d+\]/i.test(text) || /\bfan-?out\b/i.test(text);

/** What the step being worked on does, in words; used in place of trace text. */
function humanStepLine(model: DatasetRunModel): string | undefined {
  const key = model.cursor?.startsWith("item:")
    ? model.cursor.slice(5)
    : model.progress
      ? PROGRESS_STEP[model.progress.task]
      : undefined;
  return STEP_DEFS.find((def) => def.key === key)?.explain;
}

/** Folds one stored event of a Dataset run into the model. A replayed event (`seq` not above the last) is ignored. */
export function applyDatasetEvent(previous: DatasetRunModel, event: PipelineEnvelope): DatasetRunModel {
  if (event.seq <= previous.lastSeq) return previous;
  const model: DatasetRunModel = { ...previous, lastSeq: event.seq, items: { ...previous.items } };
  delete model.stalledMinutes;
  model.startedAt ??= event.ts;
  const { type, payload } = event;
  const stageRun = event.stage_run_id ?? str(payload.stage_run_id);
  if (type === "dataset.local_node_review") {
    if (event.stage_key === "dataset" && stageRun && typeof payload.pending === "boolean")
      model.localNodeReviews = { ...model.localNodeReviews, [stageRun]: payload.pending };
    return model;
  }
  if (stageRun) model.stageRunId = stageRun;
  const rawSummary = event.summary?.trim() || undefined;
  const summary = rawSummary && isTraceText(rawSummary) ? humanStepLine(model) : rawSummary;
  const say = (actor: DatasetAgent, text: string | undefined, kind: FeedItem["kind"] = "event") => {
    if (!text) return;
    model.feed = [...model.feed, { seq: event.seq, actor, text, kind }].slice(-FEED_LIMIT);
    model.message = { actor, text };
  };
  // Anything but the wait itself ends it.
  if (summary !== RELEASE_WAIT && str(payload.text) !== RELEASE_WAIT) model.releaseWait = false;

  if (type.startsWith("dataset.") && type !== "dataset.superseded") {
    const kind = type.slice("dataset.".length);
    if (summary === RELEASE_WAIT || str(payload.text) === RELEASE_WAIT || str(payload.message) === RELEASE_WAIT) {
      model.releaseWait = true;
      model.releaseAsked = true;
      say("code", RELEASE_WAIT);
      return model;
    }
    if (kind === "item") {
      const key = str(payload.key);
      const state = str(payload.state);
      if (key && state && ITEM_STATES.has(state)) {
        model.items[key] = {
          state: state as ItemState,
          ...(str(payload.reason) ? { reason: str(payload.reason) } : {}),
          ...(num(payload.spent_tokens) ? { tokens: num(payload.spent_tokens) } : {}),
        };
      }
      if (key && state !== "not_applicable") model.cursor = `item:${key}`;
      // The first item says the engine has the card: the release, if any, is behind it.
      model.stepStartedAt ??= event.ts;
    } else if (kind === "review") {
      model.review = {
        object: str(payload.object) ?? "data_card",
        round: num(payload.round) ?? 1,
        findings: num(payload.findings) ?? 0,
        blocking: num(payload.blocking) ?? 0,
      };
    } else if (kind === "progress") {
      const state = payload.state === "done" ? "done" : "running";
      model.progress = {
        task: str(payload.task) ?? "",
        state,
        seconds: num(payload.seconds) ?? 0,
        text: summary ?? "Computing over the table",
      };
      if (state === "done") model.progress = null;
      else model.cursor = "progress";
    } else if (kind === "action") {
      const touched = (Array.isArray(payload.affected) ? payload.affected : []).find((a) =>
        STEP_DEFS.some((def) => def.key === a),
      );
      if (typeof touched === "string") model.cursor = `item:${touched}`;
    }
    // A question or review batch carries its whole prompt; the narration keeps its first line.
    const line = summary?.split("\n")[0].replace(/^(Asking:\s*)?(Decision:\s*)?/, "");
    say(actorOf(kind), kind === "ask_user" || kind === "inbox_item" ? line : summary);
    return model;
  }

  switch (type) {
    case "stage.status_changed":
      if (payload.status === "ACCEPTED") {
        model.accepted = true;
        model.readyToAccept = false;
      } else if (!model.accepted) {
        model.readyToAccept = payload.status === "COMPLETED";
      }
      break;
    case "dataset.superseded":
      if (payload.dataset_superseded === true) {
        const by = num(payload.superseded_by_version);
        model.superseded = by === undefined ? {} : { by };
      }
      break;
    case "run.step_changed": {
      const step = event.step_key ?? "";
      if (step === "work" || step === "review") {
        model.engineStep = step;
        model.stepStartedAt = event.ts;
      }
      break;
    }
    case "run.phase_changed": {
      model.phase = event.phase ?? model.phase;
      if (event.phase === "paused") model.pauseReason = str(payload.reason);
      else delete model.pauseReason;
      break;
    }
    case "run.gate_opened": {
      model.gate = {
        id: str(payload.gate_id) ?? "",
        prompt: str(payload.prompt) ?? "The stage waits for you.",
        ...gateOptions(payload),
      };
      break;
    }
    case "run.gate_closed":
      if (!payload.gate_id || model.gate?.id === payload.gate_id) model.gate = null;
      break;
    case "review.completed":
      model.reviewResult = {
        round: num(payload.round) ?? model.review?.round ?? 1,
        passed: typeof payload.passed === "boolean" ? payload.passed : undefined,
        artifactId: str(payload.artifact_id),
        error: Boolean(payload.error),
      };
      break;
    case "artifact.delivered": {
      const schema = str(payload.schema);
      if (schema && !model.delivered.includes(schema)) model.delivered = [...model.delivered, schema];
      if (schema === "dataset.data_card/v1") {
        model.dataCardArtifactId = str(payload.artifact_id) ?? model.dataCardArtifactId;
      }
      break;
    }
    case "pi.consultation_requested":
      if (payload.kind === "charter")
        model.charter = {
          consultationId: str(payload.consultation_id),
          authority: str(payload.authority),
          ready: false,
          settled: false,
        };
      if (payload.kind === "stage_outcome")
        model.outcome = { consultationId: str(payload.consultation_id), decided: false };
      break;
    case "attention.required":
      if (payload.kind === "charter" && payload.reason === "pi_failed" && model.charter)
        model.charter = { ...model.charter, ready: true };
      if (payload.kind === "stage_outcome" && !model.outcome) model.outcome = { decided: false };
      break;
    case "pi.charter_skipped":
    case "pi.charter_settled":
      if (model.charter) model.charter = { ...model.charter, ready: true, settled: true };
      break;
    case "pi.decision":
    case "pi.recommendation":
      if (payload.kind === "charter" && model.charter) model.charter = { ...model.charter, ready: true };
      if (payload.kind === "stage_outcome" && model.outcome)
        model.outcome = {
          ...model.outcome,
          action: str(payload.action) ?? model.outcome.action,
          confidence: num(payload.confidence) ?? model.outcome.confidence,
        };
      break;
    case "decision.recorded":
      if (model.outcome && (payload.kind === "stage_outcome" || payload.gate_id == null))
        model.outcome = { ...model.outcome, decided: true };
      break;
    case "run.published":
      model.published = true;
      model.gate = null;
      break;
    case "run.failed":
      model.failure = {
        message: str(payload.message) ?? "The engine could not finish this run.",
        code: str(payload.code),
      };
      model.gate = null;
      break;
    case "run.cancelled":
      model.failure = { message: "The run was cancelled." };
      model.gate = null;
      break;
    case "run.cost": {
      const usage = payload.usage as Record<string, { input_tokens?: number; output_tokens?: number }> | undefined;
      if (usage)
        model.tokens = Object.values(usage).reduce((sum, u) => sum + (u.input_tokens ?? 0) + (u.output_tokens ?? 0), 0);
      break;
    }
    case "stage.stalled":
      model.stalledMinutes = num(payload.minutes_since_last_event) ?? 0;
      break;
    case "stage.healing":
      delete model.failure;
      say("code", str(payload.reason) ?? "The stage failed. Trying again by itself.");
      break;
  }
  return model;
}

export function foldDatasetEvents(events: PipelineEnvelope[], from = emptyDatasetRun()): DatasetRunModel {
  return events.reduce(applyDatasetEvent, from);
}

// ---------- what the screen reads ----------

export type StepView = DatasetStepDef & {
  state: "todo" | "now" | "asking" | "done";
  reason?: string;
  tokens?: number;
  /** You decide this step. */
  gate?: boolean;
  /** What code says about the item now. */
  item?: ItemState;
  /** The engine waits for something only you can give (a question map, source attributes). */
  needsYou?: boolean;
  actor: DatasetAgent;
};

export interface StepOptions {
  /** The version lives on a Local Node: its release is reviewed first. */
  local: boolean;
  /** How the Platform says the run ended (`stageLine`), which wins over what events imply. */
  ended: "done" | "failed" | null;
}

/** The engine's tools that only the person can drive: the question map and the source attributes. */
const WAITS_FOR_YOU = /map_question|set_source_attributes/;
const PROGRESS_STEP: Readonly<Record<string, string>> = {
  reading: "sources",
  quality: "profile_quality",
  describing: "dictionary",
  recipe: "cleaning_recipe",
  complete: "split",
  checks: "data_checks",
};

/** The PI's plan waits for you to endorse it, and the run has not started its work. */
export const charterPending = (model: DatasetRunModel) =>
  model.charter?.authority === "researcher" && model.charter.ready && !model.charter.settled;

export const PLAN_KEY = "charter";
export const PLAN_DEF: DatasetStepDef = {
  key: PLAN_KEY,
  short: "Plan",
  title: "Endorse the plan",
  explain: "The PI drafts what the run sets out to answer; you endorse it before any work starts.",
};

/** Whether the person is asked to accept the finished stage and has not answered yet. */
export const outcomePending = (model: DatasetRunModel) => model.published && model.outcome?.decided === false;

function closingState(model: DatasetRunModel, reviewing: boolean, ended: StepOptions["ended"]): StepView["state"] {
  if (ended === "done") return "done";
  if (!ended && (model.readyToAccept || outcomePending(model))) return "asking";
  if (model.published) return "done";
  if (model.gate && reviewing) return "asking";
  return reviewing && !ended ? "now" : "todo";
}

/** The steps of this run, with where each stands. The first open item is the one the steward works on. */
export function stepViews(model: DatasetRunModel, { local, ended }: StepOptions): StepView[] {
  const hasEngine = Object.keys(model.items).length > 0 || model.engineStep !== null;
  const defs = STEP_DEFS.filter((def) => {
    const item = model.items[def.key];
    if (item?.state === "not_applicable") return false;
    return !def.optional || Boolean(item);
  });
  const firstOpen = defs.find((def) => ["red", "needs_you"].includes(model.items[def.key]?.state ?? ""));
  const progressKey = model.progress ? PROGRESS_STEP[model.progress.task] : undefined;
  const computing = defs.find((def) => def.key === progressKey && model.items[def.key]?.state !== "green");
  const followsProgress = !model.gate && (!firstOpen || model.items[firstOpen.key]?.state !== "needs_you");
  const open = (followsProgress ? computing : undefined) ?? firstOpen;
  const reviewing = model.engineStep === "review" || Boolean(model.review ?? model.reviewResult);
  const views: StepView[] = defs.map((def) => {
    const item = model.items[def.key];
    const done = item?.state === "green" || reviewing || ended === "done" || model.published;
    // An open question to the person belongs to the step being worked on.
    const asking = def.key === open?.key && (item?.state === "needs_you" || (Boolean(model.gate) && !reviewing));
    return {
      ...def,
      actor: "steward",
      state: done ? "done" : asking ? "asking" : def.key === open?.key && !ended ? "now" : "todo",
      ...(item ? { item: item.state } : {}),
      ...(item?.state === "needs_you" || (item?.reason && WAITS_FOR_YOU.test(item.reason)) ? { needsYou: true } : {}),
      ...(item?.reason ? { reason: item.reason } : {}),
      ...(item?.tokens ? { tokens: item.tokens } : {}),
    };
  });
  const closing: StepView = {
    ...REVIEW_DEF,
    actor: "reviewer",
    gate: true,
    state: closingState(model, reviewing, ended),
  };
  const plan: StepView[] = model.charter
    ? [
        {
          ...PLAN_DEF,
          title: model.charter.settled || model.charter.ready ? PLAN_DEF.title : "Drafting the research plan",
          actor: charterPending(model) ? "you" : "pi",
          gate: model.charter.authority === "researcher",
          state:
            model.charter.settled || ended === "done"
              ? "done"
              : ended
                ? "todo"
                : charterPending(model)
                  ? "asking"
                  : "now",
        },
      ]
    : [];
  if (!local) return [...plan, ...views, closing];
  const release: StepView = {
    ...RELEASE_DEF,
    actor: "you",
    gate: true,
    state: model.releaseWait ? "asking" : hasEngine || ended === "done" ? "done" : "todo",
  };
  return [...plan, release, ...views, closing];
}

/** The agent whose work is shown now, or null when nobody works (the run waits, paused, or ended). */
export function activeAgent(model: DatasetRunModel, waiting: boolean): DatasetAgent | null {
  if (waiting || model.gate || model.releaseWait || model.published) return null;
  if (model.charter && !model.charter.settled) return model.charter.ready ? null : "pi";
  if (model.engineStep === "review" || (model.review && model.phase === "reviewing")) return "reviewer";
  return model.engineStep === "work" || Object.keys(model.items).length ? "steward" : null;
}

/** What comes next that needs the person, in one sentence for the aside. */
export function nextStopFor(steps: StepView[], local: boolean): { title: string; detail: string } | null {
  const upcoming = steps.find((s) => s.gate && s.state !== "done");
  if (!upcoming) return null;
  if (upcoming.key === PLAN_KEY)
    return {
      title: "Next stop for you: endorse the plan",
      detail: "The PI drafted what the run sets out to answer. Nothing starts until you endorse it.",
    };
  if (upcoming.key === RELEASE_KEY)
    return {
      title: "Next stop for you: review the release",
      detail: local
        ? "Open the Local Node app and go to Releases to approve what leaves your computer."
        : "Approve the release on the Local Node.",
    };
  return {
    title: "Next stop for you: accept the data card",
    detail: "After the review, you accept the card that Hypothesis and Experiment design read.",
  };
}
