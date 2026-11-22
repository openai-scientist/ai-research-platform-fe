import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DataCardBody } from "@/lib/api/services/fetch-dataset-runs";
import { foldDatasetEvents, stepViews } from "@/lib/run-stream/dataset-run-model";
import type { PipelineEnvelope } from "@/lib/run-stream/pipeline-adapter";

import { DatasetColumnEvidence } from "./dataset-column-evidence";
import { DatasetDictionary } from "./dataset-dictionary";
import { DatasetRunScene } from "./dataset-run-scene";
import { DatasetStageCard } from "./dataset-stage-scene";

function event(seq: number, type: string, payload: Record<string, unknown>): PipelineEnvelope {
  return {
    seq,
    ts: "2026-11-16T07:36:05Z",
    run_id: "run-1",
    type,
    stage_key: "dataset",
    step_key: "review",
    phase: "reviewing",
    payload,
  };
}

const model = foldDatasetEvents([
  event(1, "review.completed", { round: 1, passed: false, artifact_id: "review-1" }),
  event(2, "artifact.delivered", { schema: "dataset.data_card/v1", artifact_id: "card-1" }),
  event(3, "stage.status_changed", { status: "COMPLETED" }),
]);
const card: DataCardBody = {
  title: "Travel observations",
  n_rows: 120,
  n_columns: 1,
  variables: [
    {
      name: "trip_count",
      type: "numeric",
      role: "input",
      measure: "count",
      summary: { n_valid: null, n_missing: null },
      flags: ["levels_withheld"],
    },
  ],
};

describe("Dataset stage results in Run Studio", () => {
  it("renders a dedicated live PI work state before the charter is ready", () => {
    const drafting = foldDatasetEvents([
      event(1, "pi.consultation_requested", { kind: "charter", authority: "researcher" }),
      event(2, "attention.required", { kind: "charter", reason: "researcher_decision" }),
    ]);
    const html = renderToStaticMarkup(
      createElement(DatasetRunScene, {
        model: drafting,
        steps: stepViews(drafting, { local: true, ended: null }),
        dataset: { name: "Travel observations" },
        version: undefined,
        local: true,
        live: true,
        focusKey: null,
        onView: () => undefined,
      }),
    );
    expect(html).toContain("Drafting the research plan");
    expect(html).toContain("The PI is drafting the scope, aims and success criteria");
  });

  it("follows recorded quality and definition work before there is a completed item", () => {
    const quality = foldDatasetEvents([event(1, "dataset.progress", { task: "quality", state: "running" })]);
    expect(stepViews(quality, { local: true, ended: null }).find((step) => step.state === "now")?.key).toBe(
      "profile_quality",
    );
    const dictionary = foldDatasetEvents(
      [event(2, "dataset.progress", { task: "describing", state: "running" })],
      quality,
    );
    expect(stepViews(dictionary, { local: true, ended: null }).find((step) => step.state === "now")?.key).toBe(
      "dictionary",
    );
  });

  it("lists all ten columns in both evidence and dictionary without a nested dictionary scroll", () => {
    const columns = Array.from({ length: 10 }, (_, index) => `source_${index + 1}`);
    const evidence = renderToStaticMarkup(
      createElement(DatasetColumnEvidence, { columnNames: columns, agent: null, local: true }),
    );
    const dictionary = renderToStaticMarkup(
      createElement(DatasetDictionary, { columns, variables: [], agent: null, live: false }),
    );
    expect(evidence).toContain("source_10");
    expect(evidence).not.toContain("more columns");
    expect(dictionary).toContain("source_10");
    expect(dictionary).not.toContain("overflow-y-auto");
  });

  it("renders the run artifact's data card inline, with withheld values and a secondary page link", () => {
    expect(model.dataCardArtifactId).toBe("card-1");
    const html = renderToStaticMarkup(
      createElement(DatasetStageCard, {
        stage: { card, cardLoading: false, model, version: undefined },
        projectId: "project-1",
        datasetId: "dataset-1",
        runId: "run-1",
      }),
    );

    expect(html).toContain('aria-label="Data card"');
    for (const text of ["Travel observations", "trip_count", "numeric", "Missing", "Withheld", "Expand data card"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain("/projects/project-1/datasets/dataset-1?view=card&amp;run=run-1");
  });

  it("shows the completed review finding and acceptance prompt in place of the work skeleton", () => {
    expect(model.reviewResult?.artifactId).toBe("review-1");
    const html = renderToStaticMarkup(
      createElement(DatasetRunScene, {
        model,
        dataset: { name: "Travel observations" },
        steps: stepViews(model, { local: true, ended: null }),
        version: undefined,
        local: true,
        live: false,
        focusKey: null,
        onView: () => undefined,
        waitingForAccept: true,
        findings: {
          passed: false,
          findings: [{ finding_id: "F1", severity: "blocking", issue: "The split is missing." }],
        },
      }),
    );

    expect(html).toContain("Review and hand off");
    expect(html).toContain("Waiting for you: accept the data card");
    expect(html).toContain("1 blocking finding recorded.");
    expect(html).toContain("The split is missing.");
    expect(html).not.toContain("Working on it");
    expect(html).not.toContain("animate-pulse");
  });
});
