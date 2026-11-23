import { createElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Gate } from "@/lib/run-stream/contract";
import published from "@/lib/run-stream/fixtures/hypothesis-published.json";
import { initialRunState } from "@/lib/run-stream/run-state";

import { AcceptReview } from "./accept-review";
import { WorkspaceContext } from "./workspace-context";

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

  it("offers every advertised answer: Accept, and Send back that waits for a note", () => {
    const gate: Gate = {
      id: "accept-stage-synthetic",
      kind: "accept",
      stageKey: "dataset",
      title: "Accept the data card",
      why: "The data card is published.",
      summary: [],
      options: [
        {
          id: "accept",
          label: "Accept the data card",
          description: "Use it.",
          leads_to: "The next stage can begin",
          confirm_label: "Accept",
          recommended: true,
        },
        {
          id: "send_back",
          label: "Send back with a note",
          description: "The agents revise it.",
          leads_to: "The data card runs again",
          confirm_label: "Send back",
          needsText: true,
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
    const buttons = markup.split("</button>");
    const accept = buttons.find((html) => html.endsWith("Accept"));
    const sendBack = buttons.find((html) => html.endsWith("Send back"));
    expect(accept).toBeDefined();
    expect(accept).not.toMatch(/\sdisabled(?:=|\s|>)/);
    expect(sendBack).toMatch(/\sdisabled(?:=|\s|>)/);
    expect(markup).toContain("Write what should change in the note first.");
  });

  it("shows a published hypothesis as picked and makes Accept available", () => {
    const source = published.primary.hypotheses[0];
    const state = initialRunState("run-1");
    const gate: Gate = {
      id: "accept-hypotheses",
      kind: "accept",
      title: "Accept the hypotheses",
      why: "",
      summary: [],
      options: [],
      stop_index: 1,
      stop_total: 1,
      selection: [{ id: source.id, label: source.statement, falsify: source.falsify.text, fromArtifact: true }],
    };
    const markup = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(
          WorkspaceContext.Provider,
          {
            value: {
              session: {
                runId: "run-1",
                projectId: "project-1",
                label: "RUN-0719",
                pipeline: true,
                createdAt: "",
                state,
              },
              state,
              follow: false,
              setFollow: () => undefined,
              dropMode: false,
              dropped: [],
              toggleDrop: () => undefined,
              kept: [],
              toggleKeep: () => undefined,
            },
          },
          createElement(AcceptReview, { gate, header: null, pending: false, onAnswer: () => undefined }),
        ),
      ),
    );
    const accept = markup.match(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?Accept 1<\/button>/)?.[0];
    expect(accept).toBeDefined();
    expect(accept).not.toMatch(/\sdisabled(?:=|\s|>)/);
    expect(markup).toContain("1 of 1 picked");
    expect(markup).toContain(source.statement);
    expect(markup).toContain(source.falsify.text);
  });

  it("offers Send back beside Accept for the hypotheses, and the PI's advice picks the primary", () => {
    const source = published.primary.hypotheses[0];
    const state = initialRunState("run-1");
    const render = (action: string) => {
      const gate: Gate = {
        id: "accept-hypotheses",
        kind: "accept",
        title: "Accept the hypotheses",
        why: "",
        summary: [],
        options: [
          { id: "accept", label: "Accept", description: "", leads_to: "", confirm_label: "Accept", recommended: true },
          {
            id: "send_back",
            label: "Send back with a note",
            description: "",
            leads_to: "",
            confirm_label: "Send back",
            needsText: true,
          },
        ],
        stop_index: 1,
        stop_total: 1,
        selection: [{ id: source.id, label: source.statement, falsify: source.falsify.text, fromArtifact: true }],
        advice: { consultationId: "", action, confidence: 0.8, text: "advice" } as Gate["advice"],
      };
      const markup = renderToStaticMarkup(
        createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          createElement(
            WorkspaceContext.Provider,
            {
              value: {
                session: { runId: "run-1", projectId: "project-1", label: "R", pipeline: true, createdAt: "", state },
                state,
                follow: false,
                setFollow: () => undefined,
                dropMode: false,
                dropped: [],
                toggleDrop: () => undefined,
                kept: [],
                toggleKeep: () => undefined,
              },
            },
            createElement(AcceptReview, { gate, header: null, pending: false, onAnswer: () => undefined }),
          ),
        ),
      );
      const buttons = markup.split("</button>");
      return {
        markup,
        accept: buttons.find((html) => html.endsWith("Accept 1")) ?? "",
        sendBack: buttons.find((html) => html.endsWith("Send back")) ?? "",
      };
    };
    const accepting = render("accept");
    expect(accepting.sendBack).toMatch(/\sdisabled(?:=|\s|>)/);
    expect(accepting.sendBack).toContain('data-variant="outline"');
    expect(accepting.accept).toContain('data-variant="default"');
    expect(accepting.markup).toContain("Write what should change in the note first.");
    const refining = render("refine");
    expect(refining.sendBack).toContain('data-variant="default"');
    expect(refining.accept).toContain('data-variant="outline"');
  });
});
