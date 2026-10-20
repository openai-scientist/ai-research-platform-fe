import { TopBarSkeleton } from "../../_components/top-bar-skeleton";
import { ProjectsSkeleton } from "../_components/projects-skeleton";

export default function Loading() {
  return (
    <TopBarSkeleton>
      <ProjectsSkeleton />
    </TopBarSkeleton>
  );
}
