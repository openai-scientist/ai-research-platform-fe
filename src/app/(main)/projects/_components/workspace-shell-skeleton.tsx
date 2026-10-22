"use client";

import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";

import { usePathname } from "next/navigation";

import { cn } from "cn";

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import {
  DatasetDetailSkeleton,
  OverviewSkeleton,
  SectionSkeleton,
} from "../[projectId]/_components/workspace-skeletons";

// The project navigation, group by group (Settings shows only for managers).
const NAV_GROUPS = [
  { id: "overview", label: false, items: ["overview"] },
  { id: "research", label: true, items: ["research-flow"] },
  { id: "library", label: true, items: ["datasets", "connections", "documents"] },
  { id: "project", label: true, items: ["members"] },
];

// The sidebar cookie only changes when the sidebar is toggled, which this placeholder doesn't offer.
const subscribe = () => () => undefined;
const sidebarOpen = () => !document.cookie.split("; ").includes("sidebar_state=false");

/** The page being opened, from `/projects/[projectId]/...`. */
function ProjectPageSkeleton({ path }: { path: string }) {
  const [, , , section, item] = path.split("/");
  if (!section) return <OverviewSkeleton />;
  if (section === "datasets" && item) return <DatasetDetailSkeleton />;
  return <SectionSkeleton section={section} />;
}

/** A project opening: its sidebar and header in place while the workspace loads, as the project layout lays them out. */
export function WorkspaceShellSkeleton() {
  const path = usePathname();
  const open = useSyncExternalStore(subscribe, sidebarOpen, () => true);
  const variant = usePreferencesStore((s) => s.values.sidebar_variant);
  const collapsible = usePreferencesStore((s) => s.values.sidebar_collapsible);

  return (
    <SidebarProvider open={open} style={{ "--sidebar-width": "calc(var(--spacing) * 68)" } as CSSProperties}>
      <Sidebar variant={variant} collapsible={collapsible} aria-hidden="true">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem className="flex h-12 items-center gap-2 p-2">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.id}>
              {group.label && (
                <div className="flex h-8 items-center px-2 group-data-[collapsible=icon]:hidden">
                  <Skeleton className="h-3 w-16" />
                </div>
              )}
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item} className="flex h-8 items-center gap-2 px-2">
                    <Skeleton className="size-4 shrink-0" />
                    <Skeleton className="h-4 w-28 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem className="flex h-12 items-center gap-2 p-2">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset
        className={cn(
          "min-w-0 overflow-x-clip peer-data-[variant=inset]:border",
          "[html[data-content-layout=centered]_&>*]:mx-auto [html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
        )}
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b">
          <div className="flex w-full items-center justify-between gap-2 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-1 lg:gap-2">
              <Skeleton className="-ml-1 size-7" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="size-8" />
              <Skeleton className="size-8" />
              <Skeleton className="size-8" />
              <Skeleton className="size-8 rounded-full" />
            </div>
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-clip p-4 md:p-6">
          <ProjectPageSkeleton path={path} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
