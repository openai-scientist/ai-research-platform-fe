import { describe, expect, it } from "vitest";

import { compareHypothesis, diffWords, overlap, parseHypotheses, sidesOfPatch } from "./revision";

const patch = [
  "--- before/hypotheses.md",
  "+++ after/hypotheses.md",
  "@@ -1,9 +1,10 @@",
  " # Hypotheses",
  " ",
  "-## H1: TTA helps most where images moved furthest.",
  "+## H1: Flip averaging helps most where the two views agree.",
  " ",
  " - **Gap:** G1",
  "-- **Outcome:** ECE reduction in each quartile.",
  "+- **Outcome:** Top-label ECE in percentage points, 15 equal-width bins.",
  " - **Limitations:**",
  "-  - Distance may reflect difficulty.",
  "+  - Agreement is a proxy for stability.",
  "+  - ECE depends on binning.",
].join("\n");

describe("revision", () => {
  it("rebuilds both sides of a patch and reads the hypotheses on each", () => {
    const { before, after } = sidesOfPatch(patch);
    const h1Before = parseHypotheses(before).get("H1");
    const h1After = parseHypotheses(after).get("H1");
    expect(h1Before).toEqual({
      id: "H1",
      statement: "TTA helps most where images moved furthest.",
      fields: [
        { label: "Gap", value: "G1" },
        { label: "Outcome", value: "ECE reduction in each quartile." },
        { label: "Limitations", value: "Distance may reflect difficulty." },
      ],
    });
    expect(h1After?.fields[2]).toEqual({
      label: "Limitations",
      value: "Agreement is a proxy for stability.\nECE depends on binning.",
    });
    const { changed, same } = compareHypothesis(h1Before, h1After);
    expect(changed.map((c) => c.label)).toEqual(["Claim", "Outcome", "Limitations"]);
    expect(same).toEqual(["Gap"]);
  });

  it("diffs by words and tells a small edit from a rewrite", () => {
    const parts = diffWords("ECE reduction in each quartile.", "Top-label ECE reduction in each bin.");
    expect(parts).toEqual([
      { kind: "added", text: "Top-label " },
      { kind: "same", text: "ECE reduction in each " },
      { kind: "removed", text: "quartile." },
      { kind: "added", text: "bin." },
    ]);
    expect(overlap(parts)).toBeCloseTo(4 / 6);
    expect(overlap(diffWords("one two three", "four five six"))).toBe(0);
    expect(overlap(diffWords("same text", "same text"))).toBe(1);
  });
});
