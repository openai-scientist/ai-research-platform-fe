import { FileCardsSkeleton, SkeletonStatus } from "@/app/(main)/_components/content-skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const recent = ["first", "second", "third", "fourth"];

/** The projects page: heading and actions, search, recently opened projects, then every project. */
export function ProjectsSkeleton() {
  return (
    <SkeletonStatus label="Loading projects" className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl leading-none tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">Browse research workspaces, activity, and experiment status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <Skeleton className="h-8 w-full md:max-w-lg" />
        <div className="flex flex-1 flex-wrap gap-2 xl:justify-end">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="my-1 h-5 w-36" />
        <RecentProjectsSkeleton />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="my-1 h-5 w-28" />
          <Skeleton className="h-7 w-52" />
        </div>
        <FileCardsSkeleton count={8} />
      </div>
    </SkeletonStatus>
  );
}

/** Recently opened project cards: folder icon and name, then when it was opened. */
export function RecentProjectsSkeleton({ label }: { label?: string }) {
  return (
    <SkeletonStatus label={label} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {recent.map((key) => (
        <Card key={key} size="sm">
          <CardHeader className="flex items-center gap-2">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <Skeleton className="h-4 flex-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3.5 w-32" />
          </CardContent>
        </Card>
      ))}
    </SkeletonStatus>
  );
}
