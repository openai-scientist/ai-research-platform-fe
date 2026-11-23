"use client";

import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";

import { DesignMarkdown } from "./design-markdown";

export type ArtifactSource = { projectId: string; runId: string };

export const unavailable = (
  <p className="text-muted-foreground text-sm">This file cannot be previewed here. Download it to read it.</p>
);

/** Opens beside the gate. Closing it only closes the reader: the gate keeps its answer and its place. */
export function ReaderSheet({
  title,
  download,
  onClose,
  children,
}: {
  /** What is open; `null` keeps the reader closed. */
  title: string | null;
  download: string;
  onClose(): void;
  children: ReactNode;
}) {
  return (
    <Sheet open={title !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {title !== null && (
          <>
            <SheetHeader className="border-b pr-12">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>Close this to go back to your decision. Nothing is answered here.</SheetDescription>
              <Button asChild size="sm" variant="outline" className="mt-1 w-fit">
                <a href={download} download>
                  <Download data-icon="inline-start" />
                  Download
                </a>
              </Button>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * A published file, read in place: Markdown as a page and, with `json`, a structured file as the screen that reads it.
 * Without `json`, a structured file is not a document: no raw JSON on screen.
 */
export function FetchedDocument({
  source,
  artifactId,
  json,
}: {
  source: ArtifactSource;
  artifactId: string;
  json?: (value: unknown) => ReactNode;
}) {
  const query = useQuery({
    queryKey: ["design-document", source.runId, artifactId],
    queryFn: async ({ signal }) =>
      (await fetchArtifacts.download(source.projectId, source.runId, artifactId, signal)).blob.text(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  if (query.isPending) return <p className="text-muted-foreground text-sm">Loading the document…</p>;
  if (query.isError || !query.data) return unavailable;
  if (/^\s*[[{]/.test(query.data)) {
    try {
      return json ? json(JSON.parse(query.data)) : unavailable;
    } catch {
      return unavailable;
    }
  }
  return <DesignMarkdown source={query.data} />;
}
