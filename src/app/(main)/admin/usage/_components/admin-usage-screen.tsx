"use client";

import { type FormEvent, useState } from "react";

import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useProjectUsageQuery } from "@/hooks/use-admin-query";
import type { TimeRangeParams } from "@/lib/api/types";

import { AdminRefresh } from "../../_components/admin-api-table";
import { ADMIN_PAGE_SIZE, formatTimestamp, formatUsd, toTimeRange } from "../../_components/admin-api-utils";
import { AdminPageHeader } from "../../_components/admin-primitives";
import { AdminTimeFilters } from "../../_components/admin-time-filters";
import { useAdminAccess } from "../../_components/use-admin-access";

export function AdminUsageScreen() {
  const { enabled } = useAdminAccess();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<TimeRangeParams>({});
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(ADMIN_PAGE_SIZE);
  const usage = useProjectUsageQuery({ ...filters, limit, offset }, { enabled });
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
      <DataTable
        rows={rows}
        getRowId={(row) => row.project_id}
        columns={[
          {
            id: "project",
            label: "Project",
            hideable: false,
            cell: (item) => (
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium">{item.project_name}</span>
                {item.archived && <Badge variant="outline">Archived</Badge>}
                <span className="font-mono text-muted-foreground text-xs">{item.project_id}</span>
              </div>
            ),
          },
          { id: "runs", label: "Runs", align: "right", cell: (item) => item.run_count },
          { id: "cost", label: "Cost", align: "right", cell: (item) => formatUsd(item.cost_usd) },
          { id: "budget", label: "Budget", align: "right", cell: (item) => formatUsd(item.budget_usd) },
          {
            id: "statuses",
            label: "Run statuses",
            cell: (item) => (
              <div className="flex max-w-sm flex-wrap gap-1">
                {Object.entries(item.runs_by_status).map(([status, count]) => (
                  <Badge key={status} variant="outline">
                    {status.replaceAll("_", " ")}: {count}
                  </Badge>
                ))}
                {Object.keys(item.runs_by_status).length === 0 && "—"}
              </div>
            ),
          },
          { id: "lastRun", label: "Last run", cell: (item) => formatTimestamp(item.last_run_at) },
        ]}
        pending={usage.isPending}
        failed={usage.isError}
        toolbar={
          <form onSubmit={apply} noValidate>
            <FieldGroup className="flex-row flex-wrap items-center gap-3">
              <AdminTimeFilters
                prefix="usage"
                compact
                from={from}
                to={to}
                onChange={(nextFrom, nextTo) => {
                  setFrom(nextFrom);
                  setTo(nextTo);
                }}
              />
              <div className="ml-auto flex flex-wrap gap-2">
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
        }
        pagination={{
          total: usage.data?.meta.pagination?.total,
          offset,
          limit,
          busy: !enabled || usage.isFetching || usage.isError,
          onPage: setOffset,
          onLimit: (value) => {
            setLimit(value);
            setOffset(0);
          },
        }}
      />
    </div>
  );
}
