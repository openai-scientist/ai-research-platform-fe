"use client";

import type { ReactNode } from "react";

import { ArrowRight } from "lucide-react";

import { DataTable, type DataTablePagination } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { useUsersQuery } from "@/hooks/use-admin-query";
import { useProjectsQuery } from "@/hooks/use-projects-query";
import type { AuditItem } from "@/lib/api/services/fetch-admin";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/auth-slice";
import { UserStatus } from "@/types/enums";

import { formatTimestamp } from "../../_components/admin-api-utils";
import { AuditDetails } from "./audit-details";
import { auditTitle, auditTransition, readableValue } from "./audit-presentation";

export function AuditChange({ item }: { item: AuditItem }) {
  const change = auditTransition(item);
  if (!change) return null;
  return (
    <div className="flex flex-col gap-1.5 text-xs xl:flex-row xl:items-center xl:gap-2">
      <span className="text-muted-foreground">{change.label}</span>
      <span className="inline-flex w-fit items-center gap-2">
        <Badge variant="outline">{readableValue(change.before)}</Badge>
        <ArrowRight className="size-3 text-muted-foreground" aria-label="changed to" />
        <Badge
          variant={change.after === UserStatus.Suspended || change.after === "Removed" ? "destructive" : "secondary"}
          className={
            change.after === UserStatus.Suspended || change.after === "Removed"
              ? "text-red-700 dark:text-red-300"
              : undefined
          }
        >
          {readableValue(change.after)}
        </Badge>
      </span>
    </div>
  );
}

export function AdminAuditActivity({
  rows,
  pending,
  failed,
  enabled,
  toolbar,
  pagination,
}: {
  rows: AuditItem[];
  pending: boolean;
  failed: boolean;
  enabled: boolean;
  toolbar: ReactNode;
  pagination: DataTablePagination;
}) {
  const currentUser = useAppSelector(selectUser);
  const users = useUsersQuery(
    { limit: 100, offset: 0 },
    {
      enabled: enabled && rows.some((item) => item.actor_user_id || item.resource_type === "user"),
    },
  );
  const projects = useProjectsQuery(
    { limit: 100, offset: 0, include_archived: true },
    {
      enabled: enabled && rows.some((item) => item.project_id || item.resource_type === "project"),
    },
  );
  const userDirectory = new Map(users.data?.data.map((user) => [user.id, user]));
  const userNames = new Map(users.data?.data.map((user) => [user.id, user.display_name?.trim() || user.email]));
  if (currentUser) userNames.set(currentUser.id, currentUser.display_name?.trim() || currentUser.email);
  const projectNames = new Map(projects.data?.data.map((project) => [project.id, project.name]));
  const userName = (id: string) => userNames.get(id) ?? `User ${id.slice(0, 8)}`;
  const projectName = (id: string) => projectNames.get(id) ?? `Project ${id.slice(0, 8)}`;
  const actorName = (item: AuditItem) => (item.actor_user_id ? userName(item.actor_user_id) : "System");
  const subjectName = (item: AuditItem) => {
    if (item.resource_type === "user") return userName(item.resource_id);
    if (item.resource_type === "project") return projectName(item.resource_id);
    return `${readableValue(item.resource_type)} ${item.resource_id.slice(0, 8)}`;
  };

  return (
    <DataTable
      rows={rows}
      getRowId={(item) => item.id}
      pending={pending}
      failed={failed}
      toolbar={toolbar}
      pagination={pagination}
      columns={[
        {
          id: "activity",
          label: "Activity",
          hideable: false,
          cell: (item) => (
            <div className="flex flex-col gap-2">
              <span className="font-medium">{auditTitle(item)}</span>
              <AuditChange item={item} />
            </div>
          ),
        },
        {
          id: "actor",
          label: "Performed by",
          cell: (item) => (
            <div className="flex flex-col gap-1">
              <span>{actorName(item)}</span>
              {item.actor_user_id && (
                <span className="text-muted-foreground text-xs">
                  {userDirectory.get(item.actor_user_id)?.email ??
                    (currentUser?.id === item.actor_user_id ? currentUser.email : undefined)}
                </span>
              )}
            </div>
          ),
        },
        {
          id: "subject",
          label: "Affected resource",
          cell: (item) => (
            <div className="flex flex-col gap-1">
              <span className="font-medium">{subjectName(item)}</span>
              <span className="text-muted-foreground text-xs">
                {item.resource_type === "user"
                  ? userDirectory.get(item.resource_id)?.email
                  : readableValue(item.resource_type)}
              </span>
              {item.project_id && item.resource_type !== "project" && (
                <span className="text-muted-foreground text-xs">{projectName(item.project_id)}</span>
              )}
            </div>
          ),
        },
        {
          id: "created",
          label: "Created",
          cell: (item) => <time dateTime={item.created_at}>{formatTimestamp(item.created_at)}</time>,
        },
        {
          id: "actions",
          label: "Actions",
          align: "right",
          cell: (item) => (
            <div className="flex justify-end">
              <AuditDetails
                item={item}
                actor={actorName(item)}
                subject={subjectName(item)}
                actorEmail={
                  item.actor_user_id
                    ? (userDirectory.get(item.actor_user_id)?.email ??
                      (currentUser?.id === item.actor_user_id ? currentUser.email : undefined))
                    : undefined
                }
                subjectEmail={item.resource_type === "user" ? userDirectory.get(item.resource_id)?.email : undefined}
                project={item.project_id ? projectName(item.project_id) : undefined}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
