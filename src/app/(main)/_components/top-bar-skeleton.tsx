import { Skeleton } from "@/components/ui/skeleton";

import { PageSkeleton } from "./page-skeleton";

export function TopBarSkeleton({ layout, label }: { layout: "cards" | "table" | "overview"; label: string }) {
  return (
    <div className="min-h-dvh">
      <div aria-hidden="true" className="flex h-12 items-center justify-between gap-4 border-b px-4 lg:px-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <main className="mx-auto w-full max-w-screen-xl p-4 md:p-6">
        <PageSkeleton layout={layout} label={label} />
      </main>
    </div>
  );
}
