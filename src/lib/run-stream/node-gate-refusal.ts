/**
 * Why a Local Node refused to release a result. The Node answers with a short code; this says it in plain words.
 * Only a code that is actually present is explained: nothing is inferred when the reason is absent.
 */
const REFUSALS: Readonly<Record<string, string>> = {
  plan_sealed:
    "This file's confirmation rows are already locked to another analysis plan (an earlier run). Another plan cannot use them. Start the study on a new data file.",
  gate_small_cell:
    "The Local Node withheld this result: it covers too few rows to be released without exposing individuals.",
  gate_blocked: "The Local Node's release gate blocked this result, so it was not sent.",
  gate_overlap:
    "The Local Node withheld this result: the rows it reads are almost the same as an earlier release, so together they would describe too few rows.",
  gate_split_mismatch: "The Local Node withheld this result: the rows read do not match the split the plan registered.",
  gate_output_limit: "The Local Node withheld this result: it is larger than the release gate allows.",
  gate_scope_unsupported: "The Local Node cannot release this kind of analysis.",
  gate_policy_snapshot_mismatch:
    "The Local Node withheld this result: the data changed since the release policy was set.",
  gate_policy_invalid: "The Local Node withheld this result: its release policy is not valid.",
  gate_result_shape: "The Local Node withheld this result: it does not have the shape the release gate accepts.",
  release_review_required: "The Local Node is waiting for you to review this release before it can be sent.",
  invalid_gate_payload: "The Local Node refused the release request because it was not well formed.",
  probe_budget_exhausted: "This file's query budget is used up. The Local Node cannot answer more queries on it.",
};

const CODE = /\b(gate_[a-z0-9_]+|plan_sealed|probe_budget_exhausted|release_review_required|invalid_gate_payload)\b/;

export interface GateRefusal {
  code: string;
  /** A plain sentence ending in a full stop. */
  sentence: string;
}

const readable = (code: string) => code.replaceAll("_", " ");

/** The refusal named in one text such as a check reason or status code, or `null` when it names none. */
export function gateRefusal(text: unknown): GateRefusal | null {
  if (typeof text !== "string") return null;
  const code = CODE.exec(text)?.[1];
  if (!code) return null;
  return {
    code,
    sentence:
      REFUSALS[code === "gate_plan_sealed" ? "plan_sealed" : code] ??
      `The Local Node refused the release (${readable(code)}).`,
  };
}

/** The first refusal named by any of the texts. */
export function firstGateRefusal(texts: readonly unknown[]): GateRefusal | null {
  for (const text of texts) {
    const found = gateRefusal(text);
    if (found) return found;
  }
  return null;
}
