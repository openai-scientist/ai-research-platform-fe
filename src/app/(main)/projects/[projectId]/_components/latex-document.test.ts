import type { Root } from "hast";
import { visit } from "unist-util-visit";
import { describe, expect, it } from "vitest";

import { latexDocument } from "./latex-document";

function documentText(tree: Root) {
  const parts: string[] = [];
  visit(tree, "text", (node) => {
    parts.push(node.value);
  });
  return parts.join("");
}

describe("LaTeX document preview", () => {
  it("renders article metadata, section headings, tables and mathematical notation", () => {
    const tree = latexDocument(
      String.raw`\documentclass{article}
\title{Credential rotation study}
\author{Research team}
\date{\today}
\begin{document}
\maketitle
\begin{abstract}We evaluate credential age and incident rates.\end{abstract}
\section{Findings}
Model fit is $R^2 = 0.8842$.
\begin{table}
\caption{Measured outcomes}
\begin{tabular}{lr}
Metric & Value \\
MAE & 0.0298 \\
\end{tabular}
\end{table}
\end{document}`,
      "2026-10-04T12:00:00Z",
    );
    const tags: string[] = [];
    visit(tree, "element", (node) => {
      tags.push(node.tagName);
    });

    expect(tags).toEqual(expect.arrayContaining(["h1", "h2", "table", "math"]));
    expect(documentText(tree)).toContain("Credential rotation study");
    expect(documentText(tree)).toContain("Research team");
    expect(documentText(tree)).toContain("October 4, 2026");
    expect(documentText(tree)).toContain("0.0298");
  });

  it("renders different documents repeatedly without freezing or leaking previous metadata", () => {
    const source = (title: string) => String.raw`\title{${title}}\begin{document}\maketitle\end{document}`;
    const first = latexDocument(source("First study"), "2026-10-04T12:00:00Z");
    const second = latexDocument(source("Second study"), "2026-10-04T12:00:00Z");
    const repeated = latexDocument(source("Second study"), "2026-10-04T12:00:00Z");

    expect(documentText(first)).toContain("First study");
    expect(documentText(second)).toContain("Second study");
    expect(documentText(second)).not.toContain("First study");
    expect(repeated).toEqual(second);
  });
});
