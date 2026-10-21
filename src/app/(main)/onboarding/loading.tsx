import { PageSkeleton } from "../_components/page-skeleton";
import AuthShell from "../auth/_components/auth-shell";

export default function Loading() {
  return (
    <AuthShell>
      <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center px-4 py-12 sm:px-0">
        <PageSkeleton layout="form" label="Loading" />
      </div>
    </AuthShell>
  );
}
