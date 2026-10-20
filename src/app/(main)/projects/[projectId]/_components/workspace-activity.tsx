"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { History, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfinityScroll } from "@/hooks/use-infinity-scroll";
import { workspaceKeys } from "@/lib/api/query-keys";
import {
  type ActivityCategory,
  type ActivityParams,
  fetchWorkspaceSettings,
  type ProjectActivity,
} from "@/lib/api/services/fetch-workspace-settings";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { researchRunUrl } from "@/lib/research-workspace";
import { getInitials } from "@/lib/utils";

import { ActivityDateFilters, type ActivityDates } from "./activity-date-filters";
import { projectDayBoundary } from "./activity-date-range";
import { WorkspaceSettingsLoading, WorkspaceSettingsReload } from "./workspace-settings-state";

const CATEGORIES: Record<ActivityCategory, string> = {
  research: "Research",
  data: "Data",
  members: "Members",
  settings: "Settings",
};
const ACTIONS: Record<string, string> = {
  "run.created": "created a research run",
  "run.completed": "completed a research run",
  "run.failed": "had a research run fail",
  "run.stopped": "stopped a research run",
  "run.awaiting_review": "requested a review",
  "run.paused": "paused a research run",
  "run.resumed": "resumed a research run",
  "run.abandoned": "abandoned a research run",
  "run.gate_answered": "answered a research gate",
  "review.submitted": "submitted a review",
  "run.decision.answer_gate": "answered a research gate",
  "run.decision.approve": "approved a research decision",
  "run.decision.comment": "commented on a research decision",
  "run.decision.accept": "accepted research results",
  "run.decision.send_back": "sent research results back",
  "run.decision.rerun": "requested a rerun",
  "run.decision.stop": "requested a run to stop",
  "comment.created": "added a comment",
  "comment.deleted": "deleted a comment",
  "dataset.created": "added a dataset",
  "dataset.version_added": "added a dataset version",
  "dataset.updated": "updated a dataset",
  "dataset.deleted": "deleted a dataset",
  "file.uploaded": "uploaded a document",
  "file.deleted": "deleted a document",
  "connection.created": "added a data connection",
  "connection.renamed": "renamed a data connection",
  "connection.reauthorized": "reauthorized a data connection",
  "connection.import_started": "started a data import",
  "connection.deleted": "deleted a data connection",
  "member.invited": "invited a member",
  "member.invite_resent": "resent an invitation",
  "member.invite_declined": "declined an invitation",
  "member.invite_cancelled": "cancelled an invitation",
  "member.joined": "joined the project",
  "member.role_changed": "changed a member's role",
  "member.removed": "removed a member",
  "project.ownership_transferred": "transferred project ownership",
  "settings.updated": "changed project settings",
  "project.updated": "updated the project",
  "project.archived": "archived the project",
  "project.restored": "restored the project",
  "project.completed": "completed the project",
  "project.reopened": "reopened the project",
  "integration.created": "connected a channel",
  "integration.updated": "updated an integration",
  "integration.deleted": "disconnected a channel",
  "integration.auto_disabled": "automatically disabled an integration",
};

function resourceHref(event: ProjectActivity) {
  const { resource, project_id } = event;
  if (!resource.available || !resource.id) return null;
  const base = `/projects/${encodeURIComponent(project_id)}`;
  switch (resource.type) {
    case "research_run":
      return researchRunUrl(project_id, resource.id);
    case "dataset":
      return `${base}/datasets/${encodeURIComponent(resource.id)}`;
    case "project_integration":
      return `${base}/settings?tab=integrations`;
    case "project":
      return base;
    default:
      return null;
  }
}

function changeValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(changeValue).join(", ");
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return "—";
}

