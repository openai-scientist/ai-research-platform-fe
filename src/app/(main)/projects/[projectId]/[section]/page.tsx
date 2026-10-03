import { notFound, redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/server/auth";
import { getWorkspaceProject } from "@/server/projects";
import { ProjectRole } from "@/types/enums";

import { WorkspaceSection } from "../_components/workspace-section";

const sections: Record<string, { title: string; description: string; managerOnly?: boolean }> = {
  datasets: {
    title: "Datasets",
    description: "Upload, version, and download the data used by this project's research runs.",
  },
  experiments: {
    title: "Experiments",
    description: "Save research context, start research runs, and review their progress and results.",
  },
  findings: {
    title: "Findings",
    description: "Explore sample findings, review outcomes, and manage research details.",
  },
  members: {
    title: "Members",
    description: "See who has access to this workspace and what role they play.",
  },
  settings: {
    title: "Settings",
    description: "Edit project details, manage its lifecycle, and review audit activity.",
    managerOnly: true,
  },
};

export default async function Page({ params }: { params: Promise<{ projectId: string; section: string }> }) {
  const { projectId, section } = await params;
  const user = await getAuthenticatedUser(projectId);

  if (!user) {
    redirect("/auth/login");
  }

  const project = await getWorkspaceProject(projectId);
  const config = Object.hasOwn(sections, section) ? sections[section] : undefined;

  if (!project || !config) {
    notFound();
  }

  if (config.managerOnly && project.my_role !== ProjectRole.ProjectManager && user.role !== "SYSTEM_ADMIN") {
    redirect(`/projects/${project.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">{project.name}</p>
        <h1 className="font-heading text-3xl tracking-tight">{config.title}</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">{config.description}</p>
      </div>
      <WorkspaceSection project={project} section={section} isAdmin={user.role === "SYSTEM_ADMIN"} userId={user.id} />
    </div>
  );
}
