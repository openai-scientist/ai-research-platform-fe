import { fetchArtifacts, type RunArtifactItem } from "@/lib/api/services/fetch-artifacts";

import type { ReviewFinding, WorkCheck } from "./contract";
import type { PublicationRef } from "./published-hypotheses";

export const DESIGN_STAGE = "experiment_design";
export const DESIGN_PLAN = "experiment_design.plan/v1";
const INDEX = "experiment_design.experiment_index/v2";
export const DESIGN_REVIEW = "review.findings/v1";
export const DESIGN_DIAGNOSIS = "experiment_design.design_diagnosis/v1";
export const DESIGN_DOCUMENTS = ["experiment_design.exp_plan/v1", "experiment_design.preregistration/v1"] as const;
export const DESIGN_LOCK = "experiment_design.lock/v1";

export type DesignFields = Record<string, unknown>;

export type DesignHypothesis = {
  id: string;
  statement?: string;
  inputExposure?: string;
  inputOutcome?: string;
  estimand?: DesignFields;
  protocol?: DesignFields;
  program?: DesignFields;
  decisionRule?: DesignFields;
  diagnosis?: DesignFields;
  assumptions?: DesignFields;
  claimType?: string;
  forecast?: DesignFields;
};

export type DesignArtifact = { id: string; schema: string; label: string; contentType?: string };
export const DESIGN_SAP = "experiment_design.sap/v1";

export type DesignFinding = ReviewFinding;
type DesignDocuments = Partial<Record<(typeof DESIGN_DOCUMENTS)[number], string>>;

export type DesignPublication = {
  hypotheses: DesignHypothesis[];
  artifacts: DesignArtifact[];
  findings: DesignFinding[];
  documents?: DesignDocuments;
};

export type DesignNotice = { id: string; question: string; why?: string; needsInput: boolean };

export type DesignPatch = {
  hypotheses?: DesignHypothesis[];
  artifact?: DesignArtifact;
  publication?: DesignPublication;
  notice?: DesignNotice;
  blocked?: string;
  accepted?: boolean;
  tokens?: number;
};

export type DesignContent = {
  hypotheses: Record<string, DesignHypothesis>;
  artifacts: Record<string, DesignArtifact>;
  findings: DesignFinding[];
  notices: Record<string, DesignNotice>;
  documents?: DesignDocuments;
  blocked?: string;
  accepted?: boolean;
  tokens?: number;
};

export function designRecord(value: unknown): DesignFields {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DesignFields) : {};
}