export function WorkspaceActivity({ projectId, timezone }: { projectId: string; timezone: string }) {
  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const [dates, setDates] = useState<ActivityDates>({});
  const dateParams = useMemo(
    () => ({
      from: dates.from ? projectDayBoundary(dates.from, timezone) : undefined,
      // API `to` is exclusive; include the whole To date by using the next day's start.
      to: dates.to ? projectDayBoundary(dates.to, timezone, true) : undefined,
    }),
    [dates.from, dates.to, timezone],
  );
  const query = useInfinityScroll<ProjectActivity, ActivityParams>({
    queryKey: workspaceKeys.activity(projectId),
    filters: { ...dateParams, ...(category === "all" ? {} : { category }) },
    pageSize: 50,
    fetchPage: (params, signal) => fetchWorkspaceSettings.activity(projectId, params, signal),
  });
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
  const groups = new Map<string, ProjectActivity[]>();
  for (const event of query.items) {
    const day = formatter.format(new Date(event.created_at));
    const group = groups.get(day);
    if (group) group.push(event);
    else groups.set(day, [event]);
  }
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold text-lg">Activity</h2>
          <p className="text-muted-foreground text-sm">Recorded activity in this project · {timezone}</p>
        </div>
        <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {query.totalItems === null ? "Project history" : `${query.totalItems} recorded events`}
        </p>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <ActivityDateFilters
            value={dates}
            onChange={(next) => {
              if (next.from && next.to && next.from > next.to) {
                toast.error("The From date must be on or before the To date.");
                return;
              }
              setDates(next);
            }}
          />
          <Select value={category} onValueChange={(value) => setCategory(value as ActivityCategory | "all")}>
            <SelectTrigger aria-label="Filter activity" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All activity</SelectItem>
                {Object.entries(CATEGORIES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      {query.isPending ? (
        <WorkspaceSettingsLoading />
      ) : query.isError && !query.data ? (
        <WorkspaceSettingsReload pending={query.isFetching} onReload={() => void query.refetch()} />
      ) : query.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <History />
            </EmptyMedia>
            <EmptyTitle>No recorded activity</EmptyTitle>
            <EmptyDescription>
              {dates.from || dates.to
                ? "No recorded events match these date filters. Try another date range or clear the dates."
                : category === "all"
                  ? "Activity will appear here as project events are recorded. Older events may not have been captured."
                  : "No recorded events match this category."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        Array.from(groups, ([day, events]) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle>{day}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="divide-y">
                {events.map((event) => {
                  const href = resourceHref(event);
                  return (
                    <li key={event.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                      <Avatar className="size-9 shrink-0">
                        <AvatarImage
                          src={resolveAvatarUrl(event.actor.avatar_url)}
                          alt=""
                          crossOrigin="use-credentials"
                        />
                        <AvatarFallback>{getInitials(event.actor.display_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="break-words text-sm">
                          <span className="font-medium">{event.actor.display_name}</span>{" "}
                          <span className="text-muted-foreground">{ACTIONS[event.action] ?? event.summary}</span>
                        </p>
                        {href ? (
                          <Link href={href} className="break-words text-sm underline-offset-4 hover:underline">
                            {event.resource.display_name}
                          </Link>
                        ) : (
                          <p className="break-words text-sm">{event.resource.display_name}</p>
                        )}
                        {event.changes.length > 0 && (
                          <ul className="flex flex-col gap-1 pt-1 text-muted-foreground text-xs">
                            {event.changes.map((change) => (
                              <li key={change.field} className="break-words">
                                {change.field}:{" "}
                                {change.before === null && change.after === null
                                  ? "Changed"
                                  : `${changeValue(change.before)} → ${changeValue(change.after)}`}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Badge variant="secondary">{CATEGORIES[event.category]}</Badge>
                          <time dateTime={event.created_at} className="text-muted-foreground text-xs tabular-nums">
                            {time.format(new Date(event.created_at))}
                          </time>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        ))
      )}
      {query.hasNextPage && (
        <Button variant="outline" disabled={query.isFetching} onClick={() => void query.loadMore()}>
          {query.isFetchingNextPage ? "Loading…" : "Load more activity"}
        </Button>
      )}
      {query.isError && query.data && !query.hasNextPage && (
        <WorkspaceSettingsReload pending={query.isFetching} onReload={() => void query.refetch()} />
      )}
    </section>
  );
}
