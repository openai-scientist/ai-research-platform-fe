"use client";

import { type FormEvent, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { TableCell, TableRow } from "@/components/ui/table";
import { useProjectUsageQuery } from "@/hooks/use-admin-query";
import type { TimeRangeParams } from "@/lib/api/types";

import { AdminApiPagination, AdminApiTable, AdminRefresh } from "../../_components/admin-api-table";
import { ADMIN_PAGE_SIZE, formatTimestamp, formatUsd, toTimeRange } from "../../_components/admin-api-utils";
import { AdminPageHeader, SectionCard } from "../../_components/admin-primitives";
import { AdminTimeFilters } from "../../_components/admin-time-filters";
import { useAdminAccess } from "../../_components/use-admin-access";

export function AdminUsageScreen() {
  const { enabled } = useAdminAccess();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<TimeRangeParams>({});
  const [offset, setOffset] = useState(0);
  const usage = useProjectUsageQuery({ ...filters, limit: ADMIN_PAGE_SIZE, offset }, { enabled });
  const rows = usage.data?.data ?? [];
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setFilters(toTimeRange(from, to));
      setOffset(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the time range and try again.");
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Usage & Cost"
        description="Review run costs and budgets by project, ordered by highest cost."
        actions={
          <AdminRefresh
            busy={!enabled || usage.isFetching}
            onRefresh={() => {
              void usage.refetch();
            }}
          />
        }
      />
      <SectionCard title="Project usage" description="Includes projects with no runs in the selected period.">
        <div className="flex flex-col gap-4">
          <form onSubmit={apply} noValidate>
            <FieldGroup className="flex-row flex-wrap items-end gap-3">
              <AdminTimeFilters
                prefix="usage"
                from={from}
                to={to}
                onChange={(nextFrom, nextTo) => {
                  setFrom(nextFrom);
                  setTo(nextTo);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" disabled={!enabled || usage.isFetching}>
                  Apply filters
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!enabled || usage.isFetching}
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setFilters({});
                    setOffset(0);
                  }}
                >
                  Reset
                </Button>
              </div>
            </FieldGroup>
          </form>
          <AdminApiTable
            columns={["Project", "Runs", "Cost", "Budget", "Run statuses", "Last run"]}
            pending={usage.isPending}
            failed={usage.isError}
            empty={rows.length === 0}
          >
            {rows.map((item) => (
              <TableRow key={item.project_id}>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <span>{item.project_name}</span>
                    {item.archived && <Badge variant="outline">Archived</Badge>}
                    <span className="font-mono text-muted-foreground text-xs">{item.project_id}</span>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{item.run_count}</TableCell>
                <TableCell className="tabular-nums">{formatUsd(item.cost_usd)}</TableCell>
                <TableCell className="tabular-nums">{formatUsd(item.budget_usd)}</TableCell>
                <TableCell>
                  <div className="flex max-w-sm flex-wrap gap-1">
                    {Object.entries(item.runs_by_status).map(([status, count]) => (
                      <Badge key={status} variant="secondary">
                        {status.replaceAll("_", " ")}: {count}
                      </Badge>
                    ))}
                    {Object.keys(item.runs_by_status).length === 0 && "—"}
                  </div>
                </TableCell>
                <TableCell>{formatTimestamp(item.last_run_at)}</TableCell>
              </TableRow>
            ))}
          </AdminApiTable>
          <AdminApiPagination
            pagination={usage.data?.meta.pagination}
            offset={offset}
            limit={ADMIN_PAGE_SIZE}
            busy={!enabled || usage.isFetching || usage.isError}
            onPage={setOffset}
          />
        </div>
      </SectionCard>
    </div>
  );
}
