import { describe, expect, it } from "vitest";

import type { DocPaper, DocSection } from "@/lib/api/services/fetch-document";

import { changesOf } from "./doc-save";

const sentence = (text: string) => ({
  text,
  role: "evidence",
  origin: "model" as const,
  check: "pass",
  statements: [],
});
const section = (id: string, heading: string, paras: [string, string][]): DocSection => ({
  section_id: id,
  heading,
  paragraphs: paras.map(([pid, text]) => ({ paragraph_id: pid, sentences: [sentence(text)] })),
});
const paper = (sections: DocSection[]): DocPaper => ({ title: "T", abstract: "A", keywords: [], sections });

describe("what a save changes", () => {
  const methods = section("methods", "Methods", [["methods-1", "We split."]]);
  const results = section("results", "Results", [
    ["results-1", "Recall rose."],
    ["results-2", "Precision held."],
  ]);
  const discussion = section("discussion", "Discussion", [["discussion-1", "This suggests."]]);
  const before = paper([methods, results, discussion]);

  it("names a paragraph moved to another section once, with where it came from", () => {
    const after = paper([
      methods,
      section("results", "Results", [
        ["results-1", "Recall rose."],
        ["results-2", "Precision held."],
        ["discussion-1", "This suggests."],
      ]),
      section("discussion", "Discussion", []),
    ]);
    const changes = changesOf(before, after);
    expect(changes).toEqual([
      { kind: "paragraph_moved", where: "discussion-1", note: "Paragraph moved from Discussion to Results" },
    ]);
  });

  it("names sections put in another order, and paragraphs reordered in a section", () => {
    const after = paper([
      section("results", "Results", [
        ["results-2", "Precision held."],
        ["results-1", "Recall rose."],
      ]),
      methods,
      discussion,
    ]);
    const kinds = changesOf(before, after).map((c) => [c.kind, c.where]);
    expect(kinds).toEqual([
      ["section_moved", "sections"],
      ["paragraph_moved", "results"],
    ]);
  });
});
