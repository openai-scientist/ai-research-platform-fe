import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getAuthenticatedUser } from "@/server/auth";
import { getWorkspaceProject } from "@/server/projects";

import { ProjectOverview } from "./_components/project-overview";

export const metadata: Metadata = {
  title: "Project overview · OpenAI Scientist",
  description: "Datasets, experiments, and findings for this research workspace.",
};

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getAuthenticatedUser(projectId);

  if (!user) {
    redirect("/auth/login");
  }

  const project = await getWorkspaceProject(projectId);

  if (!project.my_role) redirect("/projects");

  return <ProjectOverview project={project} />;
}
