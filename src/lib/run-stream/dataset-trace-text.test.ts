import { describe, expect, it } from "vitest";

import { isTraceText } from "./dataset-run-model";

describe("trace text is never shown as work", () => {
  it("recognises span timings and fan-out names", () => {
    for (const text of ["derive screening: 34 ms", "check contract: 40 ms", "fanout search[13]", "fan-out search"]) {
      expect(isTraceText(text)).toBe(true);
    }
  });

  it("leaves human sentences alone", () => {
    for (const text of [
      "Counting the missing values in every column.",
      "The split holds 1,410 exploration rows.",
      "Reading 3 months of records",
    ]) {
      expect(isTraceText(text)).toBe(false);
    }
  });
});
