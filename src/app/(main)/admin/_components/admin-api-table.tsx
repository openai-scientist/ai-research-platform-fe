"use client";

import type { ReactNode } from "react";

import { RefreshCw } from "lucide-react";

import { DataTableFooter } from "@/components/data-table";
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
    <div data-main-table>
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
    </div>
  );
}

export function AdminApiPagination({
  pagination,
  offset,
  limit,
  busy,
  onPage,
  onLimit,
}: {
  pagination: Pagination | null | undefined;
  offset: number;
  limit: number;
  busy: boolean;
  onPage: (offset: number) => void;
  onLimit?: (limit: number) => void;
}) {
  return <DataTableFooter pagination={{ total: pagination?.total, offset, limit, busy, onPage, onLimit }} />;
}
