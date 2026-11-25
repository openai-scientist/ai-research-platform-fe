import { CONSULTATION_KINDS, type ConsultationKind, type PlatformSettings } from "@/lib/api/services/fetch-admin";

/** Settings that are a single number. */
export type NumberKey = {
  // `-?` and NonNullable keep an optional number (a field older servers lack) in the keys.
  [K in keyof PlatformSettings]-?: NonNullable<PlatformSettings[K]> extends number ? K : never;
}[keyof PlatformSettings];

export interface NumberSpec {
  key: NumberKey;
  label: string;
  hint: string;
  /** Whole numbers only unless "decimal". */
  kind: "integer" | "decimal";
  /** Inclusive bounds, as in the backend model; `exclusive` ones are strict. */
  min?: number;
  max?: number;
  exclusiveMin?: number;
  exclusiveMax?: number;
  /** Words after the input, e.g. "tokens". */
  unit?: string;
  /** Shows the readable form ("120M") next to the input. */
  tokens?: boolean;
}

/** What the form edits: numbers stay as typed text so a large integer is never rounded by a float. */
export interface FormValues {
  numbers: Record<NumberKey, string>;
  domains: string[];
  contactEmail: string;
  piSteps: Record<ConsultationKind, string>;
}

const MAX_DIGITS = 15;

export const KIND_LABELS: Record<ConsultationKind, { label: string; hint: string }> = {
  charter: { label: "Charter", hint: "Writes the research charter." },
  stage_outcome: { label: "Stage outcome", hint: "Answers in one call when a stage ends." },
  failure: { label: "Failure", hint: "Chooses between a rerun and a stop." },
  close: { label: "Close", hint: "Ranks the next research list." },
};

const runs: NumberSpec[] = [
  {
    key: "max_active_runs_per_user",
    label: "Active runs per user",
    hint: "Runs in progress, not finished or stopped, that one user may have.",
    kind: "integer",
    min: 1,
  },
  {
    key: "max_active_runs_total",
    label: "Active runs on the platform",
    hint: "Runs in progress, not finished or stopped, that the whole platform may have.",
    kind: "integer",
    min: 1,
  },
  {
    key: "max_auto_revisions",
    label: "Automatic revisions",
    hint: "How many times a stage may be revised automatically. 0 turns it off.",
    kind: "integer",
    min: 0,
  },
  { key: "max_iterations", label: "Iterations", hint: "Most iterations of a loop in a run.", kind: "integer", min: 1 },
  {
    key: "max_rounds",
    label: "Evidence rounds",
    hint: "Evidence rounds a run may use. A send-back out of a stage that published records starts a round.",
    kind: "integer",
    min: 1,
  },
];

/** The token limits: edited on Models & Providers, apart from the run behaviour in Settings. */
const tokens: NumberSpec[] = [
  {
    key: "run_default_token_budget",
    label: "Default run budget",
    hint: "Tokens (input and output) a new run may spend unless it asks for another amount.",
    kind: "integer",
    min: 1,
    unit: "tokens",
    tokens: true,
  },
  {
    key: "run_max_token_budget",
    label: "Maximum run budget",
    hint: "The most tokens any single run may have. The default budget can't be higher.",
    kind: "integer",
    min: 1,
    unit: "tokens",
    tokens: true,
  },
  {
    key: "user_monthly_token_limit",
    label: "Per user, each month",
    hint: "Tokens (input and output) the ledger may hold in a calendar month (UTC) for one user's runs. The default is four default runs.",
    kind: "integer",
    min: 1,
    unit: "tokens",
    tokens: true,
  },
  {
    key: "platform_monthly_token_limit",
    label: "Whole platform, each month",
    hint: "Tokens (input and output) the ledger may hold in a calendar month (UTC) for all runs.",
    kind: "integer",
    min: 1,
    unit: "tokens",
    tokens: true,
  },
  {
    key: "credits_per_million_tokens",
    label: "Credits per million tokens",
    hint: "The rate card: what a million tokens (input and output) cost. A change applies to usage recorded from the next settings version on.",
    kind: "integer",
    min: 0,
    unit: "credits",
  },
];

const sharing: NumberSpec[] = [
  {
    key: "release_share_max_days",
    label: "Longest release share",
    hint: "Days a share of an approved release may last at most, so a share never outlives its project forever.",
    kind: "integer",
    min: 1,
    max: 3650,
    unit: "days",
  },
];

