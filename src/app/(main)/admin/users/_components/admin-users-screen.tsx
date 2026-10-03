"use client";

import { type FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { useUsersQuery } from "@/hooks/use-admin-query";
import { PlatformRole, UserStatus } from "@/types/enums";

import { AdminApiPagination, AdminApiTable, AdminRefresh } from "../../_components/admin-api-table";
import { ADMIN_PAGE_SIZE, formatTimestamp } from "../../_components/admin-api-utils";
import { AdminPageHeader, SectionCard } from "../../_components/admin-primitives";
import { useAdminAccess } from "../../_components/use-admin-access";
import { AdminUserActions } from "./admin-user-actions";

export function AdminUsersScreen() {
  const { enabled, currentUserId } = useAdminAccess();
  const [draftEmail, setDraftEmail] = useState("");
  const [email, setEmail] = useState("");
  const [offset, setOffset] = useState(0);
  const users = useUsersQuery({ email: email || undefined, limit: ADMIN_PAGE_SIZE, offset }, { enabled });
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
      <SectionCard title="Platform accounts" description="Project roles are managed separately within each project.">
        <div className="flex flex-col gap-4">
          <form onSubmit={filter} noValidate>
            <FieldGroup className="flex-row flex-wrap items-end">
              <Field className="w-full sm:max-w-sm">
                <FieldLabel htmlFor="admin-user-email">Email</FieldLabel>
                <Input
                  id="admin-user-email"
                  type="search"
                  placeholder="Filter by email"
                  value={draftEmail}
                  onChange={(event) => setDraftEmail(event.target.value)}
                />
              </Field>
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
            </FieldGroup>
          </form>
          <AdminApiTable
            columns={["User", "Status", "Platform role", "Created", "Actions"]}
            pending={users.isPending}
            failed={users.isError}
            empty={rows.length === 0}
          >
            {rows.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span>
                      {user.display_name ?? user.email}
                      {user.id === currentUserId ? " (you)" : ""}
                    </span>
                    <span className="text-muted-foreground text-xs">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === UserStatus.Active ? "secondary" : "outline"}>{user.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {user.platform_role === PlatformRole.PlatformAdmin ? "Platform Admin" : "Standard user"}
                  </Badge>
                </TableCell>
                <TableCell>{formatTimestamp(user.created_at)}</TableCell>
                <TableCell>
                  <AdminUserActions user={user} currentUserId={currentUserId} enabled={enabled && !users.isFetching} />
                </TableCell>
              </TableRow>
            ))}
          </AdminApiTable>
          <AdminApiPagination
            pagination={users.data?.meta.pagination}
            offset={offset}
            limit={ADMIN_PAGE_SIZE}
            busy={!enabled || users.isFetching || users.isError}
            onPage={setOffset}
          />
        </div>
      </SectionCard>
    </div>
  );
}
