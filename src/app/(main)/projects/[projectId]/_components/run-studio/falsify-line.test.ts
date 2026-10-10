import { describe, expect, it } from "vitest";

import { falsifyAxis, wrongSpans } from "./falsify-line";

describe("wrongSpans", () => {
  it("is the zone itself for a signed prediction", () => {
    expect(wrongSpans({ text: "", unit: "", zone: [null, 0] })).toEqual([[-4, 0]]);
  });

  it("is both sides of the band for a negligible effect", () => {
    expect(wrongSpans({ text: "", unit: "", zone: [null, null], within: [-1, 1] })).toEqual([
      [-4, -1],
      [1, 9],
    ]);
  });

  it("draws a negligible effect on an axis three times its band", () => {
    const falsify = {
      text: "",
      unit: "SD",
      zone: [null, null] as [null, null],
      within: [-0.1, 0.1] as [number, number],
    };
    const { axis, ticks } = falsifyAxis(falsify);
    expect(axis[0]).toBeCloseTo(-0.3);
    expect(axis[1]).toBeCloseTo(0.3);
    expect(ticks).toHaveLength(5);
    expect(wrongSpans(falsify, axis)).toEqual([
      [axis[0], -0.1],
      [0.1, axis[1]],
    ]);
  });
});