const capacity: NumberSpec[] = [
  {
    key: "engine_run_retention_days",
    label: "Engine run retention",
    hint: "Days after a run ends before its engines delete their copy of each stage run (inputs, step outputs, logs). The platform keeps the record and the published artifacts.",
    kind: "integer",
    min: 1,
    unit: "days",
  },
  {
    key: "max_active_runs_per_engine",
    label: "Stages at once per engine",
    hint: "Stages of one engine that run at once. A stage past this waits until a slot opens; a stage at a researcher gate holds no slot.",
    kind: "integer",
    min: 1,
  },
  {
    key: "stage_finish_grace_seconds",
    label: "Stage finish grace",
    hint: "Seconds a stage over its time limit has to end on its best output. After that the platform fails it and cancels the engine run.",
    kind: "integer",
    min: 1,
    unit: "seconds",
  },
  {
    key: "sweep_engine_concurrency",
    label: "Watchdog sweep concurrency",
    hint: "Stage runs of one engine the watchdog sweep asks about at a time.",
    kind: "integer",
    min: 1,
  },
  {
    key: "sweep_pass_seconds",
    label: "Watchdog sweep pass",
    hint: "A sweep pass ends after this many seconds. What it did not reach waits for the next pass.",
    kind: "integer",
    min: 1,
    unit: "seconds",
  },
];

const oversight: NumberSpec[] = [
  {
    key: "oversight_llm_timeout_seconds",
    label: "Model call timeout",
    hint: "Sent to the PI service with each consultation.",
    kind: "decimal",
    exclusiveMin: 0,
    unit: "seconds",
  },
  {
    key: "oversight_evalue_alpha",
    label: "E-value alpha",
    hint: "The level of the PI's e-value ledger. A claim is promoted when its product reaches 1 / alpha.",
    kind: "decimal",
    exclusiveMin: 0,
    exclusiveMax: 1,
  },
  {
    key: "oversight_pi_proposal_steps",
    label: "Proposal steps",
    hint: "Model calls of a stage outcome that must first propose the next step, a choice the PI owns.",
    kind: "integer",
    min: 2,
  },
  {
    key: "project_brief_chars",
    label: "Project brief length",
    hint: "Characters of the project brief a stage reads. The oldest detail is cut first, and the brief says so.",
    kind: "integer",
    min: 500,
    unit: "characters",
  },
  {
    key: "project_lesson_min_runs",
    label: "Runs before a lesson",
    hint: "Stage runs in which a review finding kind must recur before the brief lists it as a lesson.",
    kind: "integer",
    min: 2,
  },
];

export const NUMBER_GROUPS = { runs, sharing, capacity, oversight };
const ALL_NUMBER_SPECS: NumberSpec[] = [...tokens, ...runs, ...sharing, ...capacity, ...oversight];
const TOKEN_KEYS = new Set<string>(tokens.map((spec) => spec.key));

/** Which screen edits a field: the run behaviour in Settings, the token limits on Models & Providers. */
export type SettingsScope = "settings" | "tokens";

/** The tabs of the settings screen. */
export type SettingsTab = "runs" | "access" | "retention" | "oversight";

const TAB_OF_GROUP: Record<keyof typeof NUMBER_GROUPS, SettingsTab> = {
  runs: "runs",
  sharing: "access",
  capacity: "retention",
  oversight: "oversight",
};

export function numberSpec(key: NumberKey): NumberSpec {
  const spec = ALL_NUMBER_SPECS.find((item) => item.key === key);
  if (!spec) throw new Error(`Unknown setting ${key}`);
  return spec;
}

/** The tab a field (a number key, `pi_steps.<kind>`, or the contact email) lives on. */
export function tabOfField(key: string): SettingsTab {
  if (key.startsWith("pi_steps.") || key === "oversight_contact_email") return "oversight";
  for (const [group, tab] of Object.entries(TAB_OF_GROUP)) {
    if (NUMBER_GROUPS[group as keyof typeof NUMBER_GROUPS].some((spec) => spec.key === key)) return tab;
  }
  return "runs";
}

/** The id of the control of a field, so a problem can move focus to it. */
export function fieldId(key: string): string {
  return `platform-${key.replace(".", "-")}`;
}

