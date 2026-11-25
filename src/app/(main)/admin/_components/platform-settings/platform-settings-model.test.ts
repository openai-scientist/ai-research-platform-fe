import { describe, expect, it } from "vitest";

import type { PlatformSettings } from "@/lib/api/services/fetch-admin";

import {
  describeTokens,
  type FormValues,
  isDirty,
  mergeForSave,
  normalizeDomain,
  parseNumber,
  toForm,
  toSettings,
  validate,
} from "./platform-settings-model";

const settings: PlatformSettings = {
  max_auto_revisions: 2,
  max_iterations: 3,
  max_rounds: 3,
  run_default_token_budget: 30_000_000,
  run_max_token_budget: 60_000_000,
  allowed_signup_domains: ["example.com"],
  max_active_runs_per_user: 2,
  max_active_runs_total: 10,
  user_monthly_token_limit: 120_000_000,
  platform_monthly_token_limit: 1_000_000_000,
  credits_per_million_tokens: 1_000_000,
  release_share_max_days: 90,
  oversight_llm_timeout_seconds: 180,
  oversight_contact_email: null,
  oversight_evalue_alpha: 0.05,
  oversight_pi_steps_by_kind: { charter: 24, stage_outcome: 1, failure: 24, close: 24 },
  oversight_pi_proposal_steps: 24,
  project_brief_chars: 6000,
  project_lesson_min_runs: 3,
  max_active_runs_per_engine: 3,
  engine_run_retention_days: 90,
  sweep_engine_concurrency: 5,
  sweep_pass_seconds: 60,
  stage_finish_grace_seconds: 300,
};

const settingsProblems = (form: FormValues) => validate(form, "settings");
const tokenProblems = (form: FormValues) => validate(form, "tokens");

const withNumber = (form: FormValues, key: keyof FormValues["numbers"], value: string): FormValues => ({
  ...form,
  numbers: { ...form.numbers, [key]: value },
});

