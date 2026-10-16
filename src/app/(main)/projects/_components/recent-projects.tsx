"use client";

import { useCallback, useId, useSyncExternalStore } from "react";

import Link from "next/link";

import { useQueries } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Clock, Folder } from "lucide-react";

import type { FileManagerFile } from "@/app/(main)/dashboard/file-manager/_components/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { shouldRetryApiQuery } from "@/hooks/use-api";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchProject } from "@/lib/api/services/fetch-project";
import {
  getRecentProjectsSnapshot,
  parseRecentProjects,
  RECENT_PROJECTS_CHANGED,
} from "@/lib/projects/recent-projects";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/auth-slice";

import { RecentProjectsSkeleton } from "./projects-skeleton";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_PROJECTS_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_PROJECTS_CHANGED, onChange);
  };
}

export function RecentProjects({ projects }: { projects: FileManagerFile[] }) {
  const userId = useAppSelector(selectUser)?.id ?? "";
  const headingId = useId();
  const getSnapshot = useCallback(() => getRecentProjectsSnapshot(userId), [userId]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const byId = new Map(projects.map((project) => [project.id, project]));
  const visits = parseRecentProjects(snapshot).slice(0, 4);
  const details = useQueries({
    queries: visits.map((visit) => ({
      queryKey: projectKeys.detail(visit.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchProject.getById(visit.id, signal),
      enabled: !byId.has(visit.id),
      retry: shouldRetryApiQuery,
    })),
  });
  const recent = visits.flatMap((visit, index) => {
    const project = byId.get(visit.id);
    if (project?.href) return [{ id: project.id, name: project.name, href: project.href, openedAt: visit.openedAt }];
    const detail = details[index];
    if (!detail.isSuccess) return [];
    return [{ id: visit.id, name: detail.data.data.name, href: `/projects/${visit.id}`, openedAt: visit.openedAt }];
  });
  const isLoading = visits.some((visit, index) => !byId.has(visit.id) && details[index].isPending);

  return (
    <section className="flex flex-col gap-2" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="font-medium text-lg">
          Recent projects
        </h2>
        <span className="text-muted-foreground text-sm">
          {recent.length} {recent.length === 1 ? "project" : "projects"}
        </span>
      </div>
      {isLoading ? (
        <RecentProjectsSkeleton label="Loading recent projects" />
      ) : recent.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recent.map(({ id, name, href, openedAt }) => (
            <Link
              key={id}
              href={href}
              prefetch={false}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card size="sm" className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex min-w-0 items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Folder className="size-4.5" aria-hidden="true" />
                    </span>
                    <span className="truncate" title={name}>
                      {name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                  <time dateTime={new Date(openedAt).toISOString()}>
                    Opened {formatDistanceToNow(openedAt, { addSuffix: true })}
                  </time>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Empty className="min-h-32">
          <EmptyHeader>
            <EmptyTitle>No recently opened projects</EmptyTitle>
            <EmptyDescription>Projects you open will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
