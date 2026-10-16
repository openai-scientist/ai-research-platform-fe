"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { ArrowRight, Check, FileSpreadsheet, FileUp, RotateCw, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAllDataConnections } from "@/hooks/use-data-connections";
import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import { fetchDatasets } from "@/lib/api/services/fetch-datasets";
import { ApiError } from "@/types/api";

import { ConnectionLogo } from "./data-connections/connection-display";
import { formatSize } from "./dataset-format";

const MAX_BYTES = 50 * 1024 * 1024;

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
  const base = fileName.replace(/\.csv$/i, "").trim();
  return (base.length >= 2 ? base : `Dataset ${base}`.trim()).slice(0, 160);
}

function rejectReason(file: File) {
  if (!file.name.toLowerCase().endsWith(".csv")) return `${file.name} is not a CSV file.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_BYTES) return `${file.name} is larger than 50 MiB.`;
  return null;
}

/** Drop or pick CSV files: each becomes a dataset named after its file, uploaded one at a time. */
export function DatasetUpload({ projectId, compact }: { projectId: string; compact: boolean }) {
  const queryClient = useQueryClient();
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
  const finished = useRef(0);
  const lastUploaded = useRef("");

  const patch = useCallback(
    (id: string, change: Partial<QueuedUpload>) =>
      setUploads((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item))),
    [],
  );

  // Upload the queue one file at a time; a name already taken gets " (2)", " (3)" and so on.
  useEffect(() => {
    if (running.current) return;
    const next = uploads.find((item) => item.status === "queued");
    if (!next) {
      if (finished.current && !uploads.some((item) => item.status === "uploading")) {
        toast.success(
          finished.current === 1
            ? `Dataset "${lastUploaded.current}" uploaded.`
            : `${finished.current} datasets uploaded.`,
        );
        finished.current = 0;
      }
      return;
    }
    running.current = true;
    patch(next.id, { status: "uploading", progress: 0 });
    void (async () => {
      const base = datasetNameFor(next.file.name);
      try {
        for (let attempt = 1; ; attempt++) {
          const suffix = attempt === 1 ? "" : ` (${attempt})`;
          const name = `${base.slice(0, 160 - suffix.length)}${suffix}`;
          try {
            const { data: dataset } = await fetchDatasets.create(projectId, { name, file: next.file }, (progress) =>
              patch(next.id, { progress }),
            );
            patch(next.id, { status: "done", progress: 100, datasetId: dataset.id, datasetName: dataset.name });
            finished.current += 1;
            lastUploaded.current = dataset.name;
            break;
          } catch (error) {
            if (!(error instanceof ApiError && error.code === "DATASET_NAME_EXISTS") || attempt >= 20) throw error;
          }
        }
        await Promise.all(
          [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all].map((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          ),
        );
        // Finished rows make room once the table shows the new dataset.
        setTimeout(() => setUploads((list) => list.filter((item) => item.id !== next.id)), 2500);
      } catch (error) {
        patch(next.id, { status: "failed" });
        toast.error(`Couldn't upload ${next.file.name}`, {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        running.current = false;
        setUploads((list) => [...list]);
      }
    })();
  }, [uploads, projectId, queryClient, patch]);

  function add(files: FileList | null) {
    if (!files?.length) return;
    const accepted: QueuedUpload[] = [];
    for (const file of Array.from(files)) {
      const reason = rejectReason(file);
      if (reason) toast.error(reason, { description: "Upload a UTF-8 CSV with a header row, up to 50 MiB." });
      else accepted.push({ id: crypto.randomUUID(), file, progress: 0, status: "queued" });
    }
    if (accepted.length) setUploads((list) => [...list, ...accepted]);
  }

  const shownConnections = connections.slice(0, 3);
  const moreConnections = connections.length - shownConnections.length;

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
        accept=".csv,text/csv"
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
                  <span className="sm:hidden">Tap to choose CSV files</span>
                  <span className="hidden sm:inline">Drag CSV files here, or click to browse</span>
                </>
              )}
            </span>
            <span className="text-muted-foreground text-xs">
              Each file becomes a dataset named after it · CSV with a header row · up to 50 MiB
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-muted/30 px-4 py-3">
        <Button variant="outline" onClick={() => input.current?.click()}>
          <Upload data-icon="inline-start" />
          Upload CSV
        </Button>
        <Link
          href={`/projects/${projectId}/connections`}
          className="group inline-flex min-w-0 items-center gap-2.5 text-muted-foreground text-sm outline-none hover:text-foreground focus-visible:underline"
        >
          {shownConnections.length > 0 ? (
            <>
              <span className="flex shrink-0 -space-x-1.5">
                {shownConnections.map((connection) => (
                  <span
                    key={connection.id}
                    className="grid size-6 place-items-center rounded-full bg-background ring-2 ring-muted [&_img]:size-3.5 [&_svg]:size-3.5"
                  >
                    <ConnectionLogo kind={connection.kind} />
                  </span>
                ))}
              </span>
              <span className="min-w-0 truncate">
                Import from{" "}
                <b className="font-medium text-foreground">
                  {shownConnections.map((connection) => connection.name).join(", ")}
                </b>
                {moreConnections > 0 && ` +${moreConnections}`}
              </span>
            </>
          ) : (
            <span>
              Data in a database or another service?{" "}
              <b className="font-medium text-foreground">Import from a data connection</b>
            </span>
          )}
          <ArrowRight
            className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </section>
  );
}
