"use client";

import type { ReactNode } from "react";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Pagination } from "@/types/api";

export function AdminRefresh({ onRefresh, busy }: { onRefresh: () => void; busy: boolean }) {
  return (
    <Button variant="outline" onClick={onRefresh} disabled={busy}>
      <RefreshCw data-icon="inline-start" />
      Refresh
    </Button>
  );
}

export function AdminApiTable({
  columns,
  pending,
  failed,
  empty,
  children,
}: {
  columns: readonly string[];
  pending: boolean;
  failed: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  let content = children;
  if (pending) {
    content = (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <div role="status" aria-label="Loading records" className="flex flex-col gap-3 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </TableCell>
      </TableRow>
    );
  } else if (failed) {
    content = null;
  } else if (empty) {
    content = (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No records</EmptyTitle>
              <EmptyDescription>Try adjusting the filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TableCell>
      </TableRow>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{content}</TableBody>
    </Table>
  );
}

export function AdminApiPagination({
  pagination,
  offset,
  limit,
  busy,
  onPage,
}: {
  pagination: Pagination | null | undefined;
  offset: number;
  limit: number;
  busy: boolean;
  onPage: (offset: number) => void;
}) {
  const total = pagination?.total;
  const start = total ? Math.min(offset + 1, total) : 0;
  const summary =
    total === undefined ? "Records not loaded" : `${start}-${Math.min(offset + limit, total)} of ${total} records`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {summary}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy || offset === 0}
          onClick={() => onPage(Math.max(0, offset - limit))}
        >
          <ChevronLeft data-icon="inline-start" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || total === undefined || offset + limit >= total}
          onClick={() => onPage(offset + limit)}
        >
          Next
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
