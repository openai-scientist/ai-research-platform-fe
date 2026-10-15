import { notFound, redirect } from "next/navigation";

import { getProjectAccess } from "@/lib/auth/project-access";
import { getAuthenticatedUser } from "@/server/auth";
import { getWorkspaceProject } from "@/server/projects";

import { WorkspaceSection } from "../_components/workspace-section";

const sections: Record<string, { title: string; description: string; managerOnly?: boolean }> = {
  connections: {
    title: "Data Connections",
    description: "Connect the places your research data lives and import it into this project as datasets.",
  },
  datasets: {
    title: "Datasets",
    description: "Upload, version, and download the data used by this project's research runs.",
  },
  files: {
    title: "Documents",
    description: "Share PDF, CSV, and Excel reference documents with this project.",
  },
  experiments: {
    title: "Research flow",
    description: "Start a research run from a topic and follow it stage by stage, up to the hypotheses.",
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

  if (config.managerOnly && !getProjectAccess(project.my_role, project.status).canAccessSettings) {
    redirect(`/projects/${project.id}`);
  }

  const header = (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">{project.name}</p>
      <h1 className="font-heading text-3xl tracking-tight">{config.title}</h1>
      <p className="max-w-3xl text-muted-foreground text-sm">{config.description}</p>
    </div>
  );

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
