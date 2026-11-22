import type { WorkCheck } from "./contract";
import type { StageContent } from "./run-state";

export function incompleteRapidReview(content: StageContent): boolean {
  if (content.stage === "search" && content.reviewRound !== undefined) {
    return content.collected?.review_round !== content.reviewRound || content.collected?.round_answered !== true;
  }
  return (
    content.stage === "screen" &&
    content.criteria?.protocolVersion !== undefined &&
    content.reviewProgress?.state !== "completed"
  );
}

type Target = { stage: string; step: string };
type Work = {
  text: string;
  target?: Target;
  live?: boolean;
  check?: WorkCheck;
  note?: string;
  queries?: string[];
};

const protocol = { stage: "scope", step: "charter" };
const search = { stage: "search", step: "collect" };
const screen = { stage: "screen", step: "score" };
const read = { stage: "read", step: "extract" };
const gaps = { stage: "synthesize", step: "gaps" };
const hypotheses = { stage: "hypothesize", step: "write" };
const selected = { stage: "hypothesize", step: "select" };

const actions = new Map<string, { target: Target; text: string }>([
  ["write_protocol", { target: protocol, text: "Writing the review plan" }],
  ["draft_protocol", { target: protocol, text: "Writing the review plan" }],
  ["lock_protocol", { target: protocol, text: "Locked the review plan" }],
  ["accept_protocol", { target: protocol, text: "Locked the review plan" }],
  ["run_search", { target: search, text: "Searching the literature" }],
  ["search", { target: search, text: "Searching the literature" }],
  ["screen", { target: screen, text: "Screening papers" }],
  ["extract_cards", { target: read, text: "Extracting evidence cards" }],
  ["appraise", { target: read, text: "Checking the quality of the evidence" }],
  ["build_map", { target: gaps, text: "Mapping the evidence" }],
  ["record_gaps", { target: gaps, text: "Recording gaps in the evidence" }],
  ["select_gaps", { target: gaps, text: "Choosing which gaps to pursue" }],
  ["propose", { target: hypotheses, text: "Writing hypotheses" }],
  ["check_prior_art", { target: { stage: "hypothesize", step: "check" }, text: "Checking for prior work" }],
  ["select_hypotheses", { target: selected, text: "Selecting hypotheses" }],
  ["select_set", { target: selected, text: "Selecting hypotheses" }],
]);

const items = new Map<string, { target: Target; label: string }>([
  ["protocol", { target: protocol, label: "Review plan" }],
  ["search_log", { target: search, label: "Search log" }],
  ["stopping", { target: search, label: "Search coverage" }],
  ["screening", { target: screen, label: "Screening" }],
  ["cards", { target: read, label: "Evidence cards" }],
  ["appraisal", { target: read, label: "Evidence quality" }],
  ["evidence_map", { target: gaps, label: "Evidence map" }],
  ["selected_gaps", { target: gaps, label: "Selected gaps" }],
  ["hypotheses", { target: hypotheses, label: "Hypotheses" }],
  ["selected_set", { target: selected, label: "Selected hypotheses" }],
]);

const checkLabels = {
  red: "Needs work",
  amber: "Needs review",
  green: "Ready",
  needs_you: "Needs your input",
  not_applicable: "Not applicable",
} satisfies Record<WorkCheck["state"], string>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Engine tool events can carry a shortened JSON string. Only use fields that were fully recorded. */
export function readToolArgs(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return record(value);
  if (!value.startsWith("{") || value.length > 4096) return {};
  try {
    return record(JSON.parse(value));
  } catch {
    if (!value.endsWith("...")) return {};
  }
  for (let end = value.lastIndexOf(","); end > 0; end = value.lastIndexOf(",", end - 1)) {
    try {
      return record(JSON.parse(`${value.slice(0, end)}}`));
    } catch {
      // A comma may be nested or inside a string. Try the preceding complete property.
    }
  }
  return {};
}

/** Actions record a bounded preview prefixed by the action name. */
export function readActionArgs(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return readToolArgs(value);
  const start = value.indexOf("{");
  return start < 0 ? {} : readToolArgs(value.slice(start));
}

