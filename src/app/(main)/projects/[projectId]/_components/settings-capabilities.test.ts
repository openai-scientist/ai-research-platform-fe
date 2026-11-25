import { describe, expect, it } from "vitest";

import { type Capabilities, fieldSupported, openTab, sectionHasSupported, tabVisible } from "./settings-capabilities";

const on = { supported: true, reason_code: null };
const off = { supported: false, reason_code: "NOT_ENFORCED_YET" };

// What the Platform reports today: models and literature apply nothing, runs applies two fields.
const today: Capabilities = {
  "general.language": on,
  "general.visibility": off,
  "runs.token_budget": on,
  "runs.stage_limit": on,
  "runs.mode": off,
  "runs.concurrent": off,
  "models.stage": off,
  "models.review": off,
  "literature.arxiv": off,
  "review.before_lock": on,
  "review.format": off,
  "data.types": on,
  "spending.token_limit": on,
};

const TABS = ["general", "access", "runs", "models", "literature", "review", "data", "integrations", "spending"];

describe("project settings capabilities", () => {
  it("shows a field only when the Platform applies it", () => {
    expect(fieldSupported(today, "runs", "token_budget")).toBe(true);
    expect(fieldSupported(today, "runs", "mode")).toBe(false);
    expect(fieldSupported(today, "general", "visibility")).toBe(false);
    expect(fieldSupported(today, "runs", "unknown_field")).toBe(false);
  });

  it("knows whether a section applies anything", () => {
    expect(sectionHasSupported(today, "runs")).toBe(true);
    expect(sectionHasSupported(today, "models")).toBe(false);
    expect(sectionHasSupported(today, "literature")).toBe(false);
    expect(sectionHasSupported(today, "nothing")).toBe(false);
  });

  it("hides the tabs that are only settings and apply nothing: AI models and Literature", () => {
    expect(TABS.filter((tab) => !tabVisible(today, tab))).toEqual(["models", "literature"]);
  });

  it("never hides a tab with more than settings in it", () => {
    expect(tabVisible({}, "general")).toBe(true);
    expect(tabVisible({}, "access")).toBe(true);
    expect(tabVisible({}, "integrations")).toBe(true);
    expect(tabVisible({}, "spending")).toBe(true);
  });

  it("opens General for a tab that is hidden or unknown, and a shown tab as asked", () => {
    expect(openTab(today, "models", TABS)).toBe("general");
    expect(openTab(today, "literature", TABS)).toBe("general");
    expect(openTab(today, "nope", TABS)).toBe("general");
    expect(openTab(today, null, TABS)).toBe("general");
    expect(openTab(today, "runs", TABS)).toBe("runs");
  });

  it("shows a tab by itself once the Platform applies one of its fields", () => {
    const later: Capabilities = { ...today, "models.stage": on };
    expect(tabVisible(later, "models")).toBe(true);
    expect(openTab(later, "models", TABS)).toBe("models");
    expect(fieldSupported(later, "models", "review")).toBe(false);
  });
});
