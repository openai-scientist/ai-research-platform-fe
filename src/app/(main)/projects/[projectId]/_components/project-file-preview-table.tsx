import { FileSpreadsheet } from "lucide-react";

import { DialogScrollArea } from "@/components/dialog-scroll-area";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { FilePreviewTable } from "./project-file-preview-types";

export function ProjectFilePreviewTable({ table, label }: { table: FilePreviewTable; label: string }) {
  if (table.headers.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileSpreadsheet />
          </EmptyMedia>
          <EmptyTitle>No data to preview</EmptyTitle>
          <EmptyDescription>This file or sheet has no cells in the preview range.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <DialogScrollArea
      key={label}
      horizontal
      contentLabel={label}
      className="flex-1 rounded-lg border"
      contentClassName="p-0!"
    >
      <Table>
        <TableHeader className="sticky top-0 bg-muted">
          <TableRow>
            <TableHead scope="col" className="w-14">
              Row
            </TableHead>
            {table.headers.map((header, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Immutable column coordinates identify duplicate headers.
              <TableHead key={index} scope="col" className="min-w-36 max-w-80 whitespace-normal break-words">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Row coordinates stay fixed in this read-only preview.
            <TableRow key={index}>
              <TableCell className="align-top text-muted-foreground tabular-nums">{table.firstRow + index}</TableCell>
              {table.headers.map((_, column) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: The column coordinate identifies each cell.
                <TableCell key={column} className="max-w-80 whitespace-pre-wrap break-words align-top">
                  {row[column] ?? ""}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DialogScrollArea>
  );
}
