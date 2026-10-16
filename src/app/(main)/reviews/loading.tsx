import { TopBarSkeleton } from "../_components/top-bar-skeleton";
import { ReviewQueueSkeleton } from "./_components/review-queue-skeleton";

export default function Loading() {
  return (
    <TopBarSkeleton>
      <ReviewQueueSkeleton />
    </TopBarSkeleton>
  );
}
