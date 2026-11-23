import type { AgentRole } from "./contract";

export const EXECUTION_STAGE = "execution";
export const EXECUTION_RECORDS = "evidence.records/v1";

export const executionSteps = [
  { id: "execution_verify", title: "Verify", actor: "code", explain: "Verify the registered plan and lock." },
  { id: "execution_prepare", title: "Prepare", actor: "code", explain: "Rehearse and check the analysis inputs." },
  { id: "execution_run", title: "Run", actor: "code", explain: "Compute the registered analyses." },
  {
    id: "execution_unseal",
    title: "Unseal",
    actor: "code",
    explain: "Verify the prerequisites for opening sealed results.",
  },
  { id: "execution_check", title: "Check", actor: "reviewer", explain: "Review the results and their limits." },
  {
    id: "execution_deliver",
    title: "Deliver",
    actor: "code",
    explain: "Publish the evidence and review the hand-off.",
  },
  {
    id: "execution_readout",
    title: "Readout",
    actor: "pi",
    explain: "Read the published results and the claim assessment.",
  },
] as const satisfies readonly { id: string; title: string; actor: AgentRole; explain: string }[];

export const executionArtifacts: Readonly<Record<string, string>> = {
  [EXECUTION_RECORDS]: "Evidence records",
  "execution.results/v1": "Results report",
  "execution.bundle/v1": "Evidence bundle",
  "platform.experiment_result/v1": "Experiment result package",
  "stage.story/v1": "Stage story",
};

const checkSteps: Readonly<Record<string, string>> = {
  lock: "execution_verify",
  rehearsal: "execution_prepare",
  dry_run: "execution_prepare",
  confirmatory: "execution_run",
  robustness: "execution_run",
  unseal: "execution_unseal",
  verdicts: "execution_check",
  replication: "execution_check",
  exploration: "execution_check",
  replicator: "execution_check",
  interpretation: "execution_check",
  claim_acceptance: "execution_check",
  packaging: "execution_deliver",
};

export function executionCheckStep(key: string) {
  return Object.hasOwn(checkSteps, key) ? checkSteps[key] : undefined;
}

export interface ExecutionPatch {
  artifact?: { id: string; schema: string };
  progress?: { step: string; text: string };
  check?: { key: string; state: string; reason?: string };
  accepted?: boolean;
}

export interface ExecutionContent {
  artifacts: Record<string, string>;
  progress: Record<string, string>;
  checks: Record<string, NonNullable<ExecutionPatch["check"]>>;
  accepted?: boolean;
}

export interface EvidenceRecord {
  record_id: string;
  analysis_id: string;
  hypothesis_ids: string[];
  role: string;
  metric?: string | null;
  estimate?: number | null;
  ci_low?: number | null;
  ci_high?: number | null;
  n?: number | null;
  execution_status?: { state: string; reason?: string | null; code?: string | null } | null;
  verdict: string;
  reason?: string;
  assessment?: { value: string; reason: string } | null;
}

export function executionEvidence(value: unknown): EvidenceRecord[] {
  if (!value || typeof value !== "object" || !("records" in value) || !Array.isArray(value.records)) return [];
  return value.records.filter(
    (row): row is EvidenceRecord =>
      row &&
      typeof row.record_id === "string" &&
      typeof row.analysis_id === "string" &&
      typeof row.role === "string" &&
      Array.isArray(row.hypothesis_ids) &&
      row.hypothesis_ids.every((id: unknown) => typeof id === "string") &&
      typeof row.verdict === "string",
  );
}

const BEFORE_UNSEAL = "the run ended before the unseal";
/** Checks that explain why nothing was computed, the earliest first. */
const BLOCKING_CHECKS = ["lock", "rehearsal", "dry_run", "confirmatory", "unseal"] as const;

export interface NoResults {
  /** Why nothing was computed, lowercase and without a final full stop. */
  reason: string;
}

/** Reads inside a sentence: no final full stop, and a lowercase start unless it opens with an id such as H1. */
const clean = (text: string) => {
  const trimmed = text.trim().replace(/[.\s]+$/, "");
  return /^[A-Z][a-z]/.test(trimmed) ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1) : trimmed;
};

/**
 * Whether Execution ended with no analysis computed: the sealed results were never opened, no verdict was reached, or
 * the published records hold no estimate. `null` while that is not known, or when results exist. `records` is the
 * published evidence once it has been read.
 */
export function executionNoResults(
  execution: ExecutionContent | undefined,
  records?: readonly EvidenceRecord[],
): NoResults | null {
  const checks = execution?.checks ?? {};
  const notDone = (key: string) => checks[key] !== undefined && checks[key].state !== "green";
  const published = Boolean(execution?.artifacts[EXECUTION_RECORDS]);
  const noRecords = published && records !== undefined && records.length === 0;
  const noEstimates =
    records !== undefined && records.length > 0 && records.every((row) => typeof row.estimate !== "number");
  if (!notDone("unseal") && !notDone("verdicts") && !noRecords && !noEstimates) return null;

  const open = BLOCKING_CHECKS.map((key) => checks[key]).find(
    (check) => check && check.state !== "green" && check.state !== "not_applicable" && check.reason,
  );
  const status = records?.map((row) => row.execution_status?.reason).find((reason) => typeof reason === "string");
  const fallback = BEFORE_UNSEAL;
  return { reason: clean(open?.reason ?? status ?? checks.unseal?.reason ?? fallback) };
}

/** The notice at the Execution gate and in the scene when nothing was computed. */
export function noResultsMessage({ reason }: NoResults) {
  return `No analysis was computed. The plan check stopped before unseal: ${reason}. Accepting ends Execution with no estimates.`;
}
