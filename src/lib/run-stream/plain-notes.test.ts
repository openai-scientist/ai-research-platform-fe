import { describe, expect, it } from "vitest";

import { plainNote } from "./plain-notes";

describe("plainNote", () => {
  it("says what a not fresh claim means for the researcher", () => {
    const text = plainNote("the claim is not fresh: 2 earlier runs on this file already saw its result");
    expect(text).toContain("second look");
    expect(text).toContain("not confirmatory evidence");
    expect(text).toContain("2 earlier runs");
    expect(plainNote("the claim is not fresh: 1 earlier run on this file already saw its result")).toContain(
      "one earlier run",
    );
  });

  it("maps the note about earlier unsealed runs", () => {
    const text = plainNote(
      "the claim is not fresh: it was chosen after 1 earlier run of the researcher on this file unsealed results on the same rows",
    );
    expect(text).toContain("chosen after one earlier run");
    expect(text).not.toContain("unsealed");
  });

  it("maps known notes inside longer text and leaves the rest", () => {
    expect(plainNote("Limits: the run ended before the unseal; see H1.")).toBe(
      "Limits: Execution stopped before the results were opened, so this step never ran.; see H1.",
    );
    expect(plainNote("H1 has no verdict")).toBe("H1 has no verdict, because its result was never opened.");
  });

  it("returns unknown notes as they are", () => {
    expect(plainNote("something no one mapped")).toBe("something no one mapped");
    expect(plainNote("")).toBe("");
  });
});
