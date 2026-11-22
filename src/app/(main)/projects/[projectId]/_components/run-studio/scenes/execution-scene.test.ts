import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { executionEvidence } from "@/lib/run-stream/execution";

import { ExecutionReadout } from "./execution-scene";

it("renders three distinct layers from a synthetic evidence.records/v1 artifact", () => {
  const records = executionEvidence({
    schema: "evidence.records/v1",
    records: [
      {
        record_id: "synthetic/primary",
        analysis_id: "Synthetic comparison",
        role: "primary",
        hypothesis_ids: ["H1"],
        estimate: 0,
        ci_low: -0.12,
        ci_high: 0.12,
        n: 20,
        execution_status: { state: "computed" },
        verdict: "trivial",
        reason: "The interval stayed inside the registered effect margin.",
        assessment: { value: "inconclusive", reason: "The synthetic sample did not meet the freshness criterion." },
      },
    ],
  });
  const html = renderToStaticMarkup(createElement(ExecutionReadout, { records }));
  expect(html).toContain("Estimate 0");
  expect(html).toContain("[-0.12, 0.12]");
  expect(html).toContain('<dt class="font-medium">Execution status</dt><dd>Computed</dd>');
  expect(html).toContain('<dt class="font-medium">Statistical verdict</dt><dd>Trivial</dd>');
  expect(html).toContain('<dt class="font-medium">Claim assessment</dt><dd>Inconclusive</dd>');
});
