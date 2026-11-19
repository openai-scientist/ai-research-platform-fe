import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Gate } from "@/lib/run-stream/contract";

import { AcceptReview } from "./accept-review";

vi.mock("motion/react", () => ({
  AnimatePresence: "div",
  MotionConfig: "div",
  motion: new Proxy({}, { get: (_target, element: string) => element }),
}));

describe("AcceptReview", () => {
  it("renders an enabled accept action without a hypothesis picker for a stage gate", () => {
    const gate: Gate = {
      id: "accept-stage-synthetic",
      kind: "accept",
      title: "Accept the data card",
      why: "The data card is published and ready for the next stage.",
      summary: ["The data card is ready to pass to the next stage."],
      options: [
        {
          id: "accept",
          label: "Accept the data card",
          description: "Use this published data card in the next stage.",
          leads_to: "The next stage can begin",
          confirm_label: "Accept",
          recommended: true,
        },
      ],
      stop_index: 1,
      stop_total: 1,
    };
    const markup = renderToStaticMarkup(
      createElement(AcceptReview, {
        gate,
        header: createElement("h2", null, gate.title),
        pending: false,
        onAnswer: () => undefined,
      }),
    );
    const acceptButton = markup.match(/<button\b[^>]*>[\s\S]*?Accept<\/button>/)?.[0];

    expect(acceptButton).toBeDefined();
    expect(acceptButton).not.toMatch(/\sdisabled(?:=|\s|>)/);
    expect(markup).not.toMatch(/Take forward|0 of 0|Accept 0/);
  });
});
