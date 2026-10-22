import { Skeleton } from "@/components/ui/skeleton";

import { SkeletonStatus } from "../_components/content-skeletons";
import AuthShell from "../auth/_components/auth-shell";
import { AuthHeadingSkeleton, FieldSkeleton } from "../auth/_components/auth-skeletons";

export default function Loading() {
  return (
    <AuthShell>
      <SkeletonStatus
        label="Loading"
        className="mx-auto flex w-full max-w-[350px] flex-col justify-center gap-6 px-4 py-12 sm:px-0"
      >
        <AuthHeadingSkeleton />
        <div className="flex flex-col gap-4">
          <FieldSkeleton />
          <Skeleton className="h-8 w-full" />
          <div className="flex h-8 items-center justify-center">
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </SkeletonStatus>
    </AuthShell>
  );
}
