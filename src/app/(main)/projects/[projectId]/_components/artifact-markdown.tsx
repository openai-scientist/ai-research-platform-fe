"use client";

import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import "katex/dist/katex.min.css";

import { ArtifactDocument, documentComponents } from "./artifact-document";

export default function ArtifactMarkdown({ source, truncated }: { source: string; truncated: boolean }) {
  return (
    <ArtifactDocument source={source} truncated={truncated}>
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { trust: false, strict: "ignore", maxExpand: 1000 }]]}
        components={documentComponents}
      >
        {source}
      </Markdown>
    </ArtifactDocument>
  );
}
