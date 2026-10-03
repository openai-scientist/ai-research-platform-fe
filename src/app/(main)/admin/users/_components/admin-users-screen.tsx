"use client";

import { type FormEvent, useState } from "react";

import { Search } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useUsersQuery } from "@/hooks/use-admin-query";
import { PlatformRole } from "@/types/enums";

import { AdminRefresh } from "../../_components/admin-api-table";
import { ADMIN_PAGE_SIZE, formatTimestamp } from "../../_components/admin-api-utils";
import { AdminPageHeader } from "../../_components/admin-primitives";
import { useAdminAccess } from "../../_components/use-admin-access";
import { AdminUserActions } from "./admin-user-actions";

export function AdminUsersScreen() {
  const { enabled, currentUserId } = useAdminAccess();
  const [draftEmail, setDraftEmail] = useState("");
  const [email, setEmail] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(ADMIN_PAGE_SIZE);
  const users = useUsersQuery({ email: email || undefined, limit, offset }, { enabled });
  const rows = users.data?.data ?? [];
  const filter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmail(draftEmail.trim());
    setOffset(0);
  };
  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Users"
        description="Manage account status and platform administrator access."
        actions={
          <AdminRefresh
            busy={!enabled || users.isFetching}
            onRefresh={() => {
              void users.refetch();
            }}
          />
        }
      />
      <DataTable
        rows={rows}
        getRowId={(row) => row.id}
        columns={[
          {
            id: "user",
            label: "User",
            hideable: false,
            cell: (user) => (
              <div className="flex flex-col gap-1">
                <span className="font-medium">
                  {user.display_name ?? user.email}
                  {user.id === currentUserId ? " (you)" : ""}
                </span>
                <span className="text-muted-foreground text-xs">{user.email}</span>
              </div>
            ),
          },
          { id: "status", label: "Status", cell: (user) => <ManagementStatusBadge status={user.status} /> },
          {
            id: "role",
            label: "Platform role",
            cell: (user) => (
              <Badge variant="outline">
                {user.platform_role === PlatformRole.PlatformAdmin ? "Platform Admin" : "Standard user"}
              </Badge>
            ),
          },
          { id: "created", label: "Created", cell: (user) => formatTimestamp(user.created_at) },
          {
            id: "actions",
            label: "Actions",
            align: "right",
            cell: (user) => (
              <div className="flex justify-end">
                <AdminUserActions user={user} currentUserId={currentUserId} enabled={enabled && !users.isFetching} />
              </div>
            ),
          },
        ]}
        pending={users.isPending}
        failed={users.isError}
        toolbar={
          <form onSubmit={filter} noValidate>
            <FieldGroup className="flex-row flex-wrap items-center gap-3">
              <Field className="w-full sm:max-w-sm">
                <FieldLabel className="sr-only" htmlFor="admin-user-email">
                  Email
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Search aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="admin-user-email"
                    type="search"
                    placeholder="Filter by email"
                    value={draftEmail}
                    onChange={(event) => setDraftEmail(event.target.value)}
                  />
                </InputGroup>
              </Field>
              <div className="ml-auto flex items-center gap-2">
                <Button type="submit" variant="outline" disabled={!enabled || users.isFetching}>
                  Apply filters
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!enabled || users.isFetching}
                  onClick={() => {
                    setDraftEmail("");
                    setEmail("");
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
          total: users.data?.meta.pagination?.total,
          offset,
          limit,
          busy: !enabled || users.isFetching || users.isError,
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
