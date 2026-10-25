import { describe, expect, it } from "vitest";

import { agentMarkdown, isKnownRoute, KNOWN_ROUTE_SEGMENTS, notFoundMarkdown, prefersMarkdown } from "./agent-markdown";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The first URL segments src/app can serve: route groups are transparent; private folders and slots are not routes.
function routeSegments(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("@"))
    .flatMap((entry) => (entry.name.startsWith("(") ? routeSegments(`${dir}/${entry.name}`) : [entry.name]));
}

describe("prefersMarkdown", () => {
  it.each([
    ["text/markdown", true],
    ["text/markdown, text/html;q=0.9", true],
    ["text/html;q=0.5, text/x-markdown", true],
    ["text/markdown;q=0", false],
    ["text/html, text/markdown;q=0.5", false],
    ["text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", false],
    ["*/*", false],
    [null, false],
  ])("%s → %s", (accept, expected) => {
    expect(prefersMarkdown(accept)).toBe(expected);
  });
});

describe("known routes", () => {
  it("lists every first segment the app can serve", () => {
    const segments = routeSegments(fileURLToPath(new URL("../../app", import.meta.url)));
    expect(segments.length).toBeGreaterThan(0);
    for (const segment of segments) {
      expect(segment.startsWith("["), `dynamic top-level segment ${segment} makes every path known`).toBe(false);
      expect(KNOWN_ROUTE_SEGMENTS.has(segment), `${segment} is missing from KNOWN_ROUTE_SEGMENTS`).toBe(true);
    }
  });

  it("treats the home page and app routes as known, and anything else as missing", () => {
    expect(isKnownRoute("/")).toBe(true);
    expect(isKnownRoute("/projects/abc")).toBe(true);
    expect(isKnownRoute("/privacy")).toBe(true);
    expect(isKnownRoute("/__ora-404-probe-lw0y85pt")).toBe(false);
  });
});

describe("agent Markdown", () => {
  it("follows the llms.txt layout: one H1, a summary quote, then H2 link lists", () => {
    const text = agentMarkdown();
    const lines = text.split("\n");
    expect(lines[0]).toMatch(/^# \S/);
    expect(lines.filter((line) => line.startsWith("# "))).toHaveLength(1);
    expect(text.split("\n\n")[1]).toMatch(/^> \S/);
    const firstH2 = text.indexOf("\n## ");
    expect(text.slice(0, firstH2)).not.toMatch(/\n#{2,6} /);
    for (const section of text.slice(firstH2).split(/\n## /).slice(1)) {
      const items = section.split("\n").slice(1).filter(Boolean);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) expect(item).toMatch(/^- \[[^\]]+\]\([^)]+\)(: .+)?$/);
    }
  });

  it("tells agents when to use the product and how to send someone to it", () => {
    const text = agentMarkdown();
    expect(text).toContain("When to use");
    expect(text).toContain("When not to use");
    expect(text).toContain("/auth/login");
  });

  it("explains a missing page and links somewhere useful", () => {
    const text = notFoundMarkdown("/nowhere");
    expect(text.startsWith("# Page not found")).toBe(true);
    expect(text).toContain("`/nowhere`");
    expect(text).toContain("/llms.txt");
  });
});
