"use client";

import { useState } from "react";

import Link from "next/link";

import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import type { ProjectSummary } from "@/lib/projects/project-data";
import { getInitials } from "@/lib/utils";

import { CreateProjectDialog } from "../../_components/create-project-dialog";

function ProjectAvatar({ name }: { readonly name: string }) {
  return (
    <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground text-xs">
      {getInitials(name)}
    </div>
  );
}

export function ProjectSwitcher({
  activeProject,
  canCreate,
  projects,
}: {
  readonly activeProject: ProjectSummary;
  readonly canCreate: boolean;
  readonly projects: readonly ProjectSummary[];
}) {
  const { isMobile } = useSidebar();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={activeProject.name}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <ProjectAvatar name={activeProject.name} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{activeProject.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{activeProject.status} project</span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">Switch project</DropdownMenuLabel>
              <DropdownMenuGroup className="max-h-72 overflow-y-auto">
                {projects.map((project) => {
                  const isActive = project.id === activeProject.id;

                  return (
                    <DropdownMenuItem key={project.id} asChild className="gap-2 p-2">
                      <Link
                        prefetch={false}
                        href={`/projects/${project.id}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-md border font-medium text-[10px]">
                          {getInitials(project.name)}
                        </div>
                        <span className="truncate">{project.name}</span>
                        {isActive && <Check className="ml-auto" />}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild className="gap-2 p-2">
                  <Link prefetch={false} href="/projects">
                    <LayoutGrid />
                    View all projects
                  </Link>
                </DropdownMenuItem>
                {canCreate && (
                  <DropdownMenuItem className="gap-2 p-2" onSelect={() => setCreateOpen(true)}>
                    <Plus />
                    New project
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      {canCreate && <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </>
  );
}
