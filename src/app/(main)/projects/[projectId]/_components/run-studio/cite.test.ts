import { describe, expect, it } from "vitest";

import type { KnowledgeCard } from "@/lib/run-stream/contract";

import { citeLabels, citeParts } from "./cite";

const card = (id: string, citation: string) => ({ id, citation }) as KnowledgeCard;
const cards = new Map([
  ["card-p-2b115a3deacd", card("card-p-2b115a3deacd", "Terven, Cordova & Smith, 2026")],
  ["card-p-98d09272ea8b", card("card-p-98d09272ea8b", "Kobeissi et al., 2026")],
]);

describe("citeParts", () => {
  it("names each card by its short citation", () => {
    expect(citeLabels("unresolved (card-p-2b115a3deacd; card-p-98d09272ea8b).", cards)).toBe(
      "unresolved (Terven 2026; Kobeissi 2026).",
    );
  });

  it("drops the word card the model wrote before the id", () => {
    expect(citeLabels("Card card-p-98d09272ea8b supports the claim only in part.", cards)).toBe(
      "Kobeissi 2026 supports the claim only in part.",
    );
    expect(citeParts("Cards card-p-2b115a3deacd and card-p-98d09272ea8b agree", cards).map((p) => p.kind)).toEqual([
      "cite",
      "text",
      "cite",
      "text",
    ]);
  });

  it("keeps an unknown card as a citation without a name, and leaves other text alone", () => {
    expect(citeParts("see card-p-000000000000", cards)).toEqual([
      { kind: "text", text: "see " },
      { kind: "cite", id: "card-p-000000000000", text: "a cited paper" },
    ]);
    expect(citeParts("No cards here.", cards)).toEqual([{ kind: "text", text: "No cards here." }]);
  });

  it("reads a card shortened to the start or the end of its id, when only one card matches", () => {
    expect(citeLabels("card 2ea8b concerns reader support", cards)).toBe("Kobeissi 2026 concerns reader support");
    expect(citeLabels("card 2b11 is about it", cards)).toBe("Terven 2026 is about it");
    expect(citeLabels("card 1234 is not here, and card 2026 is not a card", cards)).toBe(
      "card 1234 is not here, and card 2026 is not a card",
    );
  });
});
