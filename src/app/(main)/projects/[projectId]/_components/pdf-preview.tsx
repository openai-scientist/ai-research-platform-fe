"use client";

import { useState } from "react";

import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";

type PdfPreviewProps = { url: string; filename: string; className?: string };

export function PdfPreview(props: PdfPreviewProps) {
  return <PdfFrame key={props.url} {...props} />;
}

function PdfFrame({ url, filename, className }: PdfPreviewProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full" aria-busy={!loaded}>
      {!loaded && (
        <div role="status" aria-label={`Loading ${filename}`} className="absolute inset-0">
          <Skeleton className="size-full motion-reduce:animate-none" />
        </div>
      )}
      <iframe
        title={filename}
        src={url}
        onLoad={() => setLoaded(true)}
        className={cn("w-full", className, !loaded && "invisible")}
      />
    </div>
  );
}
