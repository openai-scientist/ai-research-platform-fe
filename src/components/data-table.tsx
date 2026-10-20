"use client";

import { type ReactNode, useId, useState } from "react";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface DataTableColumn<T> {
  id: string;
  label: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  hideable?: boolean;
  cellClassName?: string;
}

export interface DataTablePagination {
  total?: number;
  offset: number;
  limit: number;
  busy: boolean;
  onPage: (offset: number) => void;
  onLimit?: (limit: number) => void;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  toolbar,
  pending = false,
  failed = false,
  pagination,
}: {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowId: (row: T) => string;
  toolbar?: ReactNode;
  pending?: boolean;
  failed?: boolean;
  pagination?: DataTablePagination;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const visible = columns.filter((column) => !hidden.has(column.id));
  const selectedCount = rows.filter((row) => selected.has(getRowId(row))).length;
  const busy = [pending, failed, pagination?.busy].some(Boolean);
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const partiallySelected = selectedCount > 0 ? "indeterminate" : false;
  const selectRow = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div data-shared-table className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {toolbar && <div className="min-w-0 flex-1">{toolbar}</div>}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns2 data-icon="inline-start" />
                Customize Columns
                <ChevronDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={!hidden.has(column.id)}
                    disabled={column.hideable === false || (!hidden.has(column.id) && visible.length === 1)}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) =>
                      setHidden((current) => {
                        const next = new Set(current);
                        if (checked) next.delete(column.id);
                        else next.add(column.id);
                        return next;
                      })
                    }
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="min-w-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  aria-label="Select all rows on this page"
                  disabled={busy || !rows.length}
                  checked={allSelected ? true : partiallySelected}
                  onCheckedChange={(checked) => setSelected(checked === true ? new Set(rows.map(getRowId)) : new Set())}
                />
              </TableHead>
              {visible.map((column) => (
                <TableHead key={column.id} className={column.align === "right" ? "text-right" : undefined}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending && (
              <TableRow>
                <TableCell colSpan={visible.length + 1}>
                  <div role="status" aria-label="Loading records" className="flex flex-col gap-3 py-4">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!pending &&
              !failed &&
              rows.length > 0 &&
              rows.map((row, index) => (
                <TableRow key={getRowId(row)} data-state={selected.has(getRowId(row)) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Select row ${index + 1}`}
                      disabled={busy}
                      checked={selected.has(getRowId(row))}
                      onCheckedChange={(checked) => selectRow(getRowId(row), checked === true)}
                    />
                  </TableCell>
                  {visible.map((column) => (
                    <TableCell
                      key={column.id}
                      className={column.cellClassName ?? (column.align === "right" ? "text-right" : undefined)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!pending && !failed && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={visible.length + 1} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTableFooter
        selectedCount={selectedCount}
        total={pagination?.total ?? rows.length}
        pagination={pagination}
        onResetSelection={() => setSelected(new Set())}
      />
    </div>
  );
}

export function DataTableFooter({
  selectedCount,
  total,
  pagination,
  onResetSelection,
}: {
  selectedCount?: number;
  total?: number;
  pagination?: DataTablePagination;
  onResetSelection?: () => void;
}) {
  const labelId = useId();
  const busy = Boolean(pagination?.busy);
  const pageCount = Math.max(1, Math.ceil((pagination?.total ?? 0) / (pagination?.limit ?? 20)));
  const page = pagination ? Math.min(Math.floor(pagination.offset / pagination.limit) + 1, pageCount) : 1;
  const changePage = (offset: number) => {
    onResetSelection?.();
    pagination?.onPage(offset);
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-2">
      {selectedCount !== undefined && (
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {selectedCount} of {total ?? 0} row(s) selected.
        </p>
      )}
      {pagination && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <div className="flex items-center gap-2">
            <span id={labelId} className="font-medium text-sm">
              Rows per page
            </span>
            <Select
              value={String(pagination.limit)}
              disabled={busy || !pagination.onLimit}
              onValueChange={(value) => {
                onResetSelection?.();
                pagination.onLimit?.(Number(value));
              }}
            >
              <SelectTrigger className="w-20" aria-labelledby={labelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {Array.from(new Set([10, 20, 30, 40, 50, pagination.limit]))
                    .sort((a, b) => a - b)
                    .map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <span className="font-medium text-sm" aria-live="polite">
            {pagination.total === undefined ? "Records not loaded" : `Page ${page} of ${pageCount}`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Go to first page"
              disabled={busy || page === 1}
              onClick={() => changePage(0)}
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Go to previous page"
              disabled={busy || page === 1}
              onClick={() => changePage(Math.max(0, pagination.offset - pagination.limit))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Go to next page"
              disabled={busy || pagination.total === undefined || page >= pageCount}
              onClick={() => changePage(pagination.offset + pagination.limit)}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Go to last page"
              disabled={busy || pagination.total === undefined || page >= pageCount}
              onClick={() => changePage((pageCount - 1) * pagination.limit)}
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
