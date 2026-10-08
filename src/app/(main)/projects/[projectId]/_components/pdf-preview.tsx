import { cn } from "cn";

export function PdfPreview({ url, filename, className }: { url: string; filename: string; className?: string }) {
  return <iframe title={filename} src={url} className={cn("w-full", className)} />;
}
