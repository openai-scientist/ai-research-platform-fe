import { readToolArgs } from "./hypothesis-work";

export const CLAIM_FIELDS = {
  topic: "Topic",
  question: "Question",
  why: "Why it matters",
  outcome: "Outcome column",
  exposure: "Exposure column",
  direction: "Direction",
} as const;

export type ClaimFields = Partial<Record<keyof typeof CLAIM_FIELDS, string>>;

export type ReviewPlan = {
  status: "pending" | "drafted" | "locked";
  question?: string;
  sources?: string[];
  inclusion?: string[];
  exclusion?: string[];
  yearMin?: number;
};

export type ClaimScope = {
  status: "pending" | "stated" | "skipped";
  claim?: ClaimFields;
  protocol: ReviewPlan;
};

function string(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function list(value: unknown) {
  if (!Array.isArray(value)) return;
  const entries = value.flatMap((item) => string(item) ?? []);
  return entries.length ? entries : undefined;
}

function isClaimQuestion(payload: Record<string, unknown>) {
  return [payload.question, payload.header, payload.prompt].some(
    (part) =>
      typeof part === "string" &&
      /state the claim you want tested|does the student state a claim before the review/i.test(part),
  );
}

/** Rebuilds the Scope record from the claim decision and successful review protocol events. */
export function updateClaimScope(
  current: ClaimScope | undefined,
  type: string,
  payload: Record<string, unknown>,
): ClaimScope | undefined {
  if (isClaimQuestion(payload)) {
    const scope: ClaimScope = current ?? { status: "pending", protocol: { status: "pending" } };
    if (type === "hypothesis.assumption")
      return scope.status === "skipped" ? current : { ...scope, status: "skipped", claim: undefined };
    if (type === "hypothesis.ask_user_answered") {
      if (payload.option_id !== "state" || payload.by === "agent")
        return { ...scope, status: "skipped", claim: undefined };
      const params = readToolArgs(payload.params);
      const claim: ClaimFields = {};
      for (const key of Object.keys(CLAIM_FIELDS) as (keyof ClaimFields)[]) {
        const value = string(params[key]);
        if (value) claim[key] = value;
      }
      return { ...scope, status: Object.keys(claim).length ? "stated" : "pending", claim };
    }
    if (type === "hypothesis.ask_user" || type === "run.gate_opened") return current ?? scope;
  }

  if (!current) return;
  if (type === "hypothesis.agent.tool" && payload.tool === "write_protocol" && payload.ok === true) {
    const args = readToolArgs(payload.args);
    const protocol: ReviewPlan = {
      status: "drafted",
      question: string(args.question),
      sources: list(args.sources),
      inclusion: list(args.inclusion),
      exclusion: list(args.exclusion),
      yearMin: typeof args.year_min === "number" && args.year_min > 0 ? args.year_min : undefined,
    };
    return { ...current, protocol };
  }
  const locked =
    (type === "hypothesis.agent.tool" && payload.tool === "lock_protocol" && payload.ok === true) ||
    (type === "hypothesis.action" && payload.action === "hypothesis.accept_protocol" && payload.outcome === "done") ||
    (type === "hypothesis.item" && payload.key === "protocol" && payload.state === "green");
  if (locked && current.protocol.status !== "locked")
    return { ...current, protocol: { ...current.protocol, status: "locked" } };
}

export function claimScopeSummary(scope: ClaimScope) {
  const claim = { pending: "Claim decision pending", stated: "Claim stated", skipped: "Claim skipped" }[scope.status];
  const plan = { pending: "review plan pending", drafted: "review plan drafted", locked: "review plan locked" }[
    scope.protocol.status
  ];
  return `${claim} · ${plan}`;
}
