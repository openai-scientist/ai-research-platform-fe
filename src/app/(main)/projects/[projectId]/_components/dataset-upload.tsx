"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { Check, FileSpreadsheet, FileUp, Plug, RotateCw, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAllDataConnections } from "@/hooks/use-data-connections";
import { useDatasetFileTypes } from "@/hooks/use-dataset-file-types";
import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import { type DatasetUploadOutcome, fetchDatasets } from "@/lib/api/services/fetch-datasets";
import { datasetFileAccept, datasetFileRejection } from "@/lib/dataset-file";

import { ConnectionLogo } from "./data-connections/connection-display";
import { formatSize } from "./dataset-format";

type QueuedUpload = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "failed";
  datasetId?: string;
  datasetName?: string;
};

/** The dataset name a file gets: its name without the extension, kept within the 2 to 160 characters allowed. */
export function datasetNameFor(fileName: string) {
  const base = fileName.replace(/\.(csv|xlsx)$/i, "").trim();
  return (base.length >= 2 ? base : `Dataset ${base}`.trim()).slice(0, 160);
}

/** Drop or pick CSV files: each becomes a dataset named after its file, uploaded one at a time. */
export function DatasetUpload({
  projectId,
  compact,
  onImport,
}: {
  projectId: string;
  compact: boolean;
  /** Opens the choice of a saved data connection to import from. */
  onImport: () => void;
}) {
  const queryClient = useQueryClient();
  const fileTypes = useDatasetFileTypes(projectId);
  const accept = datasetFileAccept(fileTypes.types);
  const connections = useAllDataConnections(projectId).data ?? [];
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<QueuedUpload[]>([]);
  const running = useRef(false);
  const section = useRef<HTMLElement>(null);
  // Links to #upload-dataset (from the project overview) bring this into view and flash it.
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    if (window.location.hash !== "#upload-dataset") return;
    section.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlight(true);
    const timer = setTimeout(() => setHighlight(false), 1600);
    return () => clearTimeout(timer);
  }, []);
  const finished = useRef<Record<DatasetUploadOutcome, number>>({
    created_dataset: 0,
    created_version: 0,
    created_copy: 0,
  });

  const patch = useCallback(
    (id: string, change: Partial<QueuedUpload>) =>
      setUploads((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item))),
    [],
  );

  // Upload once per queue entry; the server applies the version/copy policy atomically.
  useEffect(() => {
    if (running.current) return;
    const next = uploads.find((item) => item.status === "queued");
    if (!next) {
      if (!uploads.some((item) => item.status === "uploading")) {
        const counts = finished.current;
        if (counts.created_dataset)
          toast.success(`${counts.created_dataset} dataset${counts.created_dataset === 1 ? "" : "s"} uploaded.`);
        if (counts.created_version)
          toast.success(`${counts.created_version} new version${counts.created_version === 1 ? "" : "s"} added.`);
        if (counts.created_copy)
          toast.success(`${counts.created_copy} separate dataset${counts.created_copy === 1 ? "" : "s"} created.`);
        finished.current = { created_dataset: 0, created_version: 0, created_copy: 0 };
      }
      return;
    }
    running.current = true;
    patch(next.id, { status: "uploading", progress: 0 });
    void (async () => {
      const base = datasetNameFor(next.file.name);
      try {
        const { data: dataset, meta } = await fetchDatasets.create(
          projectId,
          { name: base, file: next.file },
          (progress) => patch(next.id, { progress }),
        );
        patch(next.id, { status: "done", progress: 100, datasetId: dataset.id, datasetName: dataset.name });
        finished.current[meta.upload.outcome] += 1;
        await Promise.all(
          [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all].map((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          ),
        );
        // Finished rows make room once the table shows the new dataset.
        setTimeout(() => setUploads((list) => list.filter((item) => item.id !== next.id)), 2500);
      } catch (error) {
        patch(next.id, { status: "failed" });
        toast.error(error instanceof Error ? error.message : "Unable to upload the dataset. Please try again.", {
          description: next.file.name,
        });
      } finally {
        running.current = false;
        setUploads((list) => [...list]);
      }
    })();
  }, [uploads, projectId, queryClient, patch]);

  function add(files: FileList | null) {
    if (!fileTypes.ready || !files?.length) return;
    const accepted: QueuedUpload[] = [];
    for (const file of Array.from(files)) {
      const reason = datasetFileRejection(file, fileTypes.types);
      if (reason) toast.error(reason, { description: file.name });
      else accepted.push({ id: crypto.randomUUID(), file, progress: 0, status: "queued" });
    }
    if (accepted.length) setUploads((list) => [...list, ...accepted]);
  }

  const shownConnections = connections.filter((connection) => connection.kind !== "google").slice(0, 3);

  return (
    <section
      ref={section}
      id="upload-dataset"
      aria-label="Upload datasets"
      className={cn(
        "scroll-mt-6 overflow-hidden rounded-xl border bg-card transition-shadow duration-500",
        highlight && "ring-3 ring-sky-500/40",
      )}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        disabled={!fileTypes.ready || !fileTypes.types.length}
        multiple
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          add(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="p-3">
        <button
          type="button"
          disabled={!fileTypes.ready || !fileTypes.types.length}
          onClick={() => input.current?.click()}
          onDragEnter={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            add(event.dataTransfer.files);
          }}
          className={cn(
            "flex w-full cursor-pointer items-center rounded-lg border-2 border-dashed text-center outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            compact ? "flex-row justify-center gap-3 px-4 py-4" : "flex-col justify-center gap-3 px-6 py-12",
            dragging ? "border-sky-500 bg-sky-500/5" : "border-border hover:border-foreground/25 hover:bg-muted/40",
          )}
        >
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-full transition-colors",
              compact ? "size-9" : "size-12",
              dragging ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-muted text-muted-foreground",
            )}
          >
            <FileUp className={compact ? "size-4" : "size-5"} aria-hidden="true" />
          </span>
          <span className={cn("flex flex-col gap-0.5", compact && "items-start text-left")}>
            <span className="font-medium text-sm">
              {dragging ? (
                "Drop to upload"
              ) : (
                <>
                  <span className="sm:hidden">Tap to choose dataset files</span>
                  <span className="hidden sm:inline">Drag dataset files here, or click to browse</span>
                </>
              )}
            </span>
            <span className="text-muted-foreground text-xs">
              {fileTypes.types.join(" or ")} · up to 50 MiB · existing names follow the project's version/copy policy
            </span>
          </span>
        </button>
      </div>
      {uploads.length > 0 && (
        <ul className="flex flex-col divide-y border-t" aria-label="Uploads">
          {uploads.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <FileSpreadsheet className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="truncate" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    {item.status === "queued" && `Waiting · ${formatSize(item.file.size)}`}
                    {item.status === "uploading" &&
                      (item.progress < 100
                        ? `${item.progress}% of ${formatSize(item.file.size)}`
                        : "Checking the file…")}
                    {item.status === "failed" && <span className="text-destructive">Upload failed</span>}
                    {item.status === "done" && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <Check className="size-3.5" aria-hidden="true" />
                        Added as {item.datasetName}
                      </span>
                    )}
                  </span>
                </div>
                {item.status === "uploading" && (
                  <Progress value={item.progress} className="h-1" aria-label={`Uploading ${item.file.name}`} />
                )}
              </div>
              {item.status === "failed" && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Retry ${item.file.name}`}
                    onClick={() => patch(item.id, { status: "queued", progress: 0 })}
                  >
                    <RotateCw />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.file.name}`}
                    onClick={() => setUploads((list) => list.filter((upload) => upload.id !== item.id))}
                  >
                    <X />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
        <Button
          variant="outline"
          disabled={!fileTypes.ready || !fileTypes.types.length}
          onClick={() => input.current?.click()}
        >
          <Upload data-icon="inline-start" />
          Upload files
        </Button>
        <Button variant="outline" onClick={onImport}>
          {shownConnections.length > 0 ? (
            <span className="-ml-1 flex shrink-0 -space-x-1.5" aria-hidden="true">
              {shownConnections.map((connection) => (
                <span
                  key={connection.id}
                  className="grid size-5 place-items-center rounded-full bg-background ring-2 ring-background [&_img]:size-3.5 [&_svg]:size-3.5"
                >
                  <ConnectionLogo kind={connection.kind} />
                </span>
              ))}
            </span>
          ) : (
            <Plug data-icon="inline-start" />
          )}
          Import from a connection
        </Button>
      </div>
    </section>
  );
}
