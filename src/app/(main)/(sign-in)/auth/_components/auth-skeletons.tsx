import { SkeletonStatus } from "@/app/(main)/_components/content-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** The centred title and line under it, as `AuthStepHeading` lays them out: the titles take two lines here. */
export function AuthHeadingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full flex-col items-center gap-1.5 py-0.5">
        <Skeleton className="h-8 w-60 max-w-full" />
        <Skeleton className="h-8 w-44 max-w-full" />
      </div>
      <Skeleton className="h-4 w-56 max-w-full" />
    </div>
  );
}

/** The Google button and the "or continue with email" line under it. */
export function GoogleOptionSkeleton({ label }: { label?: string }) {
  return (
    <SkeletonStatus label={label} className="flex flex-col gap-4">
      <Skeleton className="h-8 w-full" />
      <div className="flex h-4 items-center gap-3">
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-px flex-1" />
      </div>
    </SkeletonStatus>
  );
}

/** One labelled text field. */
export function FieldSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

/** The sign-in page: heading, Google, the email field and its button. */
export function SignInSkeleton() {
  return (
    <SkeletonStatus label="Loading sign-in" className="flex flex-col gap-6">
      <AuthHeadingSkeleton />
      <GoogleOptionSkeleton />
      <div className="flex flex-col gap-4">
        <FieldSkeleton />
        <Skeleton className="h-8 w-full" />
      </div>
    </SkeletonStatus>
  );
}
