import { describe, expect, it } from "vitest";

import fixture from "./fixtures/run-d953-experiment-result.json";
import { intervalRows, packageFigures } from "./result-figures";

describe("packageFigures", () => {
  it("draws the F2 interval chart of RUN-D953 from its definition", () => {
    const [figure, ...rest] = packageFigures(fixture);
    expect(rest).toHaveLength(0);
    expect(figure).toMatchObject({ id: "F2", chart: "interval", sources: ["H1-main"] });
    expect(figure.title).toMatch(/estimated difference in v4/);
    expect(figure.svg).toContain("<svg");
    expect(figure.svg).toContain("H1-main");
    expect(figure.svg).toContain("4.987");
    expect(figure.svg).toContain('role="img"');
  });

  it("keeps a chart it cannot draw as a figure without markup", () => {
    const [figure] = packageFigures({ figures: [{ figure_id: "F9", chart: "heatmap", title: "T", rows: [] }] });
    expect(figure).toMatchObject({ id: "F9", chart: "heatmap", svg: null });
  });

  it("returns nothing for a package without figures or with garbage", () => {
    expect(packageFigures({})).toEqual([]);
    expect(packageFigures(null)).toEqual([]);
    expect(packageFigures({ figures: ["x", 3] })).toEqual([]);
  });

  it("skips rows without a finite estimate and interval, and escapes names", () => {
    expect(
      intervalRows([
        { estimate: 1, ci_low: null, ci_high: 2 },
        { estimate: 1, ci_low: 0, ci_high: 2 },
      ]),
    ).toHaveLength(1);
    const [figure] = packageFigures({
      figures: [{ chart: "interval", rows: [{ comparison_id: "<b>x</b>", estimate: 1, ci_low: 0, ci_high: 2 }] }],
    });
    expect(figure.svg).not.toContain("<b>");
    expect(figure.svg).toContain("&lt;b&gt;");
  });
});
