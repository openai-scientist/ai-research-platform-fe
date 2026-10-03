import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getRoleHomePath } from "@/lib/auth/auth-config";
import { getAuthenticatedUser } from "@/server/auth";
import { PlatformRole, ProjectRole } from "@/types/enums";

import { TopBarShell } from "../_components/top-bar-shell";
import { ReviewQueue } from "./_components/review-queue";

export const metadata: Metadata = {
  title: "Review queue · ResearchLab AI",
  description: "Findings waiting for review across all research projects.",
};

export default async function Page() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (
    user.platform_role !== PlatformRole.PlatformAdmin &&
    !user.memberships.some((membership) => membership.role === ProjectRole.Reviewer)
  ) {
    redirect(getRoleHomePath(user.role));
  }

  return (
    <TopBarShell homeUrl="/reviews" user={user}>
      <ReviewQueue />
    </TopBarShell>
  );
}
