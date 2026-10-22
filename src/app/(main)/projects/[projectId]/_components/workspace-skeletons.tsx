import type { ReactNode } from "react";

import { FileCardsSkeleton, SkeletonStatus } from "@/app/(main)/_components/content-skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { SectionHeader, WORKSPACE_SECTIONS } from "./workspace-sections";

// Each skeleton follows the page it stands in for, so the layout doesn't jump when the content arrives.

const keys = (count: number) => Array.from({ length: count }, (_, index) => `placeholder-${index}`);

/** Saved connection cards: logo, name and target, then the dataset count. */
export function ConnectionCardsSkeleton({ count = 3, label }: { count?: number; label?: string }) {
  return (
    <SkeletonStatus label={label} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {keys(count).map((key) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          </CardHeader>
          <CardContent className="ml-13 flex min-h-8 items-center">
            <Skeleton className="h-5 w-20 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </SkeletonStatus>
  );
}

function ProviderCardsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-8 w-full sm:max-w-64" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {keys(6).map((key) => (
          <div key={key} className="flex items-start gap-3.5 rounded-xl border bg-card p-4">
            <Skeleton className="size-11 shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionsBody() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        <ConnectionCardsSkeleton />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <ProviderCardsSkeleton />
      </div>
    </>
  );
}

/** A bordered table: its toolbar, column headings and rows. */
function TableCardSkeleton({ rows = 5, actions = 2 }: { rows?: number; actions?: number }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 p-4">
        <Skeleton className="h-8 min-w-48 flex-1" />
        {keys(actions).map((key) => (
          <Skeleton key={key} className="h-8 w-28" />
        ))}
      </div>
      <div className="flex items-center gap-4 border-y px-4 py-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="ml-auto hidden h-3.5 w-16 sm:block" />
        <Skeleton className="h-3.5 w-20" />
      </div>
      {keys(rows).map((key) => (
        <div key={key} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
          <Skeleton className="size-4 shrink-0" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="ml-auto hidden h-4 w-16 sm:block" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function DatasetsBody() {
  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="p-3">
          <div className="flex items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-4">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-3 w-80 max-w-full" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
      <TableCardSkeleton />
    </>
  );
}

function DocumentsBody() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Skeleton className="h-3.5 w-80 max-w-full" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Skeleton className="h-8 w-full sm:w-72" />
          <Skeleton className="h-8 w-full sm:w-36" />
        </div>
        <Skeleton className="ml-auto h-7 w-52" />
      </div>
      <FileCardsSkeleton />
    </div>
  );
}

/** People in a list: avatar, name and email, role, date. */
function PeopleRows({ rows }: { rows: number }) {
  return keys(rows).map((key) => (
    <div key={key} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-52 max-w-full" />
      </div>
      <Skeleton className="hidden h-7 w-28 sm:block" />
      <Skeleton className="hidden h-4 w-24 md:block" />
    </div>
  ));
}

function MembersBody() {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-4 py-3">
        <div className="flex h-8 items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="grid w-full gap-2 sm:flex sm:w-auto">
          <Skeleton className="h-8 w-full sm:w-64" />
          <Skeleton className="h-8 w-full sm:w-40" />
        </div>
      </div>
      <PeopleRows rows={4} />
    </div>
  );
}

