"use client";

import { useState } from "react";

import type { FileManagerFile } from "@/app/(main)/dashboard/file-manager/_components/data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteProjects } from "@/hooks/use-projects-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/project-status";
import { getInitials } from "@/lib/utils";

import { AdminProjects, projectActions } from "../../admin/_components/admin-projects";
import { CreateProjectDialog } from "./create-project-dialog";

function toProjectFile(project: ProjectItem): FileManagerFile {
  return {
    actionLabels: projectActions,
    badgeLabel: PROJECT_STATUS_LABELS[project.status],
    href: `/projects/${project.id}`,
    icon: "project",
    id: project.id,
    kind: "document",
    kindLabel: PROJECT_STATUS_LABELS[project.status],
    modifiedAt: new Date(project.updated_at).toLocaleDateString("en-US"),
    name: project.name,
    owner: "Project workspace",
    ownerInitials: getInitials(project.name),
    shared: false,
    size: PROJECT_STATUS_LABELS[project.status],
    starred: false,
  };
}

export function WorkspaceProjects({ canCreate }: { readonly canCreate: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const query = useInfiniteProjects({ include_archived: true });

  return (
    <>
      {query.isPending ? (
        <Skeleton className="h-64 w-full" aria-label="Loading projects" />
      ) : (
        <AdminProjects
          canCreateProject={canCreate}
          onCreateProject={() => setCreateOpen(true)}
          projects={query.projects.map(toProjectFile)}
        />
      )}
      {(query.hasNextPage || query.isError) && (
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void (query.isError && !query.data ? query.refetch() : query.loadMore())}
        >
          {query.isError ? "Retry" : "Load more projects"}
        </Button>
      )}
      {canCreate && <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </>
  );
}
