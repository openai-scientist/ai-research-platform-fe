import { useState } from "react";

import { cn } from "cn";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ConnectionPreview } from "@/lib/api/services/fetch-data-connections";

// Text is the default, so only other types are worth a line under the column name.
const PLAIN_TYPES = new Set(["text", "string", "varchar", "character varying"]);

export function ConnectionPreviewStep({
  preview,
  timeSeries = false,
}: {
  preview: ConnectionPreview | null;
  timeSeries?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (!preview) return null;
  if (!preview.rows.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{timeSeries ? "No points in this time range" : "No rows returned"}</EmptyTitle>
          <EmptyDescription>
            {timeSeries
              ? "Adjust the time range or bucket before importing."
              : "Choose another table or adjust your SELECT query before importing."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  const toggle = (rowIndex: number) => setOpen((value) => (value === rowIndex ? null : rowIndex));
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
        <span className="font-medium tabular-nums">
          {preview.truncated ? `First ${preview.rows.length} rows` : `${preview.rows.length} rows`} ·{" "}
          {preview.columns.length} columns
        </span>
        <span className="text-muted-foreground">
          {preview.truncated ? "Import reads every row at the source." : "Every row at the source is shown."} Click a
          row to expand it. Values over 500 characters are cut short here.
        </span>
      </div>
      <ScrollArea
        type="auto"
        className="min-h-0 min-w-0 flex-1 rounded-lg border [&_[data-slot=scroll-area-thumb]]:bg-muted-foreground/40 [&_[data-slot=scroll-area-viewport]]:overscroll-contain [&_[data-slot=table-container]]:overflow-visible"
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow>
              {preview.columns.map((column, index) => (
                <TableHead
                  key={`${column.name}:${index}`}
                  className={cn("bg-muted align-top", index === 0 && "sticky left-0")}
                >
                  <span className="flex max-w-56 flex-col gap-0.5 py-1.5">
                    <span className="truncate text-foreground">{column.name || "Unnamed column"}</span>
                    {!PLAIN_TYPES.has(column.type.toLowerCase()) && (
                      <span className="truncate font-normal text-muted-foreground text-xs">{column.type}</span>
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.rows.map((row, rowIndex) => {
              const expanded = open === rowIndex;
              return (
                <TableRow
                  key={`row:${rowIndex}`}
                  tabIndex={0}
                  aria-expanded={expanded}
                  data-state={expanded ? "selected" : undefined}
                  className="cursor-pointer outline-none focus-visible:bg-muted/50"
                  onClick={() => toggle(rowIndex)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    toggle(rowIndex);
                  }}
                >
                  {preview.columns.map((column, index) => (
                    <TableCell
                      key={`${column.name}:${index}`}
                      className={cn("whitespace-normal align-top", index === 0 && "sticky left-0 bg-card")}
                    >
                      {row[index] === null || row[index] === "" ? (
                        <span className="text-muted-foreground/60">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">{row[index] === null ? "No value" : "Empty text"}</span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "block min-w-24 max-w-72 break-words",
                            expanded ? "whitespace-pre-wrap" : "line-clamp-2",
                          )}
                        >
                          {row[index]}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
