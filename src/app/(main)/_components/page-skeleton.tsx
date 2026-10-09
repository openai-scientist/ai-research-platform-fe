import { Skeleton } from "@/components/ui/skeleton";

const placeholders = ["first", "second", "third", "fourth"];

export function PageSkeleton({
  layout = "overview",
  heading = true,
  label = "Loading page",
}: {
  layout?: "overview" | "cards" | "table" | "form" | "split";
  heading?: boolean;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className="min-w-0 [&_[data-slot=skeleton]]:motion-reduce:animate-none"
    >
      <div aria-hidden="true" className="flex min-w-0 flex-col gap-6">
        {heading && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <Skeleton className="h-8 w-48 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            {layout !== "form" && <Skeleton className="h-8 w-28" />}
          </div>
        )}
        {layout === "form" ? (
          <div className="flex flex-col gap-5">
            {placeholders.slice(0, 3).map((key) => (
              <div key={key} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-full" />
          </div>
        ) : layout === "cards" ? (
          <>
            <Skeleton className="h-8 w-full sm:w-80" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {placeholders.map((key) => (
                <div key={key} className="flex flex-col gap-4 rounded-xl border bg-card p-5">
                  <Skeleton className="size-10 rounded-lg" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : layout === "table" ? (
          <div className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-8 w-full sm:w-64" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-28" />
            </div>
            <Skeleton className="h-10 w-full" />
            {placeholders.map((key) => (
              <div key={key} className="grid grid-cols-3 items-center gap-4 border-b py-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-40" />
            </div>
          </div>
        ) : layout === "split" ? (
          <div className="grid min-h-80 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
              <Skeleton className="h-8 w-full" />
              {placeholders.map((key) => (
                <Skeleton key={key} className="h-16 w-full" />
              ))}
            </div>
            <div className="hidden flex-col gap-5 rounded-xl border bg-card p-5 md:flex">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="min-h-48 w-full flex-1" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {placeholders.map((key) => (
                <div key={key} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
              <Skeleton className="h-72 w-full rounded-xl" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
