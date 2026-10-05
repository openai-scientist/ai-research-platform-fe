"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

import { type Components, toJsxRuntime } from "hast-util-to-jsx-runtime";
import { toast } from "sonner";

import "katex/dist/katex.min.css";

import { ArtifactDocument, documentComponents } from "./artifact-document";
import { latexDocument } from "./latex-document";

export default function ArtifactLatex({
  source,
  truncated,
  createdAt,
}: {
  source: string;
  truncated: boolean;
  createdAt: string;
}) {
  const result = useMemo(() => {
    // An incomplete TeX document cannot be parsed reliably. Keep its source available instead.
    if (truncated) return { content: null, failed: false };
    try {
      const tree = latexDocument(source, createdAt);
      const content = toJsxRuntime(tree, {
        Fragment,
        jsx,
        jsxs,
        passNode: true,
        // React 19 scopes JSX types to React; this library's runtime types use the global JSX namespace.
        components: documentComponents as Components,
      }) as ReactNode;
      return { content, failed: false };
    } catch {
      return { content: null, failed: true };
    }
  }, [source, truncated, createdAt]);

  useEffect(() => {
    if (result.failed) {
      toast.error("This LaTeX document could not be rendered. View its source or download the original.", {
        id: "artifact-latex-preview",
      });
    }
  }, [result.failed]);

  return (
    <ArtifactDocument source={source} truncated={truncated}>
      {result.content}
    </ArtifactDocument>
  );
}
