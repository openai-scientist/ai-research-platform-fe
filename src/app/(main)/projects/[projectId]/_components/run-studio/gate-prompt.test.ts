import { describe, expect, it } from "vitest";

import { parseGatePrompt, parseGatePromptTokens } from "./gate-prompt";

describe("parseGatePrompt", () => {
  it("splits labelled question prompts into sections and recognizes inline The idea labels", () => {
    const prompt = [
      "Decision: Choose the outcome column.",
      "The data shows: exam_score: Student's exam score. (the assistant's reading) Filled in 600 of 600 rows.",
      "Suggested: Approve to continue.",
      "Why it matters: It is what you want to explain. The idea: Name it before you see results.",
      "Risk: A wrong outcome answers the wrong question.",
      "",
      "Why you are asked: This decision is yours.",
    ].join("\n");

    expect(parseGatePrompt(prompt)).toEqual({
      kind: "labelled",
      question: { label: "Decision", text: "Choose the outcome column." },
      essential: [
        { label: "The data shows", text: "exam_score: Student's exam score. Filled in 600 of 600 rows." },
        { label: "Risk", text: "A wrong outcome answers the wrong question." },
      ],
      more: [
        { label: "Why it matters", text: "It is what you want to explain." },
        { label: "The idea", text: "Name it before you see results." },
        { label: "Why you are asked", text: "This decision is yours.", breakBefore: true },
      ],
    });
  });

  it("omits Suggested because the option list already marks the recommendation", () => {
    expect(
      parseGatePrompt(
        "Decision: Choose the outcome.\nSuggested: Approve if you accept the evidence. This also flags predictors.",
      ),
    ).toMatchObject({
      kind: "labelled",
      more: [],
    });
  });

  it("keeps unlabelled prompts as plain paragraphs", () => {
    expect(parseGatePrompt("Review the shortlist.\n\nApprove to continue or search again.")).toEqual({
      kind: "paragraphs",
      paragraphs: ["Review the shortlist.", "Approve to continue or search again."],
    });
  });
});

describe("parseGatePromptTokens", () => {
  it("recognizes a leading column identifier and a filled row count", () => {
    expect(parseGatePromptTokens("exam_score: Student's exam score. Filled in 600 of 600 rows.")).toEqual([
      { kind: "column", text: "exam_score" },
      { kind: "text", text: "Student's exam score. " },
      { kind: "fill-count", filled: "600", total: "600" },
    ]);
  });

  it("drops punctuation left at the start of text following a fill-count badge", () => {
    expect(parseGatePromptTokens("Filled in 600 of 600 rows: matched to every record.")).toEqual([
      { kind: "fill-count", filled: "600", total: "600" },
      { kind: "text", text: " matched to every record." },
    ]);
  });

  it("leaves unrecognized prose as a plain text token", () => {
    expect(parseGatePromptTokens("Exam-score: the outcome has no matching column.")).toEqual([
      { kind: "text", text: "Exam-score: the outcome has no matching column." },
    ]);
  });
});
