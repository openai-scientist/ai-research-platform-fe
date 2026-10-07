import { cn } from "cn";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ConnectionPreview } from "@/lib/api/services/fetch-data-connections";

export function ConnectionPreviewStep({ preview }: { preview: ConnectionPreview | null }) {
  if (!preview) return null;
  if (!preview.rows.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No rows returned</EmptyTitle>
          <EmptyDescription>Choose another table or adjust your SELECT query before importing.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap justify-between gap-2 text-xs">
        <span>
          {preview.columns.length} columns · {preview.rows.length} preview rows
        </span>
        <span className="text-muted-foreground">Preview limit: 100 rows</span>
      </div>
      <ScrollArea
        type="hover"
        className="min-h-0 min-w-0 flex-1 rounded-lg border [&_[data-slot=scroll-area-viewport]]:overscroll-contain [&_[data-slot=table-container]]:overflow-visible"
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow>
              {preview.columns.map((column, index) => (
                <TableHead
                  key={`${column.name}:${index}`}
                  className={index === 0 ? "sticky left-0 bg-muted" : "bg-muted"}
                >
                  <span className="flex max-w-48 flex-col gap-1 py-1">
                    <span className="truncate text-foreground" title={column.name}>
                      {column.name || "Unnamed column"}
                    </span>
                    <span className="truncate font-normal text-muted-foreground text-xs" title={column.type}>
                      {column.type}
                    </span>
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.rows.map((row, rowIndex) => (
              <TableRow key={`row:${rowIndex}`}>
                {preview.columns.map((column, index) => (
                  <TableCell
                    key={`${column.name}:${index}`}
                    className={index === 0 ? "sticky left-0 bg-card" : undefined}
                  >
                    {row[index] === null ? (
                      <span className="text-muted-foreground">NULL</span>
                    ) : row[index] === "" ? (
                      <span className="text-muted-foreground">
                        <span aria-hidden="true">""</span>
                        <span className="sr-only">Empty string</span>
                      </span>
                    ) : (
                      <span
                        className={cn("block truncate", index === 0 ? "max-w-48" : "max-w-80")}
                        title={row[index] ?? ""}
                      >
                        {row[index] ?? ""}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <p className="shrink-0 text-pretty text-muted-foreground text-xs">
        {preview.truncated ? "More rows are available at the source. " : "All source rows are shown in this preview. "}
        Values longer than 500 characters may be truncated. Import reads the full source.
      </p>
    </div>
  );
}
