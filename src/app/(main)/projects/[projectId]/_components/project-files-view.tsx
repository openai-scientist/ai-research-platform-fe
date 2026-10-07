"use client";

import { cn } from "cn";
import { format } from "date-fns";
import { FileSpreadsheet, FileText } from "lucide-react";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectFileItem, ProjectFileKind } from "@/lib/api/services/fetch-project-files";

import { ProjectFileActions } from "./project-file-actions";

const FILE_TYPES = {
  pdf: {
    label: "PDF",
    icon: FileText,
    iconClassName: "text-red-600 dark:text-red-400",
    previewClassName: "bg-red-500/5",
  },
  csv: {
    label: "CSV",
    icon: FileSpreadsheet,
    iconClassName: "text-blue-600 dark:text-blue-400",
    previewClassName: "bg-blue-500/5",
  },
  excel: {
    label: "Excel",
    icon: FileSpreadsheet,
    iconClassName: "text-green-600 dark:text-green-400",
    previewClassName: "bg-green-500/5",
  },
} satisfies Record<
  ProjectFileKind,
  { label: string; icon: typeof FileText; iconClassName: string; previewClassName: string }
>;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const megabytes = bytes >= 1024 * 1024;
  const value = bytes / (megabytes ? 1024 * 1024 : 1024);
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${megabytes ? "MiB" : "KiB"}`;
}

export function ProjectFilesView({
  projectId,
  files,
  view,
  canWrite,
  pending,
}: {
  projectId: string;
  files: readonly ProjectFileItem[];
  view: "grid" | "list";
  canWrite: boolean;
  pending: boolean;
}) {
  const gridClassName = "grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4";

  if (pending) {
    return view === "grid" ? (
      <div className={gridClassName} role="status" aria-label="Loading documents">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-56 w-full" />
        ))}
      </div>
    ) : (
      <Skeleton className="h-32 w-full" aria-label="Loading documents" />
    );
  }

  if (view === "grid") {
    return (
      <div className={gridClassName}>
        {files.map((file) => {
          const fileType = FILE_TYPES[file.kind];
          const FileIcon = fileType.icon;
          return (
            <Card key={file.id} size="sm" className="min-w-0">
              <CardContent>
                <div
                  className={cn("relative flex h-36 items-center justify-center rounded-lg", fileType.previewClassName)}
                >
                  <FileIcon className={cn("size-12", fileType.iconClassName)} aria-hidden="true" />
                  <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 text-muted-foreground text-xs">
                    <span className={fileType.iconClassName}>{fileType.label}</span>
                    <span className="tabular-nums">{formatFileSize(file.size_bytes)}</span>
                  </div>
                </div>
              </CardContent>
              <CardHeader className="min-w-0">
                <CardTitle className="min-w-0 truncate" title={file.filename}>
                  {file.filename}
                </CardTitle>
                <CardDescription className="truncate">
                  Uploaded <time dateTime={file.created_at}>{format(new Date(file.created_at), "MMM d, yyyy")}</time>
                </CardDescription>
                <CardAction>
                  <ProjectFileActions projectId={projectId} file={file} canWrite={canWrite} />
                </CardAction>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="pl-0">Filename</TableHead>
          <TableHead className="hidden w-20 sm:table-cell">Type</TableHead>
          <TableHead className="hidden w-36 md:table-cell">Uploaded</TableHead>
          <TableHead className="hidden w-24 sm:table-cell">Size</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => {
          const fileType = FILE_TYPES[file.kind];
          const FileIcon = fileType.icon;
          return (
            <TableRow key={file.id}>
              <TableCell className="pl-0">
                <div className="flex min-w-0 items-center gap-3">
                  <FileIcon className={cn("size-5 shrink-0", fileType.iconClassName)} aria-hidden="true" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-medium" title={file.filename}>
                      {file.filename}
                    </span>
                    <span className="text-muted-foreground text-xs sm:hidden">
                      {fileType.label} · {formatFileSize(file.size_bytes)}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className={cn("hidden sm:table-cell", fileType.iconClassName)}>{fileType.label}</TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                <time dateTime={file.created_at}>{format(new Date(file.created_at), "MMM d, yyyy")}</time>
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                {formatFileSize(file.size_bytes)}
              </TableCell>
              <TableCell>
                <ProjectFileActions projectId={projectId} file={file} canWrite={canWrite} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
