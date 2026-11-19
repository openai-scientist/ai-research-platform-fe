import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DataCardBody } from "@/lib/api/services/fetch-dataset-runs";
import { foldDatasetEvents, stepViews } from "@/lib/run-stream/dataset-run-model";
import type { PipelineEnvelope } from "@/lib/run-stream/pipeline-adapter";

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
