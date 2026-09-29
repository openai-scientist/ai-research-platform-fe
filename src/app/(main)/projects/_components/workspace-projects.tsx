"use client";

import { useState } from "react";

import type { FileManagerFile } from "@/app/(main)/dashboard/file-manager/_components/data";
import type { WorkspaceProject } from "@/lib/projects/project-data";
import { getInitials } from "@/lib/utils";

import { AdminProjects, projectActions } from "../../admin/_components/admin-projects";
import { CreateProjectDialog } from "./create-project-dialog";

function toProjectFile(project: WorkspaceProject): FileManagerFile {
  return {
    actionLabels: projectActions,
    badgeLabel: project.status,
    href: `/projects/${project.id}`,
    icon: "project",
    id: project.id,
    kind: "document",
    kindLabel: project.status,
    modifiedAt: project.updatedAt,
    name: project.name,
    owner: project.ownerName,
    ownerInitials: getInitials(project.ownerName),
    shared: project.memberEmails.length > 1,
    size: `${project.experiments} runs`,
    starred: false,
  };
}

export function WorkspaceProjects({
  canCreate,
  projects,
}: {
  readonly canCreate: boolean;
  readonly projects: readonly WorkspaceProject[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <AdminProjects
        canCreateProject={canCreate}
        onCreateProject={() => setCreateOpen(true)}
        projects={projects.map(toProjectFile)}
      />
      {canCreate && <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </>
  );
}
