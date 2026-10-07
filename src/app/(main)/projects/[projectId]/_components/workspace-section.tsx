"use client";

import type { ComponentType, ReactNode } from "react";

import { useProjectDetailQuery } from "@/hooks/use-projects-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import type { RunSection } from "@/lib/research-workspace";
import { ProjectRole, ProjectStatus } from "@/types/enums";

import { ConnectionsSection } from "./data-connections/connections-section";
import { DatasetDetails } from "./dataset-details";
import { DatasetsSection } from "./datasets-section";
import { ExperimentsSection } from "./experiments-section";
import { MembersSection } from "./members-section";
import { ResearchContextSection } from "./research-context-section";
import { FindingsSection } from "./research-preview";
import { RunDetails } from "./run-details";
import { SettingsSection } from "./settings-section";
import type { WorkspaceProps } from "./workspace-ui";

const screens: Record<string, ComponentType<WorkspaceProps>> = {
  connections: ConnectionsSection,
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
  runId,
  datasetId,
  experimentSection,
  membersHeader,
}: {
  project: ProjectItem;
  section: string;
  isAdmin: boolean;
  userId: string;
  runId?: string;
  datasetId?: string;
  experimentSection?: RunSection | "current" | "history";
  membersHeader?: ReactNode;
}) {
  const query = useProjectDetailQuery(initial.id, { refetchInterval: (state) => (state.state.error ? false : 15_000) });
  const project = query.data?.data ?? initial;
  const Screen = screens[section];
  const canManage = isAdmin || project.my_role === ProjectRole.ProjectManager;
  const writable = project.status !== ProjectStatus.Archived;
  const props = {
    project,
    userId,
    canWrite: writable && (canManage || project.my_role === ProjectRole.Researcher),
    canManage: writable && canManage,
  };
  if (section === "dataset-detail" && datasetId)
    return <DatasetDetails key={datasetId} {...props} datasetId={datasetId} />;
  if (section === "run" && runId)
    return (
      <RunDetails
        key={runId}
        {...props}
        runId={runId}
        section={experimentSection === "current" || experimentSection === "history" ? undefined : experimentSection}
      />
    );
  if (section === "research-context")
    return <ResearchContextSection {...props} section={experimentSection === "history" ? "history" : "current"} />;
  if (section === "members") return <MembersSection {...props} header={membersHeader} />;
  if (!Screen || (section === "settings" && !canManage)) return null;
  return <Screen {...props} />;
}
