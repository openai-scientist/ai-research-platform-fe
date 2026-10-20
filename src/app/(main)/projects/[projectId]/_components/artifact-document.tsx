"use client";

import type { ReactNode } from "react";

import type { Components } from "react-markdown";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import styles from "./artifact-document.module.css";
import { ContextDisclosure } from "./context-disclosure";

export const documentComponents = {
  table: ({ node: _node, ...props }) => <Table {...props} />,
  thead: ({ node: _node, ...props }) => <TableHeader {...props} />,
  tbody: ({ node: _node, ...props }) => <TableBody {...props} />,
  tr: ({ node: _node, ...props }) => <TableRow {...props} />,
  th: ({ node: _node, ...props }) => <TableHead {...props} className="min-w-24 whitespace-normal" />,
  td: ({ node: _node, ...props }) => <TableCell {...props} className="min-w-24 whitespace-normal" />,
  a: ({ href, children }) =>
    href && /^(https?:|mailto:|#)/i.test(href) ? (
      <a href={href} target={href.startsWith("#") ? undefined : "_blank"} rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  img: ({ alt }) => <span className="text-muted-foreground">[Image: {alt || "See original file"}]</span>,
} satisfies Components;

export function ArtifactDocument({
  source,
  truncated,
  children,
}: {
  source: string;
  truncated: boolean;
  children: ReactNode;
}) {
  const sourceContent = (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{source}</pre>
  );
  return (
    <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-6">
      {truncated && (
        <p className="text-muted-foreground text-sm">
          This preview contains the first 200 KB. Download the original to read the complete document.
        </p>
      )}
      {children ? (
        <>
          <article className={styles.document}>{children}</article>
          <ContextDisclosure title="View source">{sourceContent}</ContextDisclosure>
        </>
      ) : (
        sourceContent
      )}
    </div>
  );
}
