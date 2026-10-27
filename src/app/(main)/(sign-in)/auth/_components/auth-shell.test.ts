import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AuthShell from "./auth-shell";

describe("AuthShell headings", () => {
  it("leaves the page's only h1 to the step, before the side panel's h2s", () => {
    const html = renderToStaticMarkup(createElement(AuthShell, null, createElement("h1", null, "Sign in")));
    const headings = [...html.matchAll(/<(h[1-6])\b/g)].map((match) => match[1]);
    expect(headings.filter((tag) => tag === "h1")).toHaveLength(1);
    expect(headings[0]).toBe("h1");
  });
});
