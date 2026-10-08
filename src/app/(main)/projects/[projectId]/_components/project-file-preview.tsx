"use client";

import { useState } from "react";

import { cn } from "cn";
import { Download, FileSpreadsheet, Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDownloadProjectFileMutation } from "@/hooks/use-project-files-query";
import type { ProjectFileItem } from "@/lib/api/services/fetch-project-files";

import { PdfPreview } from "./pdf-preview";
import { saveProjectFile } from "./project-file-download";
import { ProjectFilePreviewTable } from "./project-file-preview-table";
import { useProjectFilePreview } from "./use-project-file-preview";

export default function ProjectFilePreview({
  projectId,
  file,
  onClose,
  restoreFocus,
}: {
  projectId: string;
  file: ProjectFileItem;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const [fullScreen, setFullScreen] = useState(false);
  const { preview, downloadFile, sheetPending, retryDisabled, retry, selectSheet, holdRateLimitedRetry } =
    useProjectFilePreview(projectId, file);
  const download = useDownloadProjectFileMutation(projectId);
  const table = preview.kind === "table" || preview.kind === "excel" ? preview.table : null;
  const previewDescription = { pdf: "PDF preview", csv: "CSV preview", excel: "Excel preview" }[file.kind];

  const renderPreview = () => {
    if (preview.kind === "loading" || sheetPending) {
      return (
        <div role="status" aria-label="Loading document preview" className="flex min-h-0 flex-1 flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="min-h-0 w-full flex-1" />
          <span className="sr-only">Loading document preview…</span>
        </div>
      );
    }
    if (preview.kind === "failed") {
      return (
        <div className="flex flex-1 items-center justify-center">
          <Button variant="outline" onClick={retry} disabled={retryDisabled}>
            Retry preview
          </Button>
        </div>
      );
    }
    if (preview.kind === "too-large") {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileSpreadsheet />
            </EmptyMedia>
            <EmptyTitle>Download to view this workbook</EmptyTitle>
            <EmptyDescription>
              Excel preview supports files up to 10 MiB. Download the original to view all sheets.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }
    if (preview.kind === "pdf") {
      return <PdfPreview url={preview.url} filename={file.filename} className="min-h-0 flex-1 rounded-lg border" />;
    }
    if (table) {
      return (
        <ProjectFilePreviewTable
          table={table}
          label={
            preview.kind === "excel" ? `${preview.sheets[preview.index] ?? "Worksheet"} preview` : "CSV preview table"
          }
        />
      );
    }
    return null;
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "flex h-[90dvh] min-w-0 flex-col overflow-hidden sm:max-w-6xl",
          fullScreen && "top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 rounded-none sm:max-w-none",
        )}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
        onEscapeKeyDown={(event) => {
          if (fullScreen) {
            event.preventDefault();
            setFullScreen(false);
          }
        }}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-10"
          aria-label={fullScreen ? "Exit full screen" : "Enter full screen"}
          title={fullScreen ? "Exit full screen" : "Enter full screen"}
          aria-pressed={fullScreen}
          onClick={() => setFullScreen((current) => !current)}
        >
          {fullScreen ? <Minimize2 /> : <Maximize2 />}
        </Button>
        <DialogHeader className="min-w-0 shrink-0 pr-16">
          <DialogTitle className="truncate" title={file.filename}>
            {file.filename}
          </DialogTitle>
          <DialogDescription>{previewDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          {preview.kind === "excel" && preview.sheets.length > 0 ? (
            <Select
              value={String(preview.index)}
              onValueChange={(value) => selectSheet(Number(value))}
              disabled={sheetPending}
            >
              <SelectTrigger className="w-full sm:w-64" aria-label="Choose worksheet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {preview.sheets.map((sheet, index) => (
                    <SelectItem key={sheet} value={String(index)}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}
          <Button
            variant="outline"
            className="ml-auto"
            disabled={download.isPending || preview.kind === "loading" || (!downloadFile && retryDisabled)}
            aria-busy={download.isPending}
            onClick={async () => {
              if (downloadFile) {
                saveProjectFile(downloadFile, file.filename);
                return;
              }
              try {
                saveProjectFile(await download.mutateAsync(file.id), file.filename);
              } catch (error) {
                // The mutation already displays the API error toast.
                holdRateLimitedRetry(error);
              }
            }}
          >
            <Download data-icon="inline-start" />
            {download.isPending ? "Downloading…" : "Download"}
          </Button>
        </div>
        {renderPreview()}
        {table && (
          <p className="shrink-0 text-muted-foreground text-xs">
            Preview shows up to 100 rows and 50 columns{file.kind === "csv" ? " from the first 1 MiB" : " per sheet"}.{" "}
            Download the original for the complete file.
          </p>
        )}
        {preview.kind === "pdf" && (
          <p className="shrink-0 text-muted-foreground text-xs">
            If your browser cannot display the PDF, download the original to view it.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
