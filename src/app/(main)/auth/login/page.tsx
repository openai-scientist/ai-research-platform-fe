import { redirect } from "next/navigation";

import { Globe } from "lucide-react";
import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
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

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="flex flex-col gap-0.5 text-sm">
          <span>{APP_CONFIG.copyright}</span>
          <span className="text-muted-foreground text-xs">{APP_CONFIG.independence}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  );
}
