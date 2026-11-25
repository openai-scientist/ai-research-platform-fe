"use client";

import { type ReactNode, useState } from "react";

import { FolderOpen, FolderPlus, Grid2X2, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/project-status";
import { ProjectStatus } from "@/types/enums";

import type { FileManagerFile, FileManagerView } from "../../dashboard/file-manager/_components/data";
import { FileGridView } from "../../dashboard/file-manager/_components/file-grid-view";
import { FileListView } from "../../dashboard/file-manager/_components/file-list-view";
import {
  type FileManagerShowLabels,
  FileManagerToolbar,
  type FileManagerToolbarControls,
  type FileManagerTypeOption,
} from "../../dashboard/file-manager/_components/file-manager-toolbar";
import { RecentProjects } from "./recent-projects";

export const projectActions = {
  archive: "Archive project",
  share: "Copy project link",
  star: "Add to favorites",
  unstar: "Remove from favorites",
};

export const projectStatusOptions: FileManagerTypeOption[] = [
  { label: "All statuses", value: "all" },
  ...Object.values(ProjectStatus).map((status) => ({ label: PROJECT_STATUS_LABELS[status], value: status })),
];

export const projectShowOptions: FileManagerTypeOption[] = [
  { label: "All projects", value: "all" },
  { label: "Shared with me", value: "shared" },
];

export const projectSortOptions: FileManagerTypeOption[] = [
  { label: "Last activity", value: "activity" },
  { label: "Name", value: "name" },
];

const projectFilterLabels: FileManagerShowLabels = {
  all: "All projects",
  shared: "Shared projects",
  starred: "Favorite projects",
};

function ProjectActions({
  canCreateProject,
  onCreateProject,
  secondaryAction,
}: {
  readonly canCreateProject: boolean;
  readonly onCreateProject?: () => void;
  readonly secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {secondaryAction}
      {canCreateProject && (
        <Button onClick={onCreateProject}>
          <FolderPlus data-icon="inline-start" />
          New project
        </Button>
      )}
    </div>
  );
}

export function ProjectsBrowser({
  activeView: initialView = "grid",
  canCreateProject = true,
  embedded = false,
  filtersActive = false,
  toolbarControls,
  onCreateProject,
  projects,
  secondaryAction,
}: {
  readonly activeView?: FileManagerView;
  readonly canCreateProject?: boolean;
  readonly embedded?: boolean;
  /** True while a search or filter narrows the list, so an empty result is not "no projects yet". */
  readonly filtersActive?: boolean;
  readonly toolbarControls?: FileManagerToolbarControls;
  readonly onCreateProject?: () => void;
  readonly projects: FileManagerFile[];
  readonly secondaryAction?: ReactNode;
}) {
  const [activeView, setActiveView] = useState<FileManagerView>(initialView);

  return (
    <div className="flex flex-col gap-4">
      {embedded ? (
        <div className="flex justify-end">
          <ProjectActions
            canCreateProject={canCreateProject}
            onCreateProject={onCreateProject}
            secondaryAction={secondaryAction}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl leading-none tracking-tight">Projects</h1>
            <p className="text-muted-foreground text-sm">
              Browse research workspaces, activity, and experiment status.
            </p>
          </div>
          <ProjectActions
            canCreateProject={canCreateProject}
            onCreateProject={onCreateProject}
            secondaryAction={secondaryAction}
          />
        </div>
      )}

      {(projects.length > 0 || filtersActive) && (
        <FileManagerToolbar
          controls={toolbarControls}
          filterLabels={projectFilterLabels}
          itemLabel="projects"
          placeholder="Search projects..."
          typeLabel="Project status"
          typeOptions={projectStatusOptions}
        />
      )}

      {projects.length > 0 && !filtersActive && <RecentProjects projects={projects} />}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium text-lg">All projects</h2>
          {projects.length > 0 && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={activeView}
              onValueChange={(value) => {
                if (value === "grid" || value === "list") {
                  setActiveView(value);
                }
              }}
              aria-label="Project view"
            >
              <ToggleGroupItem value="grid">
                <Grid2X2 />
                Grid View
              </ToggleGroupItem>
              <ToggleGroupItem value="list">
                <List />
                List View
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
        {projects.length === 0 ? (
          <Empty className="min-h-64 border" role="status">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpen aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{filtersActive ? "No matching projects" : "No projects yet"}</EmptyTitle>
              <EmptyDescription>
                {filtersActive
                  ? "No project matches the search and filters. Change them to see more."
                  : canCreateProject
                    ? "Create a research project to get started, or accept an invitation to join a workspace."
                    : "You haven't joined any projects. Check your invitations or ask a project manager to invite you."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : activeView === "list" ? (
          <FileListView
            files={projects}
            labels={{ modified: "Last activity", name: "Project", owner: "Owner", size: "Runs" }}
            sharedLabel="Status"
          />
        ) : (
          <FileGridView files={projects} />
        )}
      </div>
    </div>
  );
}
