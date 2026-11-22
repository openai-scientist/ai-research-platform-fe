import { designRecord } from "../experiment-design";
import type { PipelineEnvelope } from "../pipeline-adapter";

export type DatasetStepKey =
  | "sources"
  | "table_model"
  | "profile_quality"
  | "dictionary"
  | "cleaning_recipe"
  | "question_map"
  | "split"
  | "data_checks"
  | "fitness"
  | "disclosure"
  | "review";
export type DesignStepKey = "design_work" | "design_review" | "design_accept";
export type ExecutionStepKey =
  | "execution_verify"
  | "execution_prepare"
  | "execution_run"
  | "execution_unseal"
  | "execution_check"
  | "execution_deliver";
export type LiveStepKey = DatasetStepKey | DesignStepKey | ExecutionStepKey;

export interface LiveFinding {
  kind: "ok" | "flag" | "note";
  text: string;
  usedBy: LiveStepKey[];
}

export interface LiveStep<Content> {
  /** Known work, kept distinct from observations so a preview can show shape without implying results. */
  structure: readonly LiveStructureItem[];
  /** Values produced by this step. Null until this step records an artifact or event-backed value. */
  values: Content | null;
  phase: "running" | "waiting" | "recorded";
  /** A walking cursor over known structure is not progress reported by the engine. */
  walk: "structure" | null;
  question: string | null;
  source: "engine" | "preview";
  valueState: "available" | "pending" | "syncing";
  valueSources: Partial<Record<keyof Content, "artifact" | "event" | "mixed">>;
  progress: number;
  progressFrom: "event-count" | "event-state" | "artifact" | "unavailable";
  cursor: number | null;
  cursorTarget: "content" | "procedure" | null;
  procedure: readonly string[];
  findings: LiveFinding[];
  content: Content;
}

export interface LiveStructureItem {
  label: string;
  source: string;
  fact?: { value: number; source: "upstream"; artifact: string };
}

export interface LiveSidePanel {
  now: { title: string; explanation: string };
  substeps: { label: string; state: "recorded" | "current" | "waiting" | "upcoming" }[];
  nextStop: string | null;
  rules: string[];
}

export interface LiveViewInput {
  /** Envelopes for the selected stage attempt. Order is resolved by sequence number. */
  events?: readonly PipelineEnvelope[];
  /** Parsed JSON bodies chosen by the caller for the selected stage attempts. */
  artifacts?: Readonly<Record<string, unknown>>;
  /** Set while the stream owner is recovering a known event gap. */
  syncing?: boolean;
}

export const record = designRecord;
export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
export const rows = (value: unknown) => list(value).map(record).filter(present);
export const present = (value: object) => Object.keys(value).length > 0;
export const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
export const bool = (value: unknown) => (typeof value === "boolean" ? value : null);
export const raw = (value: unknown) => (typeof value === "string" ? value.trim() : "");
export const human = (value: unknown) => {
  const words = raw(value)
    .replace(
      /\b(?:sha256:)?(?:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|[0-9a-f]{12,})\b/gi,
      "the recorded reference",
    )
    .replace(/\b(?:ERP|RUN|JOB)[-_][\w-]+\b/gi, "the recorded reference")
    .replace(/\bH(\d+)(?:-[\w-]+)?\b/g, "Hypothesis $1")
    .replace(/\b(?:QG|D|Q|A|F)\d+(?:-[\w-]+)?\b/g, "the referenced item");
  return words || null;
};
export const label = (value: unknown) => human(value)?.replaceAll("_", " ") ?? null;
export const texts = (value: unknown) =>
  list(value)
    .map(human)
    .filter((item): item is string => item !== null);
export const body = (input: LiveViewInput, schema: string) => record(input.artifacts?.[schema]);

export const stageEvents = (input: LiveViewInput, stage: string) =>
  (input.events ?? []).filter((event) => event.stage_key === stage).sort((a, b) => a.seq - b.seq);

export const itemEvent = (events: readonly PipelineEnvelope[], key: string) =>
  events.findLast(({ type, payload }) => type.endsWith(".item") && payload.key === key);

export function finding(kind: LiveFinding["kind"], value: unknown, ...usedBy: LiveStepKey[]): LiveFinding[] {
  const text = human(value);
  return text ? [{ kind, text, usedBy }] : [];
}

