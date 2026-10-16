import { notFound, redirect } from "next/navigation";

import { getProjectAccess } from "@/lib/auth/project-access";
import { getAuthenticatedUser } from "@/server/auth";
import { getWorkspaceProject } from "@/server/projects";

import { WorkspaceSection } from "../_components/workspace-section";
import { SectionHeader, WORKSPACE_SECTIONS } from "../_components/workspace-sections";

export default async function Page({ params }: { params: Promise<{ projectId: string; section: string }> }) {
  const { projectId, section } = await params;
  const user = await getAuthenticatedUser(projectId);

  if (!user) {
    redirect("/auth/login");
  }

  const project = await getWorkspaceProject(projectId);
  const config = Object.hasOwn(WORKSPACE_SECTIONS, section) ? WORKSPACE_SECTIONS[section] : undefined;

  if (!project || !config) {
    notFound();
  }

  if (config.managerOnly && !getProjectAccess(project.my_role, project.status).canAccessSettings) {
    redirect(`/projects/${project.id}`);
  }

  const header = <SectionHeader section={section} />;

  return (
    <div className="flex flex-col gap-6">
      {section !== "members" && section !== "connections" && section !== "files" && header}
      <WorkspaceSection
        project={project}
        section={section}
        userId={user.id}
        membersHeader={section === "members" ? header : undefined}
        connectionsHeader={section === "connections" ? header : undefined}
        filesHeader={section === "files" ? header : undefined}
      />
    </div>
  );
}
