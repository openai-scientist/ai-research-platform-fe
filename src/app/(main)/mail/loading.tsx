import { PageSkeleton } from "../_components/page-skeleton";

export default function Loading() {
  return (
    <div className="p-4">
      <PageSkeleton layout="split" label="Loading mail" />
    </div>
  );
}