export function stepFor(input: LiveViewInput) {
  return <Content extends object>(
    content: Content,
    procedure: readonly string[],
    options: {
      available: boolean;
      artifactCompletes?: boolean;
      valueSources?: LiveStep<Content>["valueSources"];
      event?: PipelineEnvelope;
      count?: { done: number; total: number };
      cursor?: number | null;
      cursorTarget?: "content" | "procedure";
      findings?: LiveFinding[];
      structure?: readonly LiveStructureItem[];
      question?: string | null;
      waiting?: boolean;
    },
  ): LiveStep<Content> => {
    const { available, event, count } = options;
    let valueState: LiveStep<Content>["valueState"] = available ? "available" : "pending";
    if (input.syncing) valueState = "syncing";
    const eventDone =
      event?.payload.state === "green" ||
      event?.payload.state === "done" ||
      (event?.type === "review.completed" && event.payload.error !== true);
    let progress = 0;
    let progressFrom: LiveStep<Content>["progressFrom"] = "unavailable";
    if (options.artifactCompletes ?? available) {
      progress = 1;
      progressFrom = "artifact";
    } else if (eventDone) {
      progress = 1;
      progressFrom = "event-state";
    } else if (count && count.total > 0) {
      progress = Math.max(0, Math.min(1, count.done / count.total));
      progressFrom = "event-count";
    } else if (event) {
      progressFrom = "event-state";
    }
    const isWaiting = options.waiting === true;
    const recorded = progress === 1;
    let phase: LiveStep<Content>["phase"] = "running";
    if (recorded) phase = "recorded";
    if (isWaiting) phase = "waiting";
    const structure = options.structure ?? procedure.map((item) => ({ label: item, source: "known procedure" }));
    const hasReportedProgress = Boolean(event ?? count);
    const index = options.cursor ?? -1;
    const cursor =
      (progress === 1 && progressFrom !== "event-count") || input.syncing || isWaiting || index < 0 ? null : index;
    return {
      structure,
      values: available ? content : null,
      phase,
      walk: !isWaiting && !hasReportedProgress && structure.length ? "structure" : null,
      question: isWaiting ? (human(options.question) ?? "A decision is needed to continue.") : null,
      source: available ? "engine" : "preview",
      valueState,
      valueSources:
        options.valueSources ??
        (available
          ? (Object.fromEntries(
              Object.keys(content).map((key) => [key, "artifact"]),
            ) as LiveStep<Content>["valueSources"])
          : {}),
      progress,
      progressFrom,
      cursor,
      cursorTarget: cursor === null ? null : (options.cursorTarget ?? "content"),
      procedure,
      findings: options.findings ?? [],
      content,
    };
  };
}

/** Select an unresolved gate for a step. Raw Logos gate events retain their step key and question. */
export function waitingGate(events: readonly PipelineEnvelope[], aliases: readonly string[]) {
  const matching = events.filter((event) => {
    if (event.type !== "run.gate_opened" && event.type !== "gate.opened") return false;
    const payload = record(event.payload);
    const key = raw(event.step_key ?? payload.step_key);
    return key !== "" && aliases.includes(key);
  });
  const opened = matching.at(-1);
  if (!opened) return null;
  const id = raw(record(opened.payload).gate_id ?? record(record(opened.payload).gate).id);
  const resolved = events.some((event) => {
    if (event.seq <= opened.seq) return false;
    if (event.type !== "run.gate_closed" && event.type !== "gate.resolved") return false;
    const payload = record(event.payload);
    return !id || raw(payload.gate_id) === id;
  });
  if (resolved) return null;
  const payload = record(opened.payload);
  const gate = record(payload.gate);
  return { question: human(payload.prompt ?? payload.question ?? gate.prompt ?? gate.question) };
}

export function gateOptions(events: readonly PipelineEnvelope[], aliases: readonly string[]) {
  const gate = waitingGate(events, aliases);
  return gate ? { waiting: true, question: gate.question } : {};
}

export function structureItems(source: string, values: readonly unknown[]) {
  return [...new Set(values.map(human).filter((value): value is string => value !== null))].map((label) => ({
    label,
    source,
  }));
}

