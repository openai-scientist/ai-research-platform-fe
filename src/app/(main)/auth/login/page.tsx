import Link from "next/link";
import { redirect } from "next/navigation";

import { Globe } from "lucide-react";
import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { getRoleHomePath } from "@/lib/auth/auth-config";
import { getAuthenticatedUser } from "@/server/auth";
import { isGoogleSignInAvailable } from "@/server/google-sign-in";

import { LoginForm } from "../_components/login-form";
import { GoogleSignInFeedback } from "../_components/social-auth/google-sign-in-feedback";

export const metadata: Metadata = {
  title: "Login · ResearchLab AI",
  description: "Sign in to the ResearchLab AI AI Research Experimentation Platform.",
};

export default async function LoginPage() {
  const user = await getAuthenticatedUser();
  if (user) redirect(getRoleHomePath(user.role));
  const googleSignInAvailable = isGoogleSignInAvailable();
  return (
    <>
      <GoogleSignInFeedback />
      <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center px-4 py-24 sm:px-0">
        <LoginForm googleSignInAvailable={googleSignInAvailable} />
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          Don&apos;t have an account?{" "}
          <Link prefetch={false} className="text-foreground" href="/auth/register">
            Register
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  );
}