export function designText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function designLabel(key: string) {
  const words = key.replace(/[_-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const checks: Record<string, WorkCheck["status"]> = {
  red: "Needs work",
  amber: "Needs review",
  green: "Ready",
  needs_you: "Needs your input",
  not_applicable: "Not applicable",
};

export function designCheck(payload: DesignFields): WorkCheck | undefined {
  const key = designText(payload.key);
  const state = designText(payload.state);
  if (!key || !state || !Object.hasOwn(checks, state)) return;
  return {
    key,
    label: designLabel(key),
    state: state as WorkCheck["state"],
    status: checks[state],
    reason: designText(payload.reason) ?? "",
  };
}

const toolLabels: Record<string, string> = {
  define_estimands: "Defining the estimand",
  set_protocol: "Writing the protocol",
  set_program: "Specifying the analysis model",
  set_decision_rule: "Writing the decision rule",
  set_dag: "Checking causal assumptions",
  set_robustness: "Planning robustness checks",
  set_external_validation: "Planning external validation",
  run_diagnosis: "Checking power and precision",
  record_forecasts: "Recording forecasts",
  rehearse: "Rehearsing the analysis",
  lock_covariates: "Locking the covariates",
  lock_plan: "Locking the analysis plan",
  choose_model_form: "Choosing the model form",
  variable_rows: "Checking the variables",
  show_levels: "Checking exposure levels",
  contract_status: "Checking the design checklist",
  confirm_timing: "Checking the order of measurements",
  read_object: "Reading the design inputs",
  finish: "Finishing this round of work",
};

const agentLabels: Record<string, string> = {
  "repair-estimand": "Working on estimands and protocols",
  "repair-analysis": "Working on the analysis and decision rules",
  "review-the-methodologist": "Reviewing the analysis plan",
};

function rows(value: unknown) {
  return Array.isArray(value) ? value.map(designRecord) : [];
}

function nonempty(value: unknown) {
  const row = designRecord(value);
  return Object.keys(row).length ? row : undefined;
}

/** The engine shortens long argument previews with an ellipsis. Retain only complete values. */
function readDesignArgs(value: unknown): DesignFields {
  if (typeof value !== "string") return designRecord(value);
  try {
    return designRecord(JSON.parse(value));
  } catch {
    if (!value.startsWith("{") || !value.endsWith("...") || value.length > 4096) return {};
  }
  const closing: string[] = [];
  let quoted = false;
  let escaped = false;
  let last: DesignFields = {};
  for (let index = 0; index < value.length - 3; index += 1) {
    const character = value[index];
    if (quoted) {
      if (!escaped && character === '"') quoted = false;
      escaped = !escaped && character === "\\";
    } else if (character === '"') {
      quoted = true;
    } else if (character === "{" || character === "[") {
      closing.unshift(character === "{" ? "}" : "]");
    } else if (character === "}" || character === "]") {
      closing.shift();
    }
    if (!quoted && (character === "," || character === '"' || character === "}" || character === "]")) {
      try {
        const end = character === "," ? index : index + 1;
        last = designRecord(JSON.parse(value.slice(0, end) + closing.join("")));
      } catch {
        // Still inside a key or an unfinished value.
      }
    }
  }
  return last;
}

export function designTool(payload: DesignFields) {
  const tool = designText(payload.tool) ?? "tool";
  const args = readDesignArgs(payload.args);
  // Some engine versions truncate the JSON string before the ID's containing object closes.
  const previewIds =
    typeof payload.args === "string"
      ? Array.from(payload.args.matchAll(/"hypothesis_id"\s*:\s*"([\w-]+)"/g), (match) => match[1])
      : [];
  const id = designText(args.hypothesis_id) ?? previewIds[0];
  const selectedIds = Array.isArray(args.hypothesis_ids)
    ? args.hypothesis_ids.flatMap((key) => designText(key) ?? [])
    : [];
  const estimandIds = rows(args.estimands).flatMap((entry) => designText(entry.hypothesis_id) ?? []);
  const ids = [...new Set([...(id ? [id] : []), ...selectedIds, ...estimandIds, ...previewIds])];
  const text = `${toolLabels[tool] ?? designLabel(tool)}${ids.length ? ` for ${ids.join(", ")}` : ""}`;
  const hypotheses: DesignHypothesis[] = [];
  if (payload.ok === true) {
    if (tool === "define_estimands") {
      for (const { hypothesis_id, ...estimand } of rows(args.estimands)) {
        if (typeof hypothesis_id === "string") hypotheses.push({ id: hypothesis_id, estimand });
      }
    }
    if (id) {
      const { hypothesis_id: _id, ...fields } = args;
      if (tool === "set_protocol") hypotheses.push({ id, protocol: nonempty(args.fields) });
      if (tool === "set_program") hypotheses.push({ id, program: nonempty(fields) });
      if (tool === "set_decision_rule") hypotheses.push({ id, decisionRule: nonempty(fields) });
      if (tool === "set_dag") hypotheses.push({ id, assumptions: { dag: fields } });
      if (tool === "set_robustness") hypotheses.push({ id, assumptions: { robustness: fields } });
      if (tool === "set_external_validation") hypotheses.push({ id, assumptions: { external_validation: fields } });
      for (const missing of ids.filter((key) => !hypotheses.some((h) => h.id === key)))
        hypotheses.push({ id: missing });
    }
  }
  if (payload.ok === true && tool === "record_forecasts") {
    for (const forecast of rows(args.forecasts)) {
      const id = designText(forecast.hypothesis_id);
      if (id) hypotheses.push({ id, forecast });
    }
  }
  return { text, hypotheses, failed: payload.ok === false };
}

export function designAgent(payload: DesignFields) {
  const agent = designText(payload.agent) ?? "agent";
  return agentLabels[agent] ?? designLabel(agent);
}

const schemas: Record<string, string> = {
  "experiment_design.exp_plan/v1": "Experiment plan",
  [DESIGN_PLAN]: "Analysis plan",
  [INDEX]: "Experiment index",
  [DESIGN_LOCK]: "Plan lock",
  [DESIGN_SAP]: "Statistical analysis plan",
  "experiment_design.preregistration/v1": "Pre-registration",
  "experiment_design.rehearsal/v1": "Rehearsal",
  "experiment_design.release_log/v1": "Release log",
  [DESIGN_DIAGNOSIS]: "Design diagnosis",
  "experiment_design.reviewed/v1": "Reviewed plan",
  [DESIGN_REVIEW]: "Review findings",
  "stage.story/v1": "Stage history",
};

export function designArtifact(id: unknown, schema: unknown, contentType?: unknown): DesignArtifact | undefined {
  if (typeof id !== "string" || typeof schema !== "string" || !Object.hasOwn(schemas, schema)) return;
  return { id, schema, label: schemas[schema], ...(typeof contentType === "string" ? { contentType } : {}) };
}

export function parseDesignPlan(body: unknown): DesignHypothesis[] {
  const plan = designRecord(body);
  const diagnosis = designRecord(designRecord(plan.design_diagnosis).hypotheses);
  const robustness = designRecord(plan.robustness);
  const externalValidation = designRecord(plan.external_validation);
  return rows(plan.hypotheses).flatMap((raw) => {
    const id = designText(raw.id);
    if (!id) return [];
    const assumptions = Object.fromEntries(
      [
        "dag",
        "covariate_notes",
        "unit_limitations",
        "break_limitations",
        "population_limitations",
        "floor_ceiling_limitations",
        "outcome_requirements",
        "tail_choices",
        "sensitivity_requests",
        "answer_findings",
        "prior_knowledge",
        "label_reason",
      ].map((key) => [key, raw[key]]),
    );
    return [
      {
        id,
        statement: designText(raw.statement),
        claimType: designText(raw.claim_type),
        estimand: nonempty(raw.estimand),
        protocol: nonempty(raw.protocol),
        program: nonempty(raw.program),
        decisionRule: nonempty(raw.decision_rule),
        diagnosis: nonempty(diagnosis[id]),
        assumptions: { ...assumptions, robustness: robustness[id], external_validation: externalValidation[id] },
      },
    ];
  });
}

function indexHypotheses(body: unknown): DesignHypothesis[] {
  return rows(designRecord(body).experiments).flatMap((program) => {
    const ids = Array.isArray(program.hypothesis_ids) ? program.hypothesis_ids : [];
    return ids.flatMap((id) => (typeof id === "string" ? [{ id, program }] : []));
  });
}

export function parseDesignFindings(body: unknown): DesignFinding[] {
  return rows(designRecord(body).findings).flatMap((row, index) => {
    const issue = designText(row.issue) ?? designText(row.failure_scenario);
    if (!issue) return [];
    const severity = row.severity === "blocking" || row.severity === "major" ? row.severity : "minor";
    const anchor = designText(row.locator) ?? designText(row.anchor) ?? designText(designRecord(row.anchor).locator);
    const field = anchor?.split(".").at(-1);
    return [
      {
        issue,
        finding_id: designText(row.finding_id) ?? `design-finding-${index + 1}`,
        locator: anchor?.includes("/") ? anchor : field ? `item:design/${field}` : "item:design",
        category: designText(row.category) ?? "design",
        kind: row.kind === "needs_evidence" ? "needs_evidence" : "fix",
        severity,
        suggestion: designText(row.suggestion) ?? designText(row.fix),
      },
    ];
  });
}

export async function loadPublishedDesign(
  projectId: string,
  runId: string,
  ref: PublicationRef,
  signal: AbortSignal,
): Promise<DesignPublication> {
  const { data } = await fetchArtifacts.getList(projectId, runId, signal);
  const files = data
    .filter((item) => item.stage_run_id === ref.stageRunId)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  const latest = new Map<string, RunArtifactItem>();
  for (const item of files) {
    if (item.schema_id && !latest.has(item.schema_id)) latest.set(item.schema_id, item);
  }
  const download = async (schema: string) => {
    const item = latest.get(schema);
    if (!item) return;
    const { blob } = await fetchArtifacts.download(projectId, runId, item.id, signal);
    return blob.text();
  };
  const json = async (schema: string) => {
    const source = await download(schema);
    return source ? (JSON.parse(source) as unknown) : undefined;
  };
  const [body, review, lock, ...documents] = await Promise.all([
    json(DESIGN_PLAN),
    json(DESIGN_REVIEW).catch(() => undefined),
    json(DESIGN_LOCK).catch(() => undefined),
    ...DESIGN_DOCUMENTS.map((schema) => download(schema).catch(() => undefined)),
  ]);
  let hypotheses = parseDesignPlan(body);
  if (!body) {
    const [index, diagnosis] = await Promise.all([json(INDEX), json(DESIGN_DIAGNOSIS).catch(() => undefined)]);
    const byHypothesis = designRecord(designRecord(diagnosis).hypotheses);
    hypotheses = indexHypotheses(index).map((row) => ({ ...row, diagnosis: nonempty(byHypothesis[row.id]) }));
  }
  const forecasts = new Map(rows(designRecord(lock).forecasts).map((row) => [designText(row.hypothesis_id), row]));
  return {
    hypotheses: hypotheses.map((row) => ({ ...row, forecast: forecasts.get(row.id) ?? row.forecast })),
    documents: Object.fromEntries(
      DESIGN_DOCUMENTS.flatMap((schema, i) => (documents[i] ? [[schema, documents[i]]] : [])),
    ),
    findings: parseDesignFindings(review),
    artifacts: [...latest.values()].flatMap((item) => designArtifact(item.id, item.schema_id, item.content_type) ?? []),
  };
}
