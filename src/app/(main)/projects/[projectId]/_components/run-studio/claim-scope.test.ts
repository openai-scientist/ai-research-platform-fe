import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { PipelineAdapter, type PipelineEnvelope } from "@/lib/run-stream/pipeline-adapter";
import { replayRunEvents } from "@/lib/run-stream/reducer";

import { StageScreen } from "./stage-screen";
import { WorkspaceContext } from "./workspace-context";
import { readFileSync } from "node:fs";

function fixture(name: string): PipelineEnvelope[] {
  return readFileSync(`src/lib/run-stream/fixtures/${name}.jsonl`, "utf8")
    .trim()
    .split("\n")
    .map((line) => ({
      run_id: "run-1",
      stage_run_id: "hypothesis-1",
      stage_key: "hypothesis",
      step_key: "work",
      ts: "2026-11-19T08:00:00Z",
      phase: "drafting",
      ...JSON.parse(line),
    }));
}

function render(events: PipelineEnvelope[]) {
  const adapter = new PipelineAdapter({ topic: "Student sleep habits", mode: "light", domains: [] });
  const state = replayRunEvents(
    "run-1",
    events.flatMap((event) => adapter.convert(event)),
  );
  const html = renderToStaticMarkup(
    createElement(
      WorkspaceContext.Provider,
      {
        value: {
          session: { runId: "run-1", projectId: "project-1", label: "RUN-0719", pipeline: true, createdAt: "", state },
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
      createElement(StageScreen, {
        state,
        stageKey: "scope",
        runLabel: "RUN-0719",
        live: false,
        scroller: { current: null },
        onClose: () => undefined,
        onOpenReport: () => undefined,
      }),
    ),
  );
  return { state, html };
}

it("renders the stated claim and locked plan from the claim-first stream", () => {
  const { state, html } = render(fixture("hypothesis-claim-scope"));
  expect(state.stages.scope.summary).toBe("Claim stated · review plan locked");
  for (const value of [
    "Research claim",
    "Student sleep habits",
    "Is longer sleep associated with higher grades?",
    "Schools need evidence to guide policies that support student sleep.",
    "course_grade",
    "nightly_sleep_hours",
    "&gt; 0",
    "OpenAlex, Crossref",
    "Studies reporting sleep and grades",
    "2015 and later",
  ]) {
    expect(html).toContain(value);
  }
  expect(html).not.toMatch(/Research goal|Sub-question tree|Topic evaluation|Not written yet|Goal set/);
});

it("keeps the locked plan when the researcher skips the claim", () => {
  const events = fixture("hypothesis-claim-scope").map((event) =>
    event.type === "hypothesis.ask_user_answered"
      ? { ...event, payload: { ...event.payload, option_id: "skip", params: {} } }
      : event,
  );
  const { state, html } = render(events);
  expect(state.stages.scope.summary).toBe("Claim skipped · review plan locked");
  expect(html).toContain("Skipped: the review proposes claims.");
  expect(html).not.toContain("course_grade");
});

it("keeps the research goal and sub-question tree for a run that emits them", () => {
  const { state, html } = render(fixture("logos-run"));
  expect(state.stages.scope.summary).toMatch(/Goal set.*sub-question/);
  expect(html).toContain("Research goal");
  expect(html).toContain("Sub-question tree");
  expect(html).not.toContain("Research claim");
});
