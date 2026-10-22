import { SignInSkeleton } from "./_components/auth-skeletons";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center px-4 py-24 sm:px-0">
      <SignInSkeleton />
    </div>
  );
}