function plain(value: unknown, limit = 240) {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

function labelOf(key: string) {
  return key.replace(/[_.-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function turnOf(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? ` (turn ${value})` : "";
}

function searchNote(payload: Record<string, unknown>) {
  const result = record(payload.result);
  const errors = record(payload.provider_errors ?? result.provider_errors);
  const limited = /\b429\b|rate[-_ ]limit|too many requests|circuit breaker/i;
  const providers = Object.entries(errors)
    .slice(0, 4)
    .flatMap(([name, problem]) => {
      const detail = record(problem);
      return /^[\w -]{1,35}$/.test(name) &&
        limited.test(
          [problem, detail.code, detail.status, detail.message].filter((part) => typeof part !== "object").join(" "),
        )
        ? [name]
        : [];
    });
  if (providers.length)
    return `Search temporarily limited by ${providers.join(", ")}. Results from other sources can still come in.`;
  if (
    limited.test(
      `${plain(payload.error)} ${plain(payload.cause)} ${plain(payload.reason)} ${String(payload.status ?? "")}`,
    )
  )
    return "A search source is temporarily rate limited. Results from other sources can still come in.";
}

/** The engine's work step carries tool calls and checklist checks even when it emits no scene content. */
export function hypothesisWork(kind: string, payload: Record<string, unknown>): Work | undefined {
  if (kind === "agent.tool" || kind === "action") {
    const name = plain(kind === "agent.tool" ? payload.tool : (payload.action ?? payload.name), 70).replace(
      /^hypothesis\./,
      "",
    );
    if (!name) return;
    const known = actions.get(name);
    const args = kind === "action" ? readActionArgs(payload.proposal) : readToolArgs(payload.args);
    const queries = Array.isArray(args.queries)
      ? args.queries
          .map((q) => plain(q, 105))
          .filter(Boolean)
          .slice(0, 12)
      : [];
    const records = Array.isArray(args.record_ids) ? args.record_ids.length : null;
    const detail =
      known?.target === search && queries.length
        ? `: ${queries.slice(0, 2).join(" · ")}`
        : known?.target === screen && records !== null
          ? records === 0
            ? " · automatically select top records"
            : `: ${records} ${records === 1 ? "record" : "records"}`
          : "";
    const note = known?.target === search ? searchNote(payload) : undefined;
    const refusal = payload.outcome === "refused" ? plain(payload.reason) : "";
    const text =
      (payload.ok === false || payload.outcome === "refused") && known?.target === protocol
        ? "Could not finish the review plan yet"
        : payload.outcome === "queued" && name === "accept_protocol"
          ? "Review plan ready to lock"
          : (known?.text ?? labelOf(name));
    return {
      text: refusal ? `${text}${detail} — ${refusal}` : `${text}${detail}${turnOf(payload.turn)}`,
      target: known?.target,
      live: kind === "agent.tool" || Boolean(known),
      note,
      queries: known?.target === search && queries.length ? queries : undefined,
    };
  }

  if (kind === "agent.turn") {
    const turn = turnOf(payload.turn);
    return turn ? { text: `The agent worked through a turn${turn}`, live: false } : undefined;
  }

  if (kind === "item") {
    const key = plain(payload.key, 70);
    const item = items.get(key);
    const state = payload.state as WorkCheck["state"];
    if (!key || !Object.hasOwn(checkLabels, state)) return;
    const reason = plain(payload.reason);
    const label = item?.label ?? labelOf(key);
    const status = checkLabels[state];
    const note = item?.target === search ? searchNote(payload) : undefined;
    return {
      text: `${label}: ${reason || status}`,
      target: item?.target,
      check: { key, label, state, status, reason },
      note,
    };
  }

  if (kind === "inbox_item" || kind === "ask_user") {
    const question = plain(payload.question ?? record(payload.item).question);
    if (question) return { text: question, live: true };
  }
  if (kind === "ask_user_answered") {
    const label = plain(payload.label);
    const by = payload.by === "researcher" ? "the researcher" : "the agent";
    return { text: label ? `Answered by ${by}: ${label}` : `Review question answered by ${by}`, live: false };
  }
  if (kind === "span") {
    const span = plain(payload.label ?? payload.name);
    if (span) return { text: labelOf(span), live: false };
  }
}
