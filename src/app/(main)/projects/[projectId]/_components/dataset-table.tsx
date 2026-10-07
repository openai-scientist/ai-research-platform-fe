"use client";

import { type ReactNode, useMemo, useState } from "react";

import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export function DatasetTable<T>({
  title,
  description,
  actions,
  rows,
  columns,
  getRowId,
  searchText,
  pending,
  failed,
  onRetry,
  hasMore,
  footer,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchText: (row: T) => string;
  pending: boolean;
  failed: boolean;
  onRetry: () => unknown;
  hasMore?: boolean;
  footer?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? rows.filter((row) => searchText(row).toLowerCase().includes(term)) : rows;
  }, [rows, search, searchText]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <CardAction className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder={`Search ${title.toLowerCase()}...`}
              aria-label={`Search ${title.toLowerCase()}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
          {actions}
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4 pt-4 [&_[data-slot=table-cell]]:px-4 [&_[data-slot=table-cell]]:py-4 [&_[data-slot=table-cell]]:align-middle [&_[data-slot=table-head]]:h-12 [&_[data-slot=table-head]]:px-4 [&_[data-slot=table-head]]:font-normal [&_[data-slot=table-header]]:border-t [&_[data-slot=table-row]]:border-border/60 [&_[data-slot=table-row]]:hover:bg-muted/40">
        <DataTable
          rows={filtered}
          columns={columns}
          getRowId={getRowId}
          pending={pending && !rows.length}
          failed={failed && !rows.length}
          toolbar={
            <span className="text-muted-foreground text-sm tabular-nums">
              {filtered.length} {filtered.length === 1 ? "record" : "records"}
            </span>
          }
        />
        {search.trim() && hasMore && (
          <p className="text-muted-foreground text-xs">
            More records are available. Load more to include them in this search.
          </p>
        )}
        {failed && (
          <Button variant="outline" className="self-start" onClick={() => void onRetry()}>
            Reload records
          </Button>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}