const PANEL_COPY: Readonly<Record<LiveStepKey, { title: string; explanation: string }>> = {
  sources: { title: "Review the sources", explanation: "Confirm what data is available and where it came from." },
  table_model: { title: "Understand the tables", explanation: "Identify each table's shape, unit and keys." },
  profile_quality: { title: "Profile the data", explanation: "Review released summaries and quality signals." },
  dictionary: { title: "Describe the columns", explanation: "Read the recorded types, roles and meanings." },
  cleaning_recipe: {
    title: "Review the cleaning plan",
    explanation: "Check the allowed fixes and analysis requirements.",
  },
  question_map: { title: "Map the research question", explanation: "Connect the question to the available variables." },
  split: { title: "Review the split", explanation: "Keep exploration and confirmation data separate." },
  data_checks: { title: "Check the data", explanation: "Apply the registered rules and summarize coverage." },
  fitness: { title: "Assess data fitness", explanation: "Set the strongest claim the data can support." },
  disclosure: { title: "Review the data card", explanation: "Check access, decisions and known limitations." },
  review: { title: "Review the evidence", explanation: "Record challenges and any recorded answers." },
  design_work: { title: "Build the analysis plan", explanation: "Specify hypotheses, estimands and decision rules." },
  design_review: { title: "Review the plan", explanation: "Check the protocol and record open findings." },
  design_accept: { title: "Accept the plan", explanation: "Confirm the locked plan before execution." },
  execution_verify: { title: "Verify the inputs", explanation: "Compare the run inputs with the Plan Lock." },
  execution_prepare: { title: "Prepare the run", explanation: "Rehearse the registered analysis without estimates." },
  execution_run: { title: "Run the analyses", explanation: "Compute the programs registered in the plan." },
  execution_unseal: { title: "Unseal the results", explanation: "Check prerequisites before opening results." },
  execution_check: { title: "Check the results", explanation: "Review estimates against the locked rules." },
  execution_deliver: { title: "Deliver the evidence", explanation: "Review the package and its hand-off status." },
};

/** Build the compact, text-only right-column model from the same mapped step states. */
export function buildLiveSidePanel(
  views: Partial<
    Record<LiveStepKey, Pick<LiveStep<unknown>, "phase" | "procedure" | "cursor" | "cursorTarget" | "question">>
  >,
  active: LiveStepKey,
): LiveSidePanel {
  const order = Object.keys(PANEL_COPY) as LiveStepKey[];
  let currentStage = "dataset";
  if (active.startsWith("execution_")) currentStage = "execution";
  else if (active.startsWith("design_")) currentStage = "design";
  const stageSteps = order.filter((key) => {
    if (currentStage === "execution") return key.startsWith("execution_");
    if (currentStage === "design") return key.startsWith("design_");
    return !key.startsWith("execution_") && !key.startsWith("design_");
  });
  const view = views[active];
  const substeps = (view?.procedure ?? []).map((label, index) => {
    let state: LiveSidePanel["substeps"][number]["state"] = "upcoming";
    if (view?.phase === "recorded") state = "recorded";
    else if (view?.question && index === (view.cursorTarget === "procedure" ? view.cursor : 0)) state = "waiting";
    else if (view?.cursorTarget === "procedure" && view.cursor !== null) {
      if (index < view.cursor) state = "recorded";
      else if (index === view.cursor) state = "current";
    } else if (index === 0) state = "current";
    return { label, state };
  });
  const currentIndex = stageSteps.indexOf(active);
  const next = stageSteps.slice(currentIndex + 1).find((key) => views[key]?.phase !== "recorded");
  return {
    now: PANEL_COPY[active],
    substeps,
    nextStop: next ? PANEL_COPY[next].title : null,
    rules: ["Use only recorded evidence.", "Keep unknown values pending.", "Do not infer measurements from the plan."],
  };
}

export interface ReviewThread {
  round: number | null;
  passed: boolean | null;
  threads: {
    challenge: string;
    severity: string | null;
    suggestion: string | null;
    resolved: boolean | null;
    reply: { outcome: string | null; text: string | null } | null;
  }[];
}

export function reviewContent(review: unknown, revision: unknown): ReviewThread {
  const report = record(review);
  const response = record(revision);
  const replies = new Map(
    number(report.round) === number(response.round) || number(report.round) === (number(response.round) ?? 0) - 1
      ? rows(response.items).map((row) => [raw(row.finding_id), row])
      : [],
  );
  return {
    round: number(report.round),
    passed: bool(report.passed),
    threads: rows(report.findings).flatMap((row) => {
      const challenge = human(row.issue ?? row.failure_scenario);
      if (!challenge) return [];
      const reply = replies.get(raw(row.finding_id));
      const open = bool(row.open);
      return [
        {
          challenge,
          severity: label(row.severity),
          suggestion: human(row.suggestion ?? row.fix),
          resolved: reply?.outcome === "fixed" || (open === null ? null : !open),
          reply: reply ? { outcome: label(reply.outcome), text: human(reply.note) } : null,
        },
      ];
    }),
  };
}
