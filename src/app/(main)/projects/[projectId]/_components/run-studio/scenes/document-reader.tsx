"use client";

import { type ReactNode, useEffect } from "react";

import { type QueryObserverResult, useQuery } from "@tanstack/react-query";
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
  downloadLabel = "Download",
  onDownload,
  onClose,
  children,
}: {
  /** What is open; `null` keeps the reader closed. */
  title: string | null;
  download: string;
  /** What the download button says it saves, such as "Download Experiment result package (JSON)". */
  downloadLabel?: string;
  /** Saves under a name of the page's choosing instead of the link's; the link is used when absent. */
  onDownload?(): void;
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
              {onDownload ? (
                <Button size="sm" variant="outline" className="mt-1 w-fit" onClick={onDownload}>
                  <Download data-icon="inline-start" />
                  {downloadLabel}
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="mt-1 w-fit">
                  <a href={download} download>
                    <Download data-icon="inline-start" />
                    {downloadLabel}
                  </a>
                </Button>
              )}
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** How the reader reads a published file. The request is not tied to the query's signal: a cancel cannot strand it. */
export const documentQuery = (source: ArtifactSource, artifactId: string) => ({
  queryKey: ["design-document", source.runId, artifactId],
  queryFn: async () => (await fetchArtifacts.download(source.projectId, source.runId, artifactId)).blob.text(),
  staleTime: Number.POSITIVE_INFINITY,
  retry: false,
  // An offline guess must not pause the request: the reader says it cannot load instead of waiting.
  networkMode: "always" as const,
});

export type DocumentState = "loading" | "ready" | "unavailable";

/** Loading only while a request is running or about to start; an error or an empty file is never "loading". */
export function documentState(query: Pick<QueryObserverResult<string>, "status" | "data">): DocumentState {
  if (query.status === "error") return "unavailable";
  if (query.status === "pending") return "loading";
  return query.data ? "ready" : "unavailable";
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
  const query = useQuery(documentQuery(source, artifactId));
  // A fetch that was cancelled while the reader was closing leaves the query pending and idle: start it again, so the
  // reader never waits on a request that is no longer running.
  useEffect(() => {
    if (query.isPending && query.fetchStatus === "idle") void query.refetch();
  }, [query.isPending, query.fetchStatus, query.refetch]);
  const state = documentState(query);
  if (state === "loading") return <p className="text-muted-foreground text-sm">Loading the document…</p>;
  if (state === "unavailable" || !query.data) return unavailable;
  if (/^\s*[[{]/.test(query.data)) {
    try {
      return json ? json(JSON.parse(query.data)) : unavailable;
    } catch {
      return unavailable;
    }
  }
  return <DesignMarkdown source={query.data} />;
}
