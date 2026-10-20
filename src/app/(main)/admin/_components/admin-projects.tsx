"use client";

import { type ReactNode, useState } from "react";

import { Download, FolderOpen, FolderPlus, Grid2X2, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { FileManagerFile, FileManagerView } from "../../dashboard/file-manager/_components/data";
import { FileGridView } from "../../dashboard/file-manager/_components/file-grid-view";
import { FileListView } from "../../dashboard/file-manager/_components/file-list-view";
import {
  type FileManagerShowLabels,
  FileManagerToolbar,
  type FileManagerTypeOption,
} from "../../dashboard/file-manager/_components/file-manager-toolbar";
import { RecentProjects } from "../../projects/_components/recent-projects";

export const projectActions = {
  archive: "Archive project",
  export: "Export snapshot",
  share: "Copy project link",
  star: "Add to favorites",
  unstar: "Remove from favorites",
};

const defaultProjects: FileManagerFile[] = [
  {
    actionLabels: projectActions,
    badgeLabel: "Active",
    icon: "project",
    id: "protein-folding",
    kind: "document",
    kindLabel: "Active",
    modifiedAt: "4 min ago",
    name: "Protein Folding Study",
    owner: "Maya Chen",
    ownerInitials: "MC",
    shared: true,
    size: "46 runs",
    starred: true,
  },
  {
    actionLabels: projectActions,
    badgeLabel: "Active",
    icon: "project",
    id: "clinical-trial-signals",
    kind: "document",
    kindLabel: "Active",
    modifiedAt: "2 hr ago",
    name: "Clinical Trial Signals",
    owner: "Ava Patel",
    ownerInitials: "AP",
    shared: true,
    size: "73 runs",
    starred: true,
  },
  {
    actionLabels: projectActions,
    badgeLabel: "Active",
    icon: "project",
    id: "climate-risk",
    kind: "document",
    kindLabel: "Active",
    modifiedAt: "42 min ago",
    name: "Climate Risk Model",
    owner: "Noah Williams",
    ownerInitials: "NW",
    shared: true,
    size: "28 runs",
    starred: false,
  },
  {
    actionLabels: projectActions,
    badgeLabel: "Active",
    icon: "project",
    id: "materials-discovery",
    kind: "document",
    kindLabel: "Active",
    modifiedAt: "Yesterday",
    name: "Materials Discovery",
    owner: "Liam Garcia",
    ownerInitials: "LG",
    shared: false,
    size: "19 runs",
    starred: false,
  },
  {
    actionLabels: projectActions,
    badgeLabel: "Review",
    icon: "project",
    id: "evidence-benchmark",
    kind: "document",
    kindLabel: "Review",
    modifiedAt: "18 min ago",
    name: "Evidence Benchmark",
    owner: "Maya Chen",
    ownerInitials: "MC",
    shared: true,
    size: "31 runs",
    starred: true,
  },
  {
    actionLabels: projectActions,
    badgeLabel: "Review",
    icon: "project",
    id: "retrieval-quality",
    kind: "document",
    kindLabel: "Review",
    modifiedAt: "3 hr ago",
    name: "Retrieval Quality",
    owner: "Noah Williams",
    ownerInitials: "NW",
    shared: true,
    size: "22 runs",
    starred: false,
  },
  {
    actionLabels: projectActions,
    badgeLabel: "Archived",
    icon: "project",
    id: "legacy-providers",
    kind: "document",
    kindLabel: "Archived",
    modifiedAt: "12 Sep 2026",
    name: "Legacy Provider Comparison",
    owner: "Ava Patel",
    ownerInitials: "AP",
    shared: false,
    size: "16 runs",
    starred: false,
  },
  {
    actionLabels: projectActions,
    badgeLabel: "Archived",
    icon: "project",
    id: "dataset-validation",
    kind: "document",
    kindLabel: "Archived",
    modifiedAt: "08 Sep 2026",
    name: "Dataset Validation",
    owner: "Liam Garcia",
    ownerInitials: "LG",
    shared: false,
    size: "12 runs",
    starred: false,
  },
];

const projectTypeOptions: FileManagerTypeOption[] = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "In review", value: "review" },
  { label: "Archived", value: "archived" },
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
      {secondaryAction ?? (
        <Button variant="outline">
          <Download data-icon="inline-start" />
          Export
        </Button>
      )}
      {canCreateProject && (
        <Button onClick={onCreateProject}>
          <FolderPlus data-icon="inline-start" />
          New project
        </Button>
      )}
    </div>
  );
}

export function AdminProjects({
  activeView: initialView = "grid",
  canCreateProject = true,
  embedded = false,
  onCreateProject,
  projects = defaultProjects,
  secondaryAction,
}: {
  readonly activeView?: FileManagerView;
  readonly canCreateProject?: boolean;
  readonly embedded?: boolean;
  readonly onCreateProject?: () => void;
  readonly projects?: FileManagerFile[];
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

      {projects.length > 0 && (
        <FileManagerToolbar
          filterLabels={projectFilterLabels}
          itemLabel="projects"
          placeholder="Search projects..."
          typeLabel="Project status"
          typeOptions={projectTypeOptions}
        />
      )}

      {projects.length > 0 && <RecentProjects projects={projects} />}

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
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                {canCreateProject
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
