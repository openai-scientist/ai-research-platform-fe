"use client";

import { useState } from "react";

import { cn } from "cn";

import { DialogScrollArea } from "@/components/dialog-scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiQuery } from "@/hooks/use-api";
import { projectKeys } from "@/lib/api/query-keys";
import { type DatasetVersionItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";

import { previewRows } from "./csv-preview";
import { ListState } from "./workspace-ui";

const PREVIEW_BYTES = 1024 * 1024;

export function DatasetCsvPreview({
  projectId,
  datasetId,
  version,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
  inline = false,
  note = true,
}: {
  projectId: string;
  datasetId: string;
  version: DatasetVersionItem;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  inline?: boolean;
  /** The line on what the preview leaves out; off when the caller says it elsewhere. */
  note?: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const changeOpen = (value: boolean) => {
    setLocalOpen(value);
    onOpenChange?.(value);
  };
  const query = useApiQuery(
    [...projectKeys.dataset(projectId, datasetId), "preview", version.id],
    async (signal) => {
      const { blob } = await fetchDatasets.downloadVersion(projectId, datasetId, version.id, signal);
      const text = await blob.slice(0, PREVIEW_BYTES).text();
      return previewRows(text, ",", blob.size <= PREVIEW_BYTES);
    },
    { enabled: inline ? true : open, staleTime: Infinity },
  );
  const rows = query.data ?? [];

  const content = (
    <div className="flex min-h-0 min-w-0 flex-col gap-3">
      <ListState
        pending={query.isFetching && !query.data}
        failed={query.isError}
        empty={!query.isFetching && !query.isError && rows.length <= 1}
        title="CSV rows"
        retry={query.refetch}
      />
      {rows.length > 1 && (
        <DialogScrollArea
          horizontal
          contentLabel="CSV preview table"
          className={cn(
            "rounded-lg border border-border",
            inline ? "max-h-[max(16rem,calc(100dvh-22rem))] sm:max-h-[max(16rem,calc(100dvh-19rem))]" : "max-h-[55dvh]",
          )}
          contentClassName="p-0!"
        >
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead className="w-12">Row</TableHead>
                {rows[0].map((column, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Column positions are fixed in this immutable preview.
                  <TableHead key={index} className="min-w-36 whitespace-normal break-words">
                    {column || `Column ${index + 1}`}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(1).map((row, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Row coordinates are stable in this unsorted preview.
                <TableRow key={index}>
                  <TableCell className="align-top text-muted-foreground">{index + 1}</TableCell>
                  {rows[0].map((_, column) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Duplicate CSV values are valid; column position identifies each cell.
                    <TableCell key={column} className="max-w-80 whitespace-pre-wrap break-words align-top">
                      {row[column] ?? ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogScrollArea>
      )}
      {note && (
        <p className="text-muted-foreground text-xs">
          Preview shows up to 100 rows and 50 columns from the start of the file. Download CSV to view the complete
          dataset.
        </p>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Preview CSV
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[85dvh] min-w-0 flex-col gap-4 overflow-hidden sm:max-w-5xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="break-words">{version.original_filename}</DialogTitle>
          <DialogDescription>
            Version {version.version_number} · {version.row_count.toLocaleString()} rows · {version.column_names.length}{" "}
            columns
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter className="shrink-0">
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
          <Button asChild variant="outline">
            <a href={fetchDatasets.getVersionDownloadUrl(projectId, datasetId, version.id)}>Download CSV</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
