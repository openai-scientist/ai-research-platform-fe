import { Spinner } from "@/components/ui/spinner";

// Shown before any area's own layout is ready, so it stays neutral: each area draws its own skeleton next.
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <Spinner className="size-5 text-muted-foreground" aria-label="Loading page" />
    </div>
  );
}
