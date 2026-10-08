import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getRoleHomePath, LOGIN_PATH } from "@/lib/auth/auth-config";
import { getCurrentSession } from "@/server/auth";

import AuthShell from "../auth/_components/auth-shell";
import { AuthStepHeading } from "../auth/_components/auth-step-heading";
import { RequiredPasswordForm } from "./_components/required-password-form";

export const metadata: Metadata = { title: "Change password · ResearchLab AI" };

export default async function ChangePasswordPage() {
  const current = await getCurrentSession();
  if (!current) redirect(LOGIN_PATH);
  if (!current.user.must_change_password) redirect(getRoleHomePath(current.user.platform_role));
  return (
    <AuthShell>
      <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center gap-6 px-4 py-12 sm:px-0">
        <AuthStepHeading title="Change your password" description="Set a new password to continue to your workspace." />
        <RequiredPasswordForm />
      </div>
    </AuthShell>
  );
}
