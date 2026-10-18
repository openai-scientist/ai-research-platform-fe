"use client";

import type { ComponentProps } from "react";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { useProjectAccess } from "@/hooks/use-project-access";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import type { AuthUser } from "@/lib/auth/auth-config";
import type { ProjectSummary } from "@/lib/projects/project-data";
import { getProjectSidebarItems } from "@/navigation/sidebar/project-sidebar-items";

import { ProjectSwitcher } from "./project-switcher";

export function ProjectSidebar({
  activeProject,
  canCreate,
  collapsible,
  projects,
  user,
  variant,
}: {
  readonly activeProject: Pick<ProjectItem, "id" | "name" | "status" | "my_role">;
  readonly canCreate: boolean;
  readonly collapsible: ComponentProps<typeof AppSidebar>["collapsible"];
  readonly projects: readonly ProjectSummary[];
  readonly user: AuthUser;
  readonly variant: ComponentProps<typeof AppSidebar>["variant"];
}) {
  const access = useProjectAccess(activeProject.id);
  const items = getProjectSidebarItems(activeProject.id, activeProject.my_role).map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => item.id !== "project-datasets" || access.context?.permissions.can_read_raw_datasets,
    ),
  }));
  return (
    <AppSidebar
      header={<ProjectSwitcher activeProject={activeProject} canCreate={canCreate} projects={projects} />}
      items={items}
      showQuickCreate={false}
      user={{ ...user, avatar: "" }}
      variant={variant}
      collapsible={collapsible}
    />
  );
}
