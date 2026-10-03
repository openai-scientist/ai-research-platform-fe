"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";

export function CsvFileInput({
  id,
  file,
  onChange,
}: {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <Button id={id} type="button" variant="outline" onClick={() => input.current?.click()}>
        Choose file
      </Button>
      <span className="min-w-0 truncate text-muted-foreground text-sm" aria-live="polite" title={file?.name}>
        {file?.name ?? "No file selected"}
      </span>
    </div>
  );
}
