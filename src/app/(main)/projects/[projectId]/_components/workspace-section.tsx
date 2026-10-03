"use client";

import type { ComponentType } from "react";

import { useProjectDetailQuery } from "@/hooks/use-projects-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { ProjectRole, ProjectStatus } from "@/types/enums";

import { DatasetsSection } from "./datasets-section";
import { ExperimentsSection } from "./experiments-section";
import { MembersSection } from "./members-section";
import { FindingsSection } from "./research-preview";
import { SettingsSection } from "./settings-section";
import type { WorkspaceProps } from "./workspace-ui";

const screens: Record<string, ComponentType<WorkspaceProps>> = {
  datasets: DatasetsSection,
  experiments: ExperimentsSection,
  members: MembersSection,
  findings: FindingsSection,
  settings: SettingsSection,
};

export function WorkspaceSection({
  project: initial,
  section,
  isAdmin,
  userId,
}: {
  project: ProjectItem;
  section: string;
  isAdmin: boolean;
  userId: string;
}) {
  const query = useProjectDetailQuery(initial.id);
  const project = query.data?.data ?? initial;
  const Screen = screens[section];
  const canManage = isAdmin || project.my_role === ProjectRole.ProjectManager;
  const writable = project.status !== ProjectStatus.Archived;
  if (!Screen || (section === "settings" && !canManage)) return null;
  return (
    <Screen
      project={project}
      userId={userId}
      canWrite={writable && (canManage || project.my_role === ProjectRole.Researcher)}
      canManage={writable && canManage}
    />
  );
}
