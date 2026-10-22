import type { Metadata } from "next";

import { SignInLinkConfirm } from "../_components/sign-in-link-confirm";

export const metadata: Metadata = {
  title: "Sign in · OpenAI Scientist",
  robots: { index: false, follow: false },
};

export default function VerifySignInLinkPage() {
  return (
    <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center px-4 py-24 sm:px-0">
      <SignInLinkConfirm />
    </div>
  );
}
