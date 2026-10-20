import type { FileDownload } from "@/lib/api/types";

export function saveProjectFile(result: FileDownload, fallbackFilename: string) {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename ?? fallbackFilename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
