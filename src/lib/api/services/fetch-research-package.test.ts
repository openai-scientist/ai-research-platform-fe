import { beforeEach, describe, expect, it, vi } from "vitest";

import apiService from "../core";
import { describePackage, fetchResearchPackage, type PackageHypothesis } from "./fetch-research-package";

vi.mock("../core", () => ({ default: { get: vi.fn() } }));
vi.mock("../request", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../request")>()),
  requestDownload: vi.fn(async () => ({ blob: new Blob(), filename: "p.zip", contentType: "application/zip" })),
}));

beforeEach(() => vi.clearAllMocks());

const row = (over: Partial<PackageHypothesis>): PackageHypothesis => ({
  hypothesis_id: "H1",
  statement: null,
  exposure: [],
  outcome: [],
  family: null,
  covariates: [],
  margin: null,
  direction: null,
  rows_used: 0,
  estimate: null,
  ci_low: null,
  ci_high: null,
  p: null,
  execution_status: "not_computed",
  verdict: "not_computed",
  claim_assessment: { value: null, codes: [] },
  next_step: null,
  freshness: null,
  second_computation: null,
  ...over,
});

describe("research package requests", () => {
  it("calls the three endpoints under the run with encoded ids", async () => {
    const signal = new AbortController().signal;
    vi.mocked(apiService.get).mockResolvedValue({ data: "<html></html>" } as never);

    await fetchResearchPackage.getManifest("p 1", "r/1", signal);
    expect(apiService.get).toHaveBeenLastCalledWith("/projects/p%201/runs/r%2F1/research-package", undefined, {
      signal,
    });

    expect(await fetchResearchPackage.getReport("p", "r", "html", signal)).toBe("<html></html>");
    expect(apiService.get).toHaveBeenLastCalledWith(
      "/projects/p/runs/r/research-package/report",
      { format: "html" },
      { responseType: "text", signal },
    );

    await fetchResearchPackage.exportZip("p", "r");
    expect(fetchResearchPackage.getExportUrl("p", "r")).toBe("/api/v1/projects/p/runs/r/research-package/export");
  });
});

describe("describePackage", () => {
  it("is blocked, as Logos marks it, when no hypothesis has a verdict, and names the reason", () => {
    const out = describePackage([row({})]);
    expect(out.state).toBe("blocked");
    expect(out.label).toBe("Blocked · no verdicts");
    expect(out.withoutEstimate).toEqual([{ label: "H1", reason: "it was not computed" }]);
  });

  it("is partial whenever a verdict exists, and lists hypotheses with no estimate", () => {
    const out = describePackage([
      row({ estimate: 1.5, execution_status: "computed", verdict: "supported" }),
      row({ hypothesis_id: "H2" }),
    ]);
    expect(out.state).toBe("partial");
    expect(out.label).toBe("Partial · has verdicts");
    expect(out.headline).toBe("H2 has no estimate. The rest of the report stands.");
  });

  it("stays partial, never complete, when every hypothesis is estimated", () => {
    const out = describePackage([row({ estimate: 0, execution_status: "computed", verdict: "inconclusive" })]);
    expect(out.state).toBe("partial");
    expect(out.withoutEstimate).toEqual([]);
  });

  it("treats an empty summary as blocked", () => {
    expect(describePackage([]).state).toBe("blocked");
  });
});
