import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getAuthenticatedUser } from "@/server/auth";
import { getWorkspaceProject } from "@/server/projects";
import { ProjectRole } from "@/types/enums";

import { ManagerOverview } from "./_components/manager-overview";
import { ResearcherOverview } from "./_components/researcher-overview";
import { ReviewerOverview } from "./_components/reviewer-overview";

export const metadata: Metadata = {
  title: "Project overview · ResearchLab AI",
  description: "Datasets, experiments, and findings for this research workspace.",
};

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getAuthenticatedUser(projectId);

  if (!user) {
    redirect("/auth/login");
  }

  const project = await getWorkspaceProject(projectId);

  if (project.my_role === ProjectRole.ProjectManager || user.role === "SYSTEM_ADMIN") {
    return <ManagerOverview project={project} />;
  }

  return project.my_role === ProjectRole.Reviewer ? (
    <ReviewerOverview project={project} />
  ) : (
    <ResearcherOverview project={project} />
  );
}
