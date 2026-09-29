"use client";

import type { ComponentProps } from "react";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
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
  readonly activeProject: ProjectSummary;
  readonly canCreate: boolean;
  readonly collapsible: ComponentProps<typeof AppSidebar>["collapsible"];
  readonly projects: readonly ProjectSummary[];
  readonly user: AuthUser;
  readonly variant: ComponentProps<typeof AppSidebar>["variant"];
}) {
  return (
    <AppSidebar
      header={<ProjectSwitcher activeProject={activeProject} canCreate={canCreate} projects={projects} />}
      items={getProjectSidebarItems(activeProject.id, user.role)}
      showQuickCreate={false}
      user={{ ...user, avatar: "" }}
      variant={variant}
      collapsible={collapsible}
    />
  );
}
