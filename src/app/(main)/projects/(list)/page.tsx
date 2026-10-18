import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { canCreateProject } from "@/lib/auth/auth-config";
import { getAuthenticatedUser } from "@/server/auth";

import { TopBarShell } from "../../_components/top-bar-shell";
import { GoogleConnectionFeedback } from "../_components/google-connection-feedback";
import { WorkspaceProjects } from "../_components/workspace-projects";

export const metadata: Metadata = {
  title: "Projects · OpenAI Scientist",
  description: "Choose a research workspace to continue.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <TopBarShell homeUrl="/projects" user={user}>
      <GoogleConnectionFeedback />
      <WorkspaceProjects
        canCreate={canCreateProject(user.platform_role)}
        initialInvitationsOpen={params.tab === "invitations"}
      />
    </TopBarShell>
  );
}
