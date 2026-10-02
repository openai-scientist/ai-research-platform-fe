import type { ReactNode } from "react";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { canCreateProject } from "@/lib/auth/auth-config";
import { findProjectForUser, getProjectsForUser, toProjectSummary } from "@/lib/projects/project-data";
import { getAuthenticatedUser } from "@/server/auth";
import { getPreference } from "@/server/server-actions";

import { AccountSwitcher } from "../../dashboard/_components/header/account-switcher";
import { LayoutControls } from "../../dashboard/_components/header/layout-controls";
import { ThemeSwitcher } from "../../dashboard/_components/header/theme-switcher";
import { ProjectSidebar } from "./_components/project-sidebar";
import { RememberLastProject } from "./_components/remember-last-project";

export default async function Layout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ projectId: string }> }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const { projectId } = await params;
  const [user, variant, collapsible] = await Promise.all([
    getAuthenticatedUser(projectId),
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
  ]);

  if (!user) {
    redirect("/auth/login");
  }

  const project = findProjectForUser(projectId, user.email);

  if (!project) {
    notFound();
  }

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as React.CSSProperties
      }
    >
      <RememberLastProject projectId={project.id} />
      <ProjectSidebar
        activeProject={toProjectSummary(project)}
        canCreate={canCreateProject(user.role)}
        projects={getProjectsForUser(user.email).map(toProjectSummary)}
        user={user}
        variant={variant}
        collapsible={collapsible}
      />
      <SidebarInset
        className={
          "min-w-0 overflow-x-clip peer-data-[variant=inset]:border [--dashboard-header-height:--spacing(12)] " +
          "[html[data-content-layout=centered]_&>*]:mx-auto [html[data-content-layout=centered]_&>*]:w-full " +
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl"
        }
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between gap-2 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <span className="truncate font-medium text-sm">{project.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <LayoutControls />
              <ThemeSwitcher />
              <AccountSwitcher
                users={[{ id: user.email, name: user.name, email: user.email, avatar: "", role: user.role }]}
              />
            </div>
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
