import { notFound, redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/server/auth";
import { getWorkspaceProject } from "@/server/projects";

import { WorkspaceSection } from "../../_components/workspace-section";

export default async function Page({ params }: { params: Promise<{ projectId: string; datasetId: string }> }) {
  const { projectId, datasetId } = await params;
  const user = await getAuthenticatedUser(projectId);
  if (!user) redirect("/auth/login");
  const project = await getWorkspaceProject(projectId);
  if (!project) notFound();

  return (
    <WorkspaceSection
      project={project}
      section="dataset-detail"
      datasetId={datasetId}
      isAdmin={user.role === "SYSTEM_ADMIN"}
      userId={user.id}
    />
  );
}
