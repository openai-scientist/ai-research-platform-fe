import { PageSkeleton } from "./_components/page-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">
      <PageSkeleton />
    </main>
  );
}
