import { Skeleton } from "@/components/ui/skeleton";

export function ConnectionOptionsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2 p-3">
      {["first", "second", "third"].map((key) => (
        <div key={key} aria-hidden="true" className="flex min-h-8 items-center gap-2">
          <Skeleton className="size-4 shrink-0" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
