import { notFound, redirect } from "next/navigation";

import type { Metadata } from "next";

import { findProjectForUser } from "@/lib/projects/project-data";
import { getAuthenticatedUser } from "@/server/auth";

import { ManagerOverview } from "./_components/manager-overview";
import { ProjectOverview } from "./_components/project-overview";

export const metadata: Metadata = {
  title: "Project overview · ResearchLab AI",
  description: "Datasets, experiments, and findings for this research workspace.",
};

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }, user] = await Promise.all([params, getAuthenticatedUser()]);

  if (!user) {
    redirect("/auth/v2/login");
  }

  const project = findProjectForUser(projectId, user.email);

  if (!project) {
    notFound();
  }

  // A new project has no research state yet, so everyone gets the onboarding overview first.
  if (user.role === "PROJECT_MANAGER" && project.experiments > 0) {
    return <ManagerOverview project={project} />;
  }

  return <ProjectOverview project={project} />;
}