/** The tabs whose fields differ from the saved values. */
export function dirtyTabs(form: FormValues, saved: FormValues): Set<SettingsTab> {
  const tabs = new Set<SettingsTab>();
  for (const spec of ALL_NUMBER_SPECS) {
    if (!TOKEN_KEYS.has(spec.key) && form.numbers[spec.key] !== saved.numbers[spec.key]) {
      tabs.add(tabOfField(spec.key));
    }
  }
  if (JSON.stringify(form.domains) !== JSON.stringify(saved.domains)) tabs.add("access");
  if (form.contactEmail !== saved.contactEmail || JSON.stringify(form.piSteps) !== JSON.stringify(saved.piSteps)) {
    tabs.add("oversight");
  }
  return tabs;
}

export function toForm(settings: PlatformSettings): FormValues {
  const numbers = {} as Record<NumberKey, string>;
  // A backend older than this screen may not report every field: leave it empty, so Save names it.
  for (const spec of ALL_NUMBER_SPECS) numbers[spec.key] = String(settings[spec.key] ?? "");
  const piSteps = {} as Record<ConsultationKind, string>;
  for (const kind of CONSULTATION_KINDS) piSteps[kind] = String(settings.oversight_pi_steps_by_kind[kind]);
  return {
    numbers,
    domains: [...settings.allowed_signup_domains],
    contactEmail: settings.oversight_contact_email ?? "",
    piSteps,
  };
}

/** What a screen edits: its own number fields, and for Settings the lists and per-kind steps. */
function ownValues(form: FormValues, scope: SettingsScope) {
  const mine = ALL_NUMBER_SPECS.filter((spec) => TOKEN_KEYS.has(spec.key) === (scope === "tokens")).map(
    (spec) => form.numbers[spec.key],
  );
  return scope === "tokens" ? mine : [mine, form.domains, form.contactEmail, form.piSteps];
}

/** Whether the fields this screen edits differ from the saved ones. */
export function isDirty(form: FormValues, saved: FormValues, scope: SettingsScope) {
  return JSON.stringify(ownValues(form, scope)) !== JSON.stringify(ownValues(saved, scope));
}

const INTEGER = /^\d+$/;
const DECIMAL = /^(\d+\.?\d*|\.\d+)$/;

