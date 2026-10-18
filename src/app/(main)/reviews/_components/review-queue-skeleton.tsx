import { ListRowsSkeleton, SkeletonStatus } from "@/app/(main)/_components/content-skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const filters = ["project", "from", "through"];

/** The review queue: heading, filters, then a card of results for a reviewer project. */
export function ReviewQueueSkeleton() {
  return (
    <SkeletonStatus label="Loading review queue" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight">Review queue</h1>
        <p className="text-muted-foreground text-sm">Read results and share feedback across your reviewer projects.</p>
      </div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
        {filters.map((key) => (
          <div key={key} className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
        <Skeleton className="h-8 w-28 shrink-0" />
      </div>
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent>
          <ListRowsSkeleton rows={4} />
        </CardContent>
      </Card>
    </SkeletonStatus>
  );
}
