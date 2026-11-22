import { describe, expect, it } from "vitest";

import type { PackageHypothesis } from "@/lib/api/services/fetch-research-package";

import { figureSlots, layersOf, parseReport, readable, stripActive, svgRatio, unescapeHtml } from "./research-report";

const SVG =
  '<svg viewBox="0 0 480 240" class="lg"><style>.lg{--bg:#fff}</style><script>alert(1)</script><text onclick="x()">a</text></svg>';
const PAGE = `<!doctype html><html><body><main><h1>Research report</h1>
<h2>1. The question and the answer</h2><section class="cover"><p>Question.</p></section>
<figure id="figure-1">${SVG}<figcaption><strong>Figure 1. The estimate under each specification of H1.</strong> Read down the rows. Drawn from: H1-main, H1-alt.</figcaption></figure>
<h2>2. What was done</h2><p>Planned &amp; done.</p>
<h2>Appendix: provenance</h2><p>x</p></main></body></html>`;

const row = (over: Partial<PackageHypothesis>): PackageHypothesis => ({
  hypothesis_id: "H1",
  statement: null,
  exposure: [],
  outcome: [],
  family: null,
  covariates: [],
  margin: null,
  direction: null,
  rows_used: null,
  estimate: null,
  ci_low: null,
  ci_high: null,
  p: null,
  execution_status: "not_computed",
  verdict: "not_computed",
  claim_assessment: { value: "inconclusive", codes: [] },
  next_step: null,
  freshness: null,
  second_computation: null,
  ...over,
});

describe("parseReport", () => {
  const parsed = parseReport(PAGE);

  it("splits the page into numbered sections and keeps the appendix", () => {
    expect(parsed.sections.map((s) => [s.number, s.title])).toEqual([
      ["1", "The question and the answer"],
      ["2", "What was done"],
      ["", "Appendix: provenance"],
    ]);
  });

  it("lifts each figure out with its title, hypothesis and caption, without result ids", () => {
    expect(parsed.figures).toHaveLength(1);
    const [figure] = parsed.figures;
    expect(figure).toMatchObject({
      n: 1,
      kind: "specifications",
      hypothesis: "H1",
      title: "The estimate under each specification of H1",
    });
    expect(figure.caption).toBe("Read down the rows.");
    expect(parsed.sections[0].pieces.map((p) => p.kind)).toEqual(["html", "figure"]);
  });

  it("removes scripts and event handlers before anything is framed", () => {
    expect(parsed.figures[0].svg).not.toMatch(/<script|onclick/i);
    expect(stripActive('<a href="javascript:alert(1)">x</a><p onmouseover=y()>z</p>')).not.toMatch(
      /javascript:|onmouseover/i,
    );
  });
});

describe("figureSlots", () => {
  it("marks the figures the run lacks, with the reason, and never for one that exists", () => {
    const slots = figureSlots(parseReport(PAGE), [row({ estimate: 1.2 })]);
    expect(slots.find((s) => s.key === "specifications:H1")?.missing).toBeNull();
    expect(slots.find((s) => s.key === "lock:H1")?.missing).toMatch(/exploration rows/);
    expect(slots.find((s) => s.key === "flow:file")?.missing).toMatch(/Not drawn/);
  });

  it("says a hypothesis without an estimate has nothing to plot", () => {
    const slots = figureSlots(null, [row({})]);
    expect(slots.find((s) => s.key === "sensitivity:H1")?.missing).toBe(
      "Not drawn: H1 has no estimate, so there is nothing to plot.",
    );
  });
});

describe("words", () => {
  it("reads the three layers from the summary row", () => {
    expect(layersOf(row({}))).toEqual({
      run: ["Not computed", "bad"],
      test: ["No result", "bad"],
      claim: ["Inconclusive", "wait"],
    });
    expect(layersOf(row({ execution_status: "computed", verdict: "supported" })).test).toEqual(["Supported", "ok"]);
  });

  it("formats numbers and entities plainly", () => {
    expect(readable(5.761773592)).toBe("5.762");
    expect(readable(-0.6)).toBe("−0.6");
    expect(unescapeHtml("a &amp; b &#x27;c&#39; &lt;")).toBe("a & b 'c' <");
    expect(svgRatio(SVG)).toBe(2);
  });
});
