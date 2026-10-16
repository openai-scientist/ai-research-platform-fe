"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { useUploadProjectFileMutation } from "@/hooks/use-project-files-query";
import { ApiError } from "@/types/api";

export const PROJECT_FILE_ACCEPT = ".pdf,.csv,.xlsx,.xls";

export function useProjectFileUpload(projectId: string, canUpload: boolean) {
  const { mutateAsync } = useUploadProjectFileMutation(projectId);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const locked = useRef(false);
  const dragDepth = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (retryTimer.current !== null) clearTimeout(retryTimer.current);
    },
    [],
  );

  const uploadFiles = useCallback(
    async (files: readonly File[]) => {
      if (!files.length) return;
      if (!canUpload) {
        toast.error("You do not have permission to upload documents to this project.");
        return;
      }
      if (locked.current || rateLimited) {
        toast.error(
          rateLimited ? "Please wait before uploading more documents." : "Wait for the current uploads to finish.",
        );
        return;
      }

      const valid: File[] = [];
      for (const file of files) {
        const error = !/\.(pdf|csv|xlsx|xls)$/i.test(file.name)
          ? "Only PDF, CSV, and Excel (.xlsx, .xls) files are supported."
          : file.size === 0
            ? "The file is empty."
            : file.size > 50 * 1024 * 1024
              ? "The file must be no larger than 50 MiB."
              : null;
        if (error) toast.error(error, { description: file.name });
        else valid.push(file);
      }
      if (!valid.length) return;

      locked.current = true;
      setUploading(true);
      let uploaded = 0;
      let lastName = "";
      try {
        for (const file of valid) {
          try {
            await mutateAsync(file);
            uploaded++;
            lastName = file.name;
          } catch (error) {
            // The mutation displays the backend message. Never retry a potentially completed upload.
            if (error instanceof ApiError && error.code === "RATE_LIMITED") {
              if (error.retryAfter !== null) {
                setRateLimited(true);
                retryTimer.current = setTimeout(() => setRateLimited(false), error.retryAfter * 1000);
              }
              break;
            }
            if (error instanceof ApiError && ["UNAUTHORIZED", "FORBIDDEN", "PROJECT_ARCHIVED"].includes(error.code))
              break;
          }
        }
        if (uploaded)
          toast.success(uploaded === 1 ? `Document "${lastName}" uploaded.` : `${uploaded} documents uploaded.`);
      } finally {
        locked.current = false;
        setUploading(false);
      }
    },
    [canUpload, mutateAsync, rateLimited],
  );

  useEffect(() => {
    const isFileDrag = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
    const reset = () => {
      dragDepth.current = 0;
      setIsDragging(false);
    };
    const enter = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      dragDepth.current++;
      if (canUpload && !locked.current && !rateLimited) setIsDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      if (event.dataTransfer)
        event.dataTransfer.dropEffect = canUpload && !locked.current && !rateLimited ? "copy" : "none";
    };
    const leave = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setIsDragging(false);
    };
    const drop = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      reset();
      void uploadFiles(files);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") reset();
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    window.addEventListener("dragend", reset);
    window.addEventListener("blur", reset);
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      window.removeEventListener("dragend", reset);
      window.removeEventListener("blur", reset);
      window.removeEventListener("keydown", keydown);
      dragDepth.current = 0;
    };
  }, [canUpload, rateLimited, uploadFiles]);

  return {
    isDragging,
    uploadFiles,
    disabled: uploading || rateLimited || !canUpload,
  };
}
