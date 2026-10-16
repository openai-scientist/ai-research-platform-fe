"use client";

import type { ComponentType, ReactNode } from "react";

import { useProjectDetailQuery } from "@/hooks/use-projects-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { getProjectAccess } from "@/lib/auth/project-access";
import type { RunSection } from "@/lib/research-workspace";

import { ConnectionsSection } from "./data-connections/connections-section";
import { DatasetDetails } from "./dataset-details";
import { DatasetsSection } from "./datasets-section";
import { ExperimentsSection } from "./experiments-section";
import { MembersSection } from "./members-section";
import { ProjectFilesSection } from "./project-files-section";
import { RunDetails } from "./run-details";
import { SettingsSection } from "./settings-section";
import type { WorkspaceProps } from "./workspace-ui";

const screens: Record<string, ComponentType<WorkspaceProps>> = {
  connections: ConnectionsSection,
  datasets: DatasetsSection,
  experiments: ExperimentsSection,
  members: MembersSection,
  settings: SettingsSection,
};

export function WorkspaceSection({
  project: initial,
  section,
  userId,
  runId,
  datasetId,
  experimentSection,
  membersHeader,
  connectionsHeader,
  filesHeader,
}: {
  project: ProjectItem;
  section: string;
  userId: string;
  runId?: string;
  datasetId?: string;
  experimentSection?: RunSection;
  membersHeader?: ReactNode;
  connectionsHeader?: ReactNode;
  filesHeader?: ReactNode;
}) {
  const query = useProjectDetailQuery(initial.id, { refetchInterval: (state) => (state.state.error ? false : 15_000) });
  const project = query.data?.data ?? initial;
  const Screen = screens[section];
  const access = getProjectAccess(project.my_role, project.status);
  if (!access.canRead) return null;
  const props = {
    project,
    userId,
    canWrite: !query.isError && access.canWrite,
    canManage: !query.isError && access.canManage,
  };
  if (section === "dataset-detail" && datasetId)
    return <DatasetDetails key={datasetId} {...props} datasetId={datasetId} />;
  if (section === "run" && runId)
    return <RunDetails key={runId} {...props} runId={runId} section={experimentSection} />;
  if (section === "members") return <MembersSection {...props} header={membersHeader} />;
  if (section === "connections") return <ConnectionsSection {...props} header={connectionsHeader} />;
  if (section === "files") return <ProjectFilesSection key={project.id} {...props} header={filesHeader} />;
  if (!Screen || (section === "settings" && (!access.canAccessSettings || query.isError))) return null;
  return <Screen {...props} />;
}
