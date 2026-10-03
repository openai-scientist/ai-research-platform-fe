"use client";

import { type FormEvent, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditQuery } from "@/hooks/use-admin-query";
import type { AuditListParams } from "@/lib/api/services/fetch-admin";

import { AdminApiPagination, AdminRefresh } from "../../_components/admin-api-table";
import { ADMIN_PAGE_SIZE, toTimeRange } from "../../_components/admin-api-utils";
import { AdminPageHeader, SectionCard } from "../../_components/admin-primitives";
import { AdminTimeFilters } from "../../_components/admin-time-filters";
import { useAdminAccess } from "../../_components/use-admin-access";
import { AdminAuditActivity } from "./admin-audit-activity";
import { actionLabels, readableValue } from "./audit-presentation";

const emptyFilters = { action: "", from: "", to: "" };
export function AdminAuditScreen() {
  const { enabled } = useAdminAccess();
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState<AuditListParams>({});
  const [offset, setOffset] = useState(0);
  const audit = useAuditQuery({ ...filters, limit: ADMIN_PAGE_SIZE, offset }, { enabled });
  const rows = audit.data?.data ?? [];
  const actionOptions = new Map(Object.entries(actionLabels));
  for (const item of rows) {
    if (!actionOptions.has(item.action)) actionOptions.set(item.action, readableValue(item.action));
  }
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setFilters({
        ...toTimeRange(draft.from, draft.to),
        action: draft.action.trim() || undefined,
      });
      setOffset(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the filters and try again.");
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Audit log"
        description="See who made changes, what changed, and when."
        actions={
          <AdminRefresh
            busy={!enabled || audit.isFetching}
            onRefresh={() => {
              void audit.refetch();
            }}
          />
        }
      />
      <SectionCard
        title="Platform activity"
        description="Activity grouped by day. All times are shown in your local timezone."
      >
        <div className="flex flex-col gap-4">
          <form onSubmit={apply} noValidate className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
              <Field className="min-w-0 lg:w-64">
                <FieldLabel htmlFor="audit-action">Activity</FieldLabel>
                <Select
                  value={draft.action || "all"}
                  onValueChange={(value) => setDraft({ ...draft, action: value === "all" ? "" : value })}
                >
                  <SelectTrigger id="audit-action" className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      <SelectItem value="all">All activities</SelectItem>
                      {Array.from(actionOptions, ([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <AdminTimeFilters
                prefix="audit"
                from={draft.from}
                to={draft.to}
                onChange={(from, to) => setDraft({ ...draft, from, to })}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button type="submit" variant="outline" disabled={!enabled || audit.isFetching}>
                Apply
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!enabled || audit.isFetching}
                onClick={() => {
                  setDraft(emptyFilters);
                  setFilters({});
                  setOffset(0);
                }}
              >
                Reset
              </Button>
            </div>
          </form>
          <AdminAuditActivity rows={rows} pending={audit.isPending} failed={audit.isError} enabled={enabled} />
          <AdminApiPagination
            pagination={audit.data?.meta.pagination}
            offset={offset}
            limit={ADMIN_PAGE_SIZE}
            busy={!enabled || audit.isFetching || audit.isError}
            onPage={setOffset}
          />
        </div>
      </SectionCard>
    </div>
  );
}
