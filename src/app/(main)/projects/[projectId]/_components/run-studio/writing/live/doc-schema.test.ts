import { describe, expect, it } from "vitest";

import { inlineOf, paragraphNode, sentencesOf } from "./doc-schema";

const para = (texts: string[]) =>
  paragraphNode({
    paragraph_id: "results-1",
    sentences: texts.map((text) => ({ text, role: "evidence", origin: "model", check: "pending", statements: [] })),
  });

describe("the paper in the editor and back", () => {
  it("keeps every mark of a sentence as the run wrote it", () => {
    const texts = [
      "Recall was {{A1.est}} (95% interval {{A1.ci|interval}}) in {{tab:main}} [@martins2023; @realinho2022].",
      "The authors add [[To be completed by the authors: the ethics approval]].",
    ];
    expect(sentencesOf(para(texts)).map((s) => s.text)).toEqual(texts);
  });

  it("keeps emphasis, bold with italic included, and leaves edge spaces outside it", () => {
    const texts = ["A ***key*** word, an *italic* one, **bold** text, `code`, x~i~ and y^2^."];
    expect(sentencesOf(para(texts)).map((s) => s.text)).toEqual(texts);
    const node = {
      type: "paragraph",
      content: [
        { type: "text", text: "word ", marks: [{ type: "italic" }] },
        { type: "text", text: "next." },
      ],
    };
    expect(sentencesOf(node).map((s) => s.text)).toEqual(["*word* next."]);
  });

  it("opens a sentence with the words you typed before it, and ends one with words typed after it", () => {
    const p = para(["The gain was large."]);
    const marked = p.content ?? [];
    const before = { ...p, content: [{ type: "text", text: "In short, " }, ...marked] };
    expect(sentencesOf(before).map((s) => [s.text, s.origin, s.base])).toEqual([
      ["In short, The gain was large.", "model", "The gain was large."],
    ]);
    const after = { ...p, content: [...marked, { type: "text", text: " A new sentence of mine." }] };
    expect(sentencesOf(after).map((s) => [s.text, s.origin])).toEqual([
      ["The gain was large.", "model"],
      ["A new sentence of mine.", "user"],
    ]);
  });

  it("drops the brackets of a source the sentence names, but keeps its key", () => {
    const nodes = inlineOf("Martins et al. (2023) report a gain [@martins2023].");
    const cite = nodes.find((n) => n.type === "cite");
    expect(cite?.attrs).toMatchObject({ keys: "martins2023", named: "martins2023" });
    expect(sentencesOf({ type: "paragraph", content: nodes }).map((s) => s.text)).toEqual([
      "Martins et al. (2023) report a gain [@martins2023].",
    ]);
  });
});
