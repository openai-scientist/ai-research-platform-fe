import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { canCreateProject } from "@/lib/auth/auth-config";
import { getProjectsForUser } from "@/lib/projects/project-data";
import { getAuthenticatedUser } from "@/server/auth";

import { TopBarShell } from "../_components/top-bar-shell";
import { WorkspaceProjects } from "./_components/workspace-projects";

export const metadata: Metadata = {
  title: "Projects · ResearchLab AI",
  description: "Choose a research workspace to continue.",
};

export default async function Page() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <TopBarShell homeUrl="/projects" user={user}>
      <WorkspaceProjects canCreate={canCreateProject(user.role)} projects={getProjectsForUser(user.email)} />
    </TopBarShell>
  );
}
