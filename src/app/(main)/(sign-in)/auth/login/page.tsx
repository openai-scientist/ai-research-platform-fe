import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getRoleHomePath } from "@/lib/auth/auth-config";
import { getAuthenticatedUser } from "@/server/auth";
import { isGoogleSignInAvailable } from "@/server/google-sign-in";

import { EmailSignInForm } from "../_components/email-sign-in-form";
import { GoogleSignInFeedback } from "../_components/social-auth/google-sign-in-feedback";

export const metadata: Metadata = {
  title: "Sign in · OpenAI Scientist",
  description: "Sign in to OpenAI Scientist.",
};

export default async function LoginPage() {
  const user = await getAuthenticatedUser();
  if (user) redirect(getRoleHomePath(user.platform_role));
  const googleSignInAvailable = isGoogleSignInAvailable();
  return (
    <>
      <GoogleSignInFeedback />
      <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center px-4 py-24 sm:px-0">
        <EmailSignInForm googleSignInAvailable={googleSignInAvailable} />
      </div>
    </>
  );
}
