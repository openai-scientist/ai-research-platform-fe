import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getRoleHomePath } from "@/lib/auth/auth-config";
import { getAuthenticatedUser } from "@/server/auth";

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
    user.platform_role !== "platform_admin" &&
    !user.memberships.some((membership) => membership.role === "reviewer")
  ) {
    redirect(getRoleHomePath(user.role));
  }

  return (
    <TopBarShell homeUrl="/reviews" user={user}>
      <ReviewQueue />
    </TopBarShell>
  );
}
