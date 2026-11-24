import { describe, expect, it } from "vitest";

import { executionDownload, RESEARCH_PACKAGE_ZIP } from "./execution";

describe("executionDownload", () => {
  it("labels and names the experiment result JSON as JSON, never as a zip", () => {
    expect(executionDownload("platform.experiment_result/v1", "RUN-D953-experiment-result-package.zip")).toEqual({
      label: "Experiment result package (JSON)",
      filename: "experiment-result-package.json",
    });
  });

  it("saves the other JSON documents as .json", () => {
    expect(executionDownload("evidence.records/v1").filename).toBe("evidence-records.json");
    expect(executionDownload("execution.bundle/v1").label).toBe("Evidence bundle (JSON)");
  });

  it("keeps the server's name for files that are not known JSON", () => {
    expect(executionDownload("execution.results/v1", "results.md")).toEqual({
      label: "Results report",
      filename: "results.md",
    });
  });

  it("names the real archive as the zip", () => {
    expect(RESEARCH_PACKAGE_ZIP).toEqual({ label: "Research package (.zip)", filename: "research-package.zip" });
  });
});
