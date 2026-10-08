"use client";

import { useEffect, useRef, useState } from "react";

import { showApiError } from "@/hooks/use-api";
import { fetchProjectFiles, type ProjectFileItem } from "@/lib/api/services/fetch-project-files";
import type { FileDownload } from "@/lib/api/types";
import { ApiError } from "@/types/api";

import { previewRows } from "./csv-preview";
import type { ExcelPreviewRequest, ExcelPreviewResponse, FilePreviewTable } from "./project-file-preview-types";

type FilePreview =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "too-large" }
  | { kind: "pdf"; url: string }
  | { kind: "table"; table: FilePreviewTable }
  | { kind: "excel"; sheets: string[]; index: number; table: FilePreviewTable };

const CSV_PREVIEW_BYTES = 1024 * 1024;
const EXCEL_PREVIEW_BYTES = 10 * 1024 * 1024;

function rateLimitRetryAt(error: unknown): number | null {
  return error instanceof ApiError && error.code === "RATE_LIMITED" && error.retryAfter !== null
    ? Date.now() + error.retryAfter * 1000
    : null;
}

export function useProjectFilePreview(projectId: string, file: ProjectFileItem) {
  const [preview, setPreview] = useState<FilePreview>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const attemptRef = useRef(attempt);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [sheetPending, setSheetPending] = useState(false);
  const [downloadFile, setDownloadFile] = useState<FileDownload | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    attemptRef.current = attempt;
    const controller = new AbortController();
    const isCancelled = () => controller.signal.aborted || attemptRef.current !== attempt;
    let objectUrl: string | undefined;
    let worker: Worker | undefined;
    let timeout: number | undefined;
    setPreview({ kind: "loading" });
    setDownloadFile(null);
    setRetryAt(null);
    setSheetPending(false);

    const fail = (error: unknown) => {
      if (isCancelled()) return;
      worker?.terminate();
      if (timeout !== undefined) window.clearTimeout(timeout);
      setSheetPending(false);
      setPreview({ kind: "failed" });
      setRetryAt(rateLimitRetryAt(error));
      showApiError(error);
    };

    const load = async () => {
      if (file.kind === "excel" && file.size_bytes > EXCEL_PREVIEW_BYTES) {
        setPreview({ kind: "too-large" });
        return;
      }
      const result = await fetchProjectFiles.download(projectId, file.id, controller.signal);
      if (isCancelled()) return;
      setDownloadFile(result);
      if (file.kind === "pdf") {
        objectUrl = URL.createObjectURL(new Blob([result.blob], { type: "application/pdf" }));
        setPreview({ kind: "pdf", url: objectUrl });
      } else if (file.kind === "csv") {
        const text = await result.blob.slice(0, CSV_PREVIEW_BYTES).text();
        if (isCancelled()) return;
        const rows = text.trim() ? previewRows(text, ",", result.blob.size <= CSV_PREVIEW_BYTES) : [];
        const columns = Math.max(0, ...rows.map((row) => row.length));
        setPreview({
          kind: "table",
          table: {
            headers: Array.from({ length: columns }, (_, index) => rows[0]?.[index] || `Column ${index + 1}`),
            rows: rows.slice(1),
            firstRow: 1,
          },
        });
      } else {
        if (result.blob.size > EXCEL_PREVIEW_BYTES) {
          setPreview({ kind: "too-large" });
          return;
        }
        const buffer = await result.blob.arrayBuffer();
        if (isCancelled()) return;
        worker = new Worker(new URL("./project-file-excel.worker.ts", import.meta.url), { type: "module" });
        workerRef.current = worker;
        worker.onmessage = (event: MessageEvent<ExcelPreviewResponse>) => {
          if (isCancelled()) return;
          if (timeout !== undefined) window.clearTimeout(timeout);
          const response = event.data;
          if (response.type === "error") {
            fail(new Error("This Excel file could not be previewed. Download the original to view it."));
            return;
          }
          if (response.type === "ready") {
            setPreview({ kind: "excel", sheets: response.sheets, index: response.index, table: response.table });
          } else {
            setPreview((current) =>
              current.kind === "excel" ? { ...current, index: response.index, table: response.table } : current,
            );
          }
          setSheetPending(false);
        };
        worker.onerror = (event) => {
          event.preventDefault();
          fail(new Error("This Excel file could not be previewed. Download the original to view it."));
        };
        timeout = window.setTimeout(() => {
          fail(new Error("The Excel preview took too long. Download the original to view it."));
        }, 30_000);
        worker.postMessage({ type: "load", buffer } satisfies ExcelPreviewRequest, [buffer]);
      }
    };

    void load().catch(fail);
    return () => {
      controller.abort();
      worker?.terminate();
      workerRef.current = null;
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [projectId, file.id, file.kind, file.size_bytes, attempt]);

  useEffect(() => {
    if (retryAt === null) return;
    const timer = window.setTimeout(() => setRetryAt(null), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  return {
    preview,
    downloadFile,
    sheetPending,
    retryDisabled: retryAt !== null,
    holdRateLimitedRetry: (error: unknown) => setRetryAt(rateLimitRetryAt(error)),
    retry: () => {
      if (retryAt === null) setAttempt((current) => current + 1);
    },
    selectSheet: (index: number) => {
      if (sheetPending || preview.kind !== "excel" || preview.index === index || !workerRef.current) return;
      setSheetPending(true);
      workerRef.current.postMessage({ type: "sheet", index } satisfies ExcelPreviewRequest);
    },
  };
}