function SettingsBody() {
  return (
    <div className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
      <div className="flex gap-1 overflow-hidden lg:hidden">
        {keys(4).map((key) => (
          <Skeleton key={key} className="h-8 w-24 shrink-0" />
        ))}
      </div>
      <div className="hidden flex-col gap-5 lg:flex">
        {[2, 4, 2].map((count, group) => (
          <div key={keys(3)[group]} className="flex flex-col gap-2 px-2.5">
            <Skeleton className="h-3 w-16" />
            {keys(count).map((key) => (
              <Skeleton key={key} className="h-5 w-28" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex min-w-0 max-w-3xl flex-col gap-6">
        <Skeleton className="h-6 w-24" />
        {[2, 3].map((count, group) => (
          <div key={keys(2)[group]} className="flex flex-col gap-2">
            {group > 0 && <Skeleton className="h-3 w-16" />}
            <div className="divide-y rounded-xl border bg-card">
              {keys(count).map((key) => (
                <div key={key} className="grid gap-x-8 gap-y-2.5 px-5 py-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
                  <Skeleton className="h-4 w-24 sm:mt-2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The research flow: the topic composer, then earlier runs. */
export function ExperimentsSkeleton() {
  return (
    <SkeletonStatus label="Loading research flow" className="flex flex-col gap-6">
      <SectionHeader section="experiments" />
      <div className="flex min-w-0 flex-col gap-5">
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex flex-col gap-5 p-5 md:p-6">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-7 w-3/4" />
            <div className="grid gap-5 md:grid-cols-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Skeleton className="h-3.5 w-64 max-w-full" />
              <Skeleton className="h-9 w-40" />
            </div>
          </div>
          <div className="flex flex-col gap-3.5 border-t bg-muted/45 px-5 py-4.5 md:px-6">
            <Skeleton className="h-3 w-28" />
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {keys(3).map((key) => (
                <div key={key} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5">
                  <Skeleton className="size-[22px] rounded-full" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="h-5 w-24" />
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {keys(3).map((key) => (
            <div key={key} className="flex items-center gap-4 border-b px-4.5 py-3.5 last:border-0">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="hidden h-3 w-20 md:block" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonStatus>
  );
}

const BODIES: Record<string, ReactNode> = {
  datasets: <DatasetsBody />,
  settings: <SettingsBody />,
};

/** One section of the project, under its real heading. */
export function SectionSkeleton({ section }: { section: string | undefined }) {
  const known = section !== undefined && Object.hasOwn(WORKSPACE_SECTIONS, section);
  if (section === "experiments") return <ExperimentsSkeleton />;
  const header = known ? <SectionHeader section={section} /> : <Skeleton className="h-9 w-48" />;
  const label = known ? `Loading ${WORKSPACE_SECTIONS[section].title.toLowerCase()}` : "Loading page";

  if (section === "connections")
    return (
      <SkeletonStatus label={label} className="flex flex-col gap-10">
        {header}
        <ConnectionsBody />
      </SkeletonStatus>
    );
  if (section === "files" || section === "members")
    return (
      <SkeletonStatus label={label} className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {header}
          <Skeleton className="h-8 w-36" />
        </div>
        {section === "files" ? <DocumentsBody /> : <MembersBody />}
      </SkeletonStatus>
    );
  return (
    <SkeletonStatus label={label} className="flex flex-col gap-6">
      {header}
      {(section && BODIES[section]) ?? <TableCardSkeleton />}
    </SkeletonStatus>
  );
}

/** The project overview: heading and actions, the KPI strip, then its cards. */
export function OverviewSkeleton() {
  return (
    <SkeletonStatus label="Loading project overview" className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
      <div className="grid divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
        {keys(4).map((key) => (
          <div key={key} className="flex flex-col gap-4 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      {["h-80", "h-72"].map((height) => (
        <div key={height} className="grid gap-4 xl:grid-cols-3">
          <Skeleton className={`${height} w-full rounded-xl xl:col-span-2`} />
          <Skeleton className={`${height} w-full rounded-xl`} />
        </div>
      ))}
      <Skeleton className="h-64 w-full rounded-xl" />
    </SkeletonStatus>
  );
}

/** A dataset page below its breadcrumb: name and versions, actions, then the preview table. */
export function DatasetBodySkeleton({ label }: { label?: string }) {
  return (
    <SkeletonStatus label={label} className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="my-2.5 h-4 w-72 max-w-full" />
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex gap-6 border-b px-4 py-3">
            {keys(5).map((key) => (
              <Skeleton key={key} className="h-3.5 flex-1" />
            ))}
          </div>
          {keys(8).map((key) => (
            <div key={key} className="flex gap-6 border-b px-4 py-3 last:border-0">
              {keys(5).map((cell) => (
                <Skeleton key={cell} className="h-3.5 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonStatus>
  );
}

export function DatasetDetailSkeleton() {
  return (
    <SkeletonStatus label="Loading dataset" className="flex flex-col gap-6">
      <Skeleton className="h-5 w-64 max-w-full" />
      <DatasetBodySkeleton />
    </SkeletonStatus>
  );
}
