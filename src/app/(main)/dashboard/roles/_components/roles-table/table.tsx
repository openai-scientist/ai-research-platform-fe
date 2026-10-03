"use client";
import { useMemo } from "react";

import { FlexRender, type ReactTable } from "@tanstack/react-table";
import { cn } from "cn";

import { TanStackDataTableFooter } from "@/components/tanstack-data-table-footer";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DataTableFeatures } from "@/lib/data-table-features";

import type { Role } from "./data";

type RoleTableRow = ReturnType<ReactTable<DataTableFeatures, Role>["getRowModel"]>["rows"][number];

function groupRowsByRoleGroup(rows: RoleTableRow[]) {
  return rows.reduce(
    (groups, row) => {
      const label = row.original.group;
      const group = groups.find((item) => item.label === label);

      if (group) {
        group.rows.push(row);
      } else {
        groups.push({ label, rows: [row] });
      }

      return groups;
    },
    [] as Array<{ label: string; rows: RoleTableRow[] }>,
  );
}

export function RolesTable({ table }: { table: ReactTable<DataTableFeatures, Role> }) {
  const pageRows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;

  const groupedRows = useMemo(() => groupRowsByRoleGroup(pageRows), [pageRows]);
  const filteredGroups = useMemo(() => groupRowsByRoleGroup(filteredRows), [filteredRows]);
  const totalGroupCounts = useMemo(
    () => new Map(filteredGroups.map((group) => [group.label, group.rows.length])),
    [filteredGroups],
  );

  const colCount = table.getVisibleLeafColumns().length;

  return (
    <>
      <Table className="w-full table-fixed border-collapse" style={{ minWidth: table.getTotalSize() }}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-y hover:bg-transparent [&>:not(:last-child)]:border-r">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="h-10 px-4 text-center font-medium text-foreground text-sm first:text-left"
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {groupedRows.length ? (
            groupedRows.map((group) => (
              <TableBodyGroup
                key={group.label}
                group={group}
                totalCount={totalGroupCounts.get(group.label) ?? 0}
                colCount={colCount}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TanStackDataTableFooter table={table} selectable={false} />
    </>
  );
}

function TableBodyGroup({
  group,
  totalCount,
  colCount,
}: {
  group: { label: string; rows: RoleTableRow[] };
  totalCount: number;
  colCount: number;
}) {
  return (
    <>
      <TableRow className="h-10 bg-muted">
        <TableCell className="px-4 text-foreground/60 text-sm" colSpan={colCount}>
          {group.label}{" "}
          <Badge variant="outline" className="ml-2 rounded-sm bg-transparent text-muted-foreground text-xs">
            {group.rows.length} of {totalCount}
          </Badge>
        </TableCell>
      </TableRow>
      {group.rows.map((row) => (
        <TableRow key={row.id} className="h-12 hover:bg-muted/20">
          {row.getVisibleCells().map((cell, index) => (
            <TableCell
              key={cell.id}
              style={{ width: cell.column.getSize() }}
              className={cn(
                "border-r px-4 align-middle",
                index === row.getVisibleCells().length - 1 && "border-r-0",
                index === 0 ? "text-left" : "text-center",
              )}
            >
              <FlexRender cell={cell} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
