import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getRoleHomePath, LOGIN_PATH } from "@/lib/auth/auth-config";
import { getCurrentSession } from "@/server/auth";

import { AuthStepHeading } from "../auth/_components/auth-step-heading";
import { OnboardingForm } from "./_components/onboarding-form";

export const metadata: Metadata = { title: "Welcome · OpenAI Scientist" };

export default async function OnboardingPage() {
  const current = await getCurrentSession();
  if (!current) redirect(LOGIN_PATH);
  if (current.user.onboarded) redirect(getRoleHomePath(current.user.platform_role));
  // A name made from the email (`dat.ngo` from `dat.ngo@...`) is no suggestion; the field starts empty then.
  const suggested = current.user.display_name?.trim() ?? "";
  const fromEmail = suggested.toLowerCase() === current.user.email.split("@")[0].toLowerCase();
  return (
    <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center gap-6 px-4 py-24 sm:px-0">
      <AuthStepHeading title="What should we call you?" description="Your name is shown to the people you work with." />
      <OnboardingForm suggestedName={fromEmail ? "" : suggested} email={current.user.email} />
    </div>
  );
}
