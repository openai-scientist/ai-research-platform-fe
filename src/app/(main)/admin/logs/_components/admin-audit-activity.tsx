"use client";

import { ArrowRight } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsersQuery } from "@/hooks/use-admin-query";
import { useProjectsQuery } from "@/hooks/use-projects-query";
import type { AuditItem } from "@/lib/api/services/fetch-admin";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/auth-slice";
import { UserStatus } from "@/types/enums";

import { AuditDetails } from "./audit-details";
import { auditTitle, auditTransition, dateParts, readableValue } from "./audit-presentation";

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
}: {
  rows: AuditItem[];
  pending: boolean;
  failed: boolean;
  enabled: boolean;
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
  const groups = new Map<string, AuditItem[]>();
  for (const item of rows) {
    const day = dateParts(item.created_at).day;
    const group = groups.get(day) ?? [];
    group.push(item);
    groups.set(day, group);
  }

  if (pending)
    return (
      <div role="status" aria-label="Loading activity" className="space-y-3 border-t pt-4">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-20 w-full" />
        ))}
      </div>
    );
  if (failed) return null;
  if (!rows.length)
    return (
      <Empty className="border-t">
        <EmptyHeader>
          <EmptyTitle>No activity found</EmptyTitle>
          <EmptyDescription>Try another project, action, or date range.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <section className="border-t" aria-label="Platform activity">
      {Array.from(groups, ([day, items]) => (
        <section key={day} aria-label={day}>
          <h3 className="flex flex-wrap items-center gap-2 bg-muted/40 px-3 py-2 font-medium text-xs">
            {day}
            <span className="font-normal text-muted-foreground">{items.length} events on this page</span>
          </h3>
          <ul className="divide-y">
            {items.map((item) => {
              const actor = item.actor_user_id ? userName(item.actor_user_id) : "System";
              let subject = `${readableValue(item.resource_type)} ${item.resource_id.slice(0, 8)}`;
              if (item.resource_type === "user") {
                subject = userName(item.resource_id);
              } else if (item.resource_type === "project") {
                subject = projectName(item.resource_id);
              }
              const initials = actor.startsWith("User ")
                ? "U"
                : actor
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase();
              return (
                <li
                  key={item.id}
                  className="grid gap-3 px-3 py-4 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,0.8fr)_minmax(0,2fr)_auto] lg:items-center lg:gap-6"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar aria-hidden="true">
                      <AvatarFallback className="text-foreground">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                      <p className="text-muted-foreground text-xs">Performed by</p>
                      <p className="break-words text-sm [overflow-wrap:anywhere]">{actor}</p>
                    </div>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-muted-foreground text-xs">
                      Affected {readableValue(item.resource_type).toLowerCase()}
                    </p>
                    <p className="break-words font-medium text-sm [overflow-wrap:anywhere]">{subject}</p>
                    {item.resource_type === "user" && userDirectory.get(item.resource_id)?.email && (
                      <p className="break-words text-muted-foreground text-xs [overflow-wrap:anywhere]">
                        {userDirectory.get(item.resource_id)?.email}
                      </p>
                    )}
                    {item.project_id && item.resource_type !== "project" && (
                      <p className="break-words text-muted-foreground text-xs">{projectName(item.project_id)}</p>
                    )}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <p className="font-medium text-sm">{auditTitle(item)}</p>
                    <AuditChange item={item} />
                  </div>
                  <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-1">
                    <time dateTime={item.created_at} className="text-muted-foreground text-xs">
                      {dateParts(item.created_at).time}
                    </time>
                    <AuditDetails
                      item={item}
                      actor={actor}
                      subject={subject}
                      actorEmail={
                        item.actor_user_id
                          ? (userDirectory.get(item.actor_user_id)?.email ??
                            (currentUser?.id === item.actor_user_id ? currentUser.email : undefined))
                          : undefined
                      }
                      subjectEmail={
                        item.resource_type === "user" ? userDirectory.get(item.resource_id)?.email : undefined
                      }
                      project={item.project_id ? projectName(item.project_id) : undefined}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}
