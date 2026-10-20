import type { ReactNode } from "react";

import { cn } from "cn";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Announces a loading region once; the placeholder shapes inside carry no text. Without a label it is a plain
 * part of a larger skeleton that announces itself.
 */
export function SkeletonStatus({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn("min-w-0 [&_[data-slot=skeleton]]:motion-reduce:animate-none", className);
  if (!label) return <div className={classes}>{children}</div>;
  return (
    <div role="status" aria-label={label} aria-busy="true" className={classes}>
      {children}
    </div>
  );
}

const keys = (count: number) => Array.from({ length: count }, (_, index) => `placeholder-${index}`);

/** A grid of file or project cards: the preview tile, then its name and date. */
export function FileCardsSkeleton({ count = 4, label }: { count?: number; label?: string }) {
  return (
    <SkeletonStatus label={label} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {keys(count).map((key) => (
        <Card key={key} size="sm">
          <CardContent>
            <Skeleton className="h-36 w-full rounded-lg" />
          </CardContent>
          <CardHeader className="gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </CardHeader>
        </Card>
      ))}
    </SkeletonStatus>
  );
}

/** Rows of a list or table: a name, a longer detail and a short value. */
export function ListRowsSkeleton({ rows = 3, label }: { rows?: number; label?: string }) {
  return (
    <SkeletonStatus label={label} className="flex flex-col divide-y">
      {keys(rows).map((key) => (
        <div key={key} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-20 shrink-0 sm:block" />
        </div>
      ))}
    </SkeletonStatus>
  );
}
