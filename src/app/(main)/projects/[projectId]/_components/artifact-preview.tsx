"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";

import { cn } from "cn";
import { Maximize2, Minimize2 } from "lucide-react";

import { DialogScrollArea } from "@/components/dialog-scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showApiError } from "@/hooks/use-api";
import { fetchArtifacts, type RunArtifactItem } from "@/lib/api/services/fetch-artifacts";

import { ContextDisclosure } from "./context-disclosure";
import { previewRows } from "./csv-preview";
import { PdfPreview } from "./pdf-preview";
import { StructuredData } from "./structured-data";

const ArtifactMarkdown = dynamic(() => import("./artifact-markdown"), {
  loading: () => <Skeleton className="h-64" />,
});
const ArtifactLatex = dynamic(() => import("./artifact-latex"), {
  loading: () => <Skeleton className="h-64" />,
});

type Preview =
  | { kind: "image" | "pdf"; url: string }
  | { kind: "text"; text: string }
  | { kind: "markdown" | "latex"; text: string; truncated: boolean }
  | { kind: "json"; value: unknown }
  | { kind: "unreadable-json"; text: string }
  | { kind: "table"; rows: string[][] }
  | { kind: "unsupported" };

type ArtifactPreviewProps = {
  projectId: string;
  artifact: RunArtifactItem;
  onClose: () => void;
};

function previewDescription(kind?: Preview["kind"]): string {
  switch (kind) {
    case "json":
      return "Explore the file's information by section. Expand technical details to see the source data.";
    case "latex":
      return "LaTeX document preview. Package-specific layouts may differ from the compiled PDF.";
    case "markdown":
      return "Formatted Markdown preview, including tables and mathematical expressions.";
    default:
      return "File preview. Tables show up to 100 rows and 50 columns; text previews show the first 200 KB.";
  }
}

