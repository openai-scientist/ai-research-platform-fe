import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceSettingsLoading() {
  return (
    <div role="status" aria-label="Loading workspace settings" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function WorkspaceSettingsReload({ onReload, pending }: { onReload: () => void; pending?: boolean }) {
  return (
    <Button variant="outline" disabled={pending} onClick={onReload}>
      Reload data
    </Button>
  );
}
