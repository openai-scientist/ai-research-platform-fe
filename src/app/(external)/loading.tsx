import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading session" className="flex min-h-dvh items-center justify-center p-4">
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