describe("platform settings form", () => {
  it("round-trips every setting, so a save sends the whole object unchanged", () => {
    expect(toSettings(toForm(settings))).toEqual(settings);
    expect(Object.keys(toSettings(toForm(settings))).sort()).toEqual(Object.keys(settings).sort());
  });

  it("keeps a billion exact and a null contact email null", () => {
    const form = toForm(settings);
    expect(form.numbers.platform_monthly_token_limit).toBe("1000000000");
    expect(toSettings(form).platform_monthly_token_limit).toBe(1_000_000_000);
    expect(toSettings(form).oversight_contact_email).toBeNull();
    expect(toSettings({ ...form, contactEmail: " a@example.com " }).oversight_contact_email).toBe("a@example.com");
  });

  it("is dirty only when something changed", () => {
    const saved = toForm(settings);
    expect(isDirty(toForm(settings), saved, "settings")).toBe(false);
    expect(isDirty(withNumber(saved, "max_rounds", "4"), saved, "settings")).toBe(true);
    expect(isDirty({ ...saved, domains: [] }, saved, "settings")).toBe(true);
  });

  it("accepts the saved values", () => {
    expect(settingsProblems(toForm(settings))).toEqual({});
  });

  it("mirrors the backend bounds", () => {
    const form = toForm(settings);
    expect(settingsProblems(withNumber(form, "max_auto_revisions", "0"))).toEqual({});
    expect(settingsProblems(withNumber(form, "max_iterations", "0"))).toHaveProperty("max_iterations");
    expect(settingsProblems(withNumber(form, "release_share_max_days", "3651"))).toHaveProperty(
      "release_share_max_days",
    );
    expect(settingsProblems(withNumber(form, "oversight_pi_proposal_steps", "1"))).toHaveProperty(
      "oversight_pi_proposal_steps",
    );
    expect(settingsProblems(withNumber(form, "project_brief_chars", "499"))).toHaveProperty("project_brief_chars");
    expect(settingsProblems(withNumber(form, "project_lesson_min_runs", "1"))).toHaveProperty(
      "project_lesson_min_runs",
    );
    expect(settingsProblems(withNumber(form, "oversight_evalue_alpha", "1"))).toHaveProperty("oversight_evalue_alpha");
    expect(settingsProblems(withNumber(form, "oversight_evalue_alpha", "0"))).toHaveProperty("oversight_evalue_alpha");
    expect(settingsProblems(withNumber(form, "oversight_evalue_alpha", "0.1"))).toEqual({});
    expect(settingsProblems(withNumber(form, "oversight_llm_timeout_seconds", "0"))).toHaveProperty(
      "oversight_llm_timeout_seconds",
    );
    expect(tokenProblems(withNumber(form, "run_default_token_budget", ""))).toHaveProperty("run_default_token_budget");
    expect(tokenProblems(withNumber(form, "credits_per_million_tokens", "0"))).toEqual({});
  });

  it("flags both budgets when the default is above the maximum", () => {
    const problems = tokenProblems(withNumber(toForm(settings), "run_default_token_budget", "60000001"));
    expect(Object.keys(problems).sort()).toEqual(["run_default_token_budget", "run_max_token_budget"]);
    expect(tokenProblems(withNumber(toForm(settings), "run_default_token_budget", "60000000"))).toEqual({});
  });

  it("checks each consultation kind's steps and the contact email", () => {
    const form = toForm(settings);
    expect(settingsProblems({ ...form, piSteps: { ...form.piSteps, failure: "0" } })).toHaveProperty(
      "pi_steps.failure",
    );
    expect(settingsProblems({ ...form, contactEmail: "nope" })).toHaveProperty("oversight_contact_email");
    expect(settingsProblems({ ...form, contactEmail: "" })).toEqual({});
  });

  it("parses numbers without float rounding or odd input", () => {
    expect(parseNumber("1000000000", "integer")).toBe(1_000_000_000);
    expect(parseNumber("007", "integer")).toBe(7);
    expect(parseNumber("1.5", "integer")).toBeNull();
    expect(parseNumber("-1", "integer")).toBeNull();
    expect(parseNumber("12345678901234567890", "integer")).toBeNull();
    expect(parseNumber("0.05", "decimal")).toBe(0.05);
    expect(parseNumber(".5", "decimal")).toBe(0.5);
    expect(parseNumber("", "decimal")).toBeNull();
  });

  it("describes tokens readably next to the exact value", () => {
    expect(describeTokens("120000000")).toBe("120,000,000 tokens = 120M");
    expect(describeTokens("1000000000")).toBe("1,000,000,000 tokens = 1B");
    expect(describeTokens("30500000")).toBe("30,500,000 tokens = 30.5M");
    expect(describeTokens("999")).toBe("999 tokens");
    expect(describeTokens("abc")).toBeNull();
  });

  it("normalizes sign-up domains", () => {
    expect(normalizeDomain(" @Example.COM ")).toBe("example.com");
    expect(normalizeDomain("a@b.com")).toBeNull();
    expect(normalizeDomain("localhost")).toBeNull();
  });

  it("keeps each screen's changes to its own fields", () => {
    const saved = toForm(settings);
    const tokenEdit = withNumber(saved, "run_default_token_budget", "31000000");
    const runEdit = withNumber(saved, "max_rounds", "4");
    expect(isDirty(tokenEdit, saved, "tokens")).toBe(true);
    expect(isDirty(tokenEdit, saved, "settings")).toBe(false);
    expect(isDirty(runEdit, saved, "settings")).toBe(true);
    expect(isDirty(runEdit, saved, "tokens")).toBe(false);
    expect(tokenProblems(withNumber(saved, "max_rounds", "0"))).toEqual({});
    expect(settingsProblems(withNumber(saved, "run_default_token_budget", "70000000"))).toEqual({});
  });

  it("saves from one screen without sending stale values for the other screen's fields", () => {
    // Both screens loaded the settings as they were. Meanwhile the other screen saved new values.
    const basis = toForm(settings);
    const server: PlatformSettings = {
      ...settings,
      max_rounds: 5,
      allowed_signup_domains: ["new.example.com"],
      user_monthly_token_limit: 150_000_000,
      run_max_token_budget: 80_000_000,
    };

    // The token screen edits the default budget; the server's run behaviour stays as the server has it.
    const fromTokens = mergeForSave(server, withNumber(basis, "run_default_token_budget", "31000000"), "tokens");
    expect(fromTokens.run_default_token_budget).toBe(31_000_000);
    expect(fromTokens.max_rounds).toBe(5);
    expect(fromTokens.allowed_signup_domains).toEqual(["new.example.com"]);
    // Its own untouched fields come from its form (the basis), the others from the server.
    expect(fromTokens.run_max_token_budget).toBe(60_000_000);

    // The settings screen edits max_active_runs_total; the server's token limits stay as the server has them.
    const fromSettings = mergeForSave(server, withNumber(basis, "max_active_runs_total", "12"), "settings");
    expect(fromSettings.max_active_runs_total).toBe(12);
    expect(fromSettings.user_monthly_token_limit).toBe(150_000_000);
    expect(fromSettings.run_max_token_budget).toBe(80_000_000);
    expect(fromSettings.max_rounds).toBe(3);
  });

  it("sends the whole object, and passes back a key it does not know", () => {
    const server = { ...settings, signal_routes: { dataset_fitness: { stage: "dataset" } } } as PlatformSettings;
    const body = mergeForSave(server, toForm(settings), "tokens");
    expect(body).toEqual(server);
    expect(Object.keys(mergeForSave(settings, toForm(settings), "settings")).sort()).toEqual(
      Object.keys(settings).sort(),
    );
  });

  it("lets an older server save supported token limits without adding an unknown credit rate", () => {
    const { credits_per_million_tokens: _missing, ...older } = settings;
    const form = withNumber(toForm(older), "run_default_token_budget", "31000000");
    expect(form.numbers.credits_per_million_tokens).toBe("");
    expect(validate(form, "tokens", false)).toEqual({});
    expect(mergeForSave(older, form, "tokens")).toEqual({ ...older, run_default_token_budget: 31_000_000 });
    expect(mergeForSave(settings, form, "tokens").credits_per_million_tokens).toBe(settings.credits_per_million_tokens);
    expect(() => mergeForSave(older, withNumber(form, "credits_per_million_tokens", "10"), "tokens")).toThrow(
      "Update the backend before saving the credit rate.",
    );
  });
});
