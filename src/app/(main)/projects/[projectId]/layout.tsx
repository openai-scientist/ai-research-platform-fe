import type { ReactNode } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cn } from "cn";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { canCreateProject } from "@/lib/auth/auth-config";
import { getAuthenticatedUser } from "@/server/auth";
import { getWorkspaceProject, getWorkspaceProjects } from "@/server/projects";
import { getPreference } from "@/server/server-actions";

import { NotificationBell } from "../../_components/notifications/notification-bell";
import { AccountSwitcher } from "../../dashboard/_components/header/account-switcher";
import { LayoutControls } from "../../dashboard/_components/header/layout-controls";
import { ThemeSwitcher } from "../../dashboard/_components/header/theme-switcher";
import { ProjectSidebar } from "./_components/project-sidebar";
import { RememberLastProject } from "./_components/remember-last-project";
import { RunWorkspaceHost } from "./_components/run-studio/run-workspace";

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

  const [project, projects] = await Promise.all([getWorkspaceProject(projectId), getWorkspaceProjects()]);

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as React.CSSProperties
      }
    >
      <RememberLastProject projectId={project.id} userId={user.id} />
      <RunWorkspaceHost projectId={project.id} />
      <ProjectSidebar
        activeProject={project}
        canCreate={canCreateProject(user.platform_role)}
        projects={projects}
        user={user}
        variant={variant}
        collapsible={collapsible}
      />
      <SidebarInset
        className={cn(
          "min-w-0 overflow-x-clip [--dashboard-header-height:--spacing(12)] peer-data-[variant=inset]:border",
          "[html[data-content-layout=centered]_&>*]:mx-auto [html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
        )}
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
              <NotificationBell />
              <LayoutControls />
              <ThemeSwitcher />
              <AccountSwitcher
                users={[{ id: user.email, name: user.name, email: user.email, avatar: "", role: user.platform_role }]}
              />
            </div>
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
