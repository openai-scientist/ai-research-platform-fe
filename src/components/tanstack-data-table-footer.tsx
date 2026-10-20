"use client";

import type { ReactTable, RowData } from "@tanstack/react-table";

import { DataTableFooter } from "@/components/data-table";
import type { DataTableFeatures } from "@/lib/data-table-features";

export function TanStackDataTableFooter<T extends RowData>({
  table,
  selectable = true,
}: {
  table: ReactTable<DataTableFeatures, T>;
  selectable?: boolean;
}) {
  const { pageIndex, pageSize } = table.state.pagination;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <DataTableFooter
      selectedCount={selectable ? table.getFilteredSelectedRowModel().rows.length : undefined}
      total={total}
      pagination={{
        total,
        offset: pageIndex * pageSize,
        limit: pageSize,
        busy: false,
        onPage: (offset) => table.setPageIndex(Math.floor(offset / pageSize)),
        onLimit: (limit) => {
          table.setPageSize(limit);
          table.setPageIndex(0);
        },
      }}
    />
  );
}