export function ArtifactPreview(props: ArtifactPreviewProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ArtifactPreviewAttempt
      key={`${props.projectId}:${props.artifact.id}:${attempt}`}
      {...props}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

function ArtifactPreviewAttempt({
  projectId,
  artifact,
  onClose,
  onRetry,
}: ArtifactPreviewProps & { onRetry: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setPreview(null);
    setFailed(false);
    const load = async () => {
      if (artifact.size_bytes > 10 * 1024 * 1024) {
        setPreview({ kind: "unsupported" });
        return;
      }
      const file = await fetchArtifacts.download(projectId, artifact.run_id, artifact.id, controller.signal);
      if (controller.signal.aborted) return;
      if (file.blob.size > 10 * 1024 * 1024) {
        setPreview({ kind: "unsupported" });
        return;
      }
      const type = (file.contentType || artifact.content_type).split(";")[0].trim().toLowerCase();
      const declaredType = artifact.content_type.split(";")[0].trim().toLowerCase();
      const markdown =
        /\.(md|markdown)$/i.test(artifact.filename) ||
        [type, declaredType].some((value) => ["text/markdown", "text/x-markdown"].includes(value));
      const latex =
        /\.(tex|latex)$/i.test(artifact.filename) ||
        [type, declaredType].some((value) =>
          ["application/x-latex", "application/x-tex", "text/x-tex", "text/x-latex"].includes(value),
        );
      if (["image/png", "image/svg+xml", "image/jpeg", "image/webp", "application/pdf"].includes(type)) {
        objectUrl = URL.createObjectURL(new Blob([file.blob], { type }));
        setPreview({ kind: type === "application/pdf" ? "pdf" : "image", url: objectUrl });
      } else if (
        type.startsWith("text/") ||
        type === "application/json" ||
        markdown ||
        latex ||
        /\.(csv|tsv|json|txt|tex)$/i.test(artifact.filename)
      ) {
        const text = await file.blob.slice(0, 200_000).text();
        if (controller.signal.aborted) return;
        if (markdown || latex) {
          setPreview({ kind: markdown ? "markdown" : "latex", text, truncated: file.blob.size > 200_000 });
        } else if (
          /\.(csv|tsv)$/i.test(artifact.filename) ||
          ["text/csv", "text/tab-separated-values"].includes(type)
        ) {
          setPreview({
            kind: "table",
            rows: previewRows(
              text,
              type === "text/tab-separated-values" || /\.tsv$/i.test(artifact.filename) ? "\t" : ",",
            ),
          });
        } else if (type === "application/json" || /\.json$/i.test(artifact.filename)) {
          try {
            setPreview({ kind: "json", value: JSON.parse(text.replace(/^\uFEFF/, "")) as unknown });
          } catch {
            setPreview({ kind: "unreadable-json", text });
          }
        } else setPreview({ kind: "text", text });
      } else setPreview({ kind: "unsupported" });
    };
    void load().catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setFailed(true);
        showApiError(error);
      }
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [projectId, artifact]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (fullScreen) {
            event.preventDefault();
            setFullScreen(false);
          }
        }}
        className={cn(
          "flex max-h-[90dvh] min-w-0 flex-col overflow-hidden sm:max-w-4xl",
          fullScreen &&
            "top-0 left-0 h-dvh max-h-dvh max-w-none translate-x-0 translate-y-0 rounded-none sm:max-w-none",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-10"
          aria-label={fullScreen ? "Exit full screen" : "Enter full screen"}
          title={fullScreen ? "Exit full screen" : "Enter full screen"}
          aria-pressed={fullScreen}
          onClick={() => setFullScreen((value) => !value)}
        >
          {fullScreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        </Button>
        <DialogHeader className="min-w-0 shrink-0 pr-16">
          <DialogTitle className="break-words">{artifact.filename}</DialogTitle>
          <DialogDescription>{previewDescription(preview?.kind)}</DialogDescription>
        </DialogHeader>
        <DialogScrollArea
          contentLabel="Artifact preview"
          horizontal={["table", "markdown", "latex"].includes(preview?.kind ?? "")}
          className={fullScreen ? "flex-1" : undefined}
        >
          {!preview && !failed && <Skeleton className="h-64" />}
          {failed && (
            <Button variant="outline" onClick={onRetry}>
              Retry preview
            </Button>
          )}
          {preview?.kind === "image" && (
            // biome-ignore lint/performance/noImgElement: Authenticated blob URLs are already local and need no image optimization.
            <img
              src={preview.url}
              alt={artifact.filename}
              className={cn(
                "mx-auto max-w-full object-contain",
                fullScreen ? "max-h-[calc(100dvh-12rem)]" : "max-h-[65dvh]",
              )}
            />
          )}
          {preview?.kind === "pdf" && (
            <PdfPreview
              filename={artifact.filename}
              url={preview.url}
              className={fullScreen ? "h-[calc(100dvh-12rem)]" : "h-[65dvh]"}
            />
          )}
          {preview?.kind === "text" && <pre className="whitespace-pre-wrap break-words text-xs">{preview.text}</pre>}
          {preview?.kind === "markdown" && <ArtifactMarkdown source={preview.text} truncated={preview.truncated} />}
          {preview?.kind === "latex" && (
            <ArtifactLatex source={preview.text} truncated={preview.truncated} createdAt={artifact.created_at} />
          )}
          {preview?.kind === "json" && <StructuredData value={preview.value} />}
          {preview?.kind === "unreadable-json" && (
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">
                Structured preview is unavailable for this file. Download the original to view all contents.
              </p>
              <ContextDisclosure title="Technical details">
                <pre className="whitespace-pre-wrap break-words text-xs">{preview.text}</pre>
              </ContextDisclosure>
            </div>
          )}
          {preview?.kind === "table" && (
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.rows[0]?.map((cell, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: CSV coordinates are stable in this immutable, unsorted preview.
                    <TableHead key={`column-${index}`}>{cell}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.slice(1).map((row, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: CSV coordinates are stable in this immutable, unsorted preview.
                  <TableRow key={`row-${index}`}>
                    {row.map((cell, column) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: Duplicate CSV values are valid; the fixed column position identifies the cell.
                      <TableCell key={`cell-${column}`}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {preview?.kind === "unsupported" && (
            <p className="text-muted-foreground text-sm">
              Preview is available for images, PDFs and text files up to 10 MB. Download this file to view it.
            </p>
          )}
        </DialogScrollArea>
        <Button asChild variant="outline" className="shrink-0 self-start">
          <a href={fetchArtifacts.getDownloadUrl(projectId, artifact.run_id, artifact.id)}>Download original</a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