/** The number a field holds, or null when the text is not a valid number of that kind. */
export function parseNumber(text: string, kind: "integer" | "decimal"): number | null {
  const value = text.trim();
  if (kind === "integer") {
    if (!INTEGER.test(value) || value.replace(/^0+(?=\d)/, "").length > MAX_DIGITS) return null;
  } else if (!DECIMAL.test(value) || value.length > MAX_DIGITS + 4) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function bounds(spec: NumberSpec) {
  const parts: string[] = [];
  if (spec.min !== undefined) parts.push(`at least ${spec.min.toLocaleString("en-US")}`);
  if (spec.exclusiveMin !== undefined) parts.push(`more than ${spec.exclusiveMin}`);
  if (spec.max !== undefined) parts.push(`at most ${spec.max.toLocaleString("en-US")}`);
  if (spec.exclusiveMax !== undefined) parts.push(`less than ${spec.exclusiveMax}`);
  return parts.join(" and ");
}

function numberProblem(spec: NumberSpec, text: string): string | null {
  const number = parseNumber(text, spec.kind);
  const noun = spec.kind === "integer" ? "a whole number" : "a number";
  if (number === null) return `${spec.label} must be ${noun}${bounds(spec) ? `, ${bounds(spec)}` : ""}.`;
  if (
    (spec.min !== undefined && number < spec.min) ||
    (spec.max !== undefined && number > spec.max) ||
    (spec.exclusiveMin !== undefined && number <= spec.exclusiveMin) ||
    (spec.exclusiveMax !== undefined && number >= spec.exclusiveMax)
  ) {
    return `${spec.label} must be ${bounds(spec)}.`;
  }
  return null;
}

const EMAIL = /^\S+@\S+\.\S+$/;
const DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** A sign-up domain as the backend will compare it: lower case, no "@". Null when it is not a domain. */
export function normalizeDomain(text: string): string | null {
  const domain = text.trim().toLowerCase().replace(/^@/, "");
  return DOMAIN.test(domain) ? domain : null;
}

/** One message per field that has a problem, keyed by the field. Empty when the form can be saved. */
export function validate(form: FormValues, scope: SettingsScope, supportsCreditRate = true): Record<string, string> {
  const problems: Record<string, string> = {};
  for (const spec of ALL_NUMBER_SPECS) {
    if (TOKEN_KEYS.has(spec.key) !== (scope === "tokens")) continue;
    if (!supportsCreditRate && spec.key === "credits_per_million_tokens") continue;
    const problem = numberProblem(spec, form.numbers[spec.key]);
    if (problem) problems[spec.key] = problem;
  }
  if (scope === "tokens") {
    const budget = parseNumber(form.numbers.run_default_token_budget, "integer");
    const most = parseNumber(form.numbers.run_max_token_budget, "integer");
    if (budget !== null && most !== null && budget > most) {
      problems.run_default_token_budget = "The default run budget can't be more than the maximum run budget.";
      problems.run_max_token_budget = "The maximum run budget can't be less than the default run budget.";
    }
    return problems;
  }
  for (const kind of CONSULTATION_KINDS) {
    const steps = parseNumber(form.piSteps[kind], "integer");
    if (steps === null || steps < 1) {
      problems[`pi_steps.${kind}`] = `${KIND_LABELS[kind].label} steps must be a whole number, at least 1.`;
    }
  }
  const email = form.contactEmail.trim();
  if (email && !EMAIL.test(email)) problems.oversight_contact_email = "Enter a valid contact email, or leave it empty.";
  return problems;
}

/** The whole object the backend expects. Only call with a form that passed `validate`. */
export function toSettings(form: FormValues): PlatformSettings {
  const read = (key: NumberKey) => Number(form.numbers[key].trim());
  const steps = {} as Record<ConsultationKind, number>;
  for (const kind of CONSULTATION_KINDS) steps[kind] = Number(form.piSteps[kind].trim());
  return {
    max_auto_revisions: read("max_auto_revisions"),
    max_iterations: read("max_iterations"),
    max_rounds: read("max_rounds"),
    run_default_token_budget: read("run_default_token_budget"),
    run_max_token_budget: read("run_max_token_budget"),
    allowed_signup_domains: form.domains,
    max_active_runs_per_user: read("max_active_runs_per_user"),
    max_active_runs_total: read("max_active_runs_total"),
    user_monthly_token_limit: read("user_monthly_token_limit"),
    platform_monthly_token_limit: read("platform_monthly_token_limit"),
    credits_per_million_tokens: read("credits_per_million_tokens"),
    release_share_max_days: read("release_share_max_days"),
    oversight_llm_timeout_seconds: read("oversight_llm_timeout_seconds"),
    oversight_contact_email: form.contactEmail.trim() || null,
    oversight_evalue_alpha: read("oversight_evalue_alpha"),
    oversight_pi_steps_by_kind: steps,
    oversight_pi_proposal_steps: read("oversight_pi_proposal_steps"),
    project_brief_chars: read("project_brief_chars"),
    project_lesson_min_runs: read("project_lesson_min_runs"),
    max_active_runs_per_engine: read("max_active_runs_per_engine"),
    engine_run_retention_days: read("engine_run_retention_days"),
    sweep_engine_concurrency: read("sweep_engine_concurrency"),
    sweep_pass_seconds: read("sweep_pass_seconds"),
    stage_finish_grace_seconds: read("stage_finish_grace_seconds"),
  };
}

/**
 * The body of a save from one screen: the settings as the server has them now, with only this screen's fields
 * taken from the form. A screen never sends a stale value for a field it does not show, and a key the server
 * returned that this app does not know is passed back unchanged.
 */
export function mergeForSave(latest: PlatformSettings, form: FormValues, scope: SettingsScope): PlatformSettings {
  const edited = toSettings(form);
  const merged: PlatformSettings = { ...latest };
  for (const key of Object.keys(edited) as (keyof PlatformSettings)[]) {
    const mine = TOKEN_KEYS.has(key) === (scope === "tokens");
    if (!mine) continue;
    if (key === "credits_per_million_tokens") {
      // Preserve the server rate if it became available after the editor was opened.
      if (!form.numbers[key].trim()) continue;
      if (latest[key] === undefined) {
        throw new Error("Update the backend before saving the credit rate.");
      }
    }
    Object.assign(merged, { [key]: edited[key] });
  }
  return merged;
}

/** "120,000,000 tokens = 120M" for the text beside a token input; null when the text is not a number. */
export function describeTokens(text: string): string | null {
  const number = parseNumber(text, "integer");
  if (number === null) return null;
  const exact = number.toLocaleString("en-US");
  const units: [number, string][] = [
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"],
  ];
  for (const [size, suffix] of units) {
    if (number >= size) {
      const scaled = number / size;
      const short = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
      return `${exact} tokens = ${short}${suffix}`;
    }
  }
  return `${exact} tokens`;
}
