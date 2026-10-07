"use client";

import { useRef, useState } from "react";

import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { validateCsv } from "./workspace-ui";

export function CsvFileInput({
  id,
  file,
  onChange,
  disabled = false,
}: {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  function selectFiles(files: FileList | null) {
    if (disabled || !files?.length) return;
    if (files.length > 1) {
      toast.error("Choose one CSV file at a time.");
      return;
    }
    const selected = files[0];
    if (validateCsv(selected)) onChange(selected);
  }

  return (
    <div className="min-w-0">
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={(event) => {
          selectFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        data-dragging={dragging || undefined}
        className="h-auto min-h-32 w-full min-w-0 flex-col gap-2 border-dashed px-4 py-6 whitespace-normal data-[dragging=true]:ring-2 data-[dragging=true]:ring-primary"
        onClick={() => input.current?.click()}
        onDragEnter={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          if (disabled) return;
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dragDepth.current = 0;
          setDragging(false);
          selectFiles(event.dataTransfer.files);
        }}
      >
        {file ? <FileSpreadsheet aria-hidden="true" /> : <Upload aria-hidden="true" />}
        <span className="w-full truncate" aria-live="polite" title={file?.name}>
          {dragging ? "Drop your CSV file here" : (file?.name ?? "Drag and drop a CSV file here")}
        </span>
        <span className="text-muted-foreground font-normal">
          {file ? "Click to browse or drop another file to replace it" : "or click to browse"}
        </span>
      </Button>
    </div>
  );
}
