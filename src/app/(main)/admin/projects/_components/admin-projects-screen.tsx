"use client";

import { type ReactNode, useEffect, useState } from "react";

import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectUsageQuery } from "@/hooks/use-admin-query";
import type { TimeRangeParams } from "@/lib/api/types";

import { toTimeRange } from "../../_components/admin-api-utils";
import { AdminPageHeader } from "../../_components/admin-primitives";
import { AdminTimeFilters } from "../../_components/admin-time-filters";
import { useAdminAccess } from "../../_components/use-admin-access";
import { ProjectCard, ProjectCardSkeleton } from "./project-card";

const PAGE_SIZES = [12, 24, 48];

/** Projects as the platform sees them: usage metadata only. Admins do not open a project's research. */
export function AdminProjectsScreen() {
  const { enabled } = useAdminAccess();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [range, setRange] = useState<TimeRangeParams>({});
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const usage = useProjectUsageQuery({ q: query || undefined, ...range, limit, offset }, { enabled });
  const projects = usage.data?.data ?? [];
  const total = usage.data?.meta.pagination?.total;
  const waiting = search.trim() !== query;
  const loading = usage.isPending && enabled;
  const pageCount = Math.max(1, Math.ceil((total ?? 0) / limit));
  const page = Math.min(Math.floor(offset / limit) + 1, pageCount);
  const busy = !enabled || waiting || usage.isFetching || usage.isError;

  let body: ReactNode = null;
  if (loading) {
    body = (
      <div role="status" aria-label="Loading projects" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    );
  } else if (projects.length > 0) {
    body = (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Projects">
        {projects.map((project) => (
          <li key={project.project_id} className="min-w-0">
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    );
  } else if (!usage.isError) {
    body = (
      <Empty className="min-h-64 border" role="status">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No projects match</EmptyTitle>
          <EmptyDescription>Try another name or a wider time range.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <AdminPageHeader
        eyebrow="Management"
        title="Projects"
        description="Usage metadata for every project. Admins do not open a project's content."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects…"
          aria-label="Search projects by name"
          maxLength={120}
          className="w-full sm:w-64"
        />
        <AdminTimeFilters
          prefix="projects"
          compact
          from={from}
          to={to}
          onChange={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
            try {
              setRange(toTimeRange(nextFrom, nextTo));
              setOffset(0);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Check the time range and try again.");
            }
          }}
        />
        {usage.isError && (
          <Button variant="outline" disabled={usage.isFetching} onClick={() => void usage.refetch()}>
            Retry
          </Button>
        )}
      </div>

      {body}

      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span id="projects-page-size" className="font-medium text-sm">
            Per page
          </span>
          <Select
            value={String(limit)}
            disabled={busy}
            onValueChange={(value) => {
              setLimit(Number(value));
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-20" aria-labelledby="projects-page-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <span className="font-medium text-sm" aria-live="polite">
          {total === undefined ? "Projects not loaded" : `Page ${page} of ${pageCount}`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Go to previous page"
            disabled={busy || page === 1}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Go to next page"
            disabled={busy || total === undefined || page >= pageCount}
            onClick={() => setOffset(offset + limit)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
