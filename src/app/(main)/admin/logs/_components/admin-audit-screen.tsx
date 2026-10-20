"use client";

import { type FormEvent, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditQuery } from "@/hooks/use-admin-query";
import type { AuditListParams } from "@/lib/api/services/fetch-admin";

import { AdminRefresh } from "../../_components/admin-api-table";
import { ADMIN_PAGE_SIZE, toTimeRange } from "../../_components/admin-api-utils";
import { AdminPageHeader } from "../../_components/admin-primitives";
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
  const [limit, setLimit] = useState(ADMIN_PAGE_SIZE);
  const audit = useAuditQuery({ ...filters, limit, offset }, { enabled });
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
      <AdminAuditActivity
        rows={rows}
        pending={audit.isPending}
        failed={audit.isError}
        enabled={enabled}
        toolbar={
          <form onSubmit={apply} noValidate>
            <FieldGroup className="flex-row flex-wrap items-center gap-3">
              <Field className="w-full min-w-0 shrink-0 sm:w-64">
                <FieldLabel className="sr-only" htmlFor="audit-action">
                  Activity
                </FieldLabel>
                <Select
                  value={draft.action || "all"}
                  onValueChange={(value) => setDraft({ ...draft, action: value === "all" ? "" : value })}
                >
                  <SelectTrigger id="audit-action" className="w-full bg-background">
                    <SelectValue>
                      {draft.action
                        ? (actionOptions.get(draft.action) ?? readableValue(draft.action))
                        : "All activities"}
                    </SelectValue>
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
                compact
                from={draft.from}
                to={draft.to}
                onChange={(from, to) => setDraft({ ...draft, from, to })}
              />
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Button type="submit" variant="outline" disabled={!enabled || audit.isFetching}>
                  Apply filters
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
            </FieldGroup>
          </form>
        }
        pagination={{
          total: audit.data?.meta.pagination?.total,
          offset,
          limit,
          busy: !enabled || audit.isFetching || audit.isError,
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
