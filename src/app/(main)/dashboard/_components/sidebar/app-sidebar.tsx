"use client";

import Link from "next/link";

import { useShallow } from "zustand/react/shallow";

import { BrandMark } from "@/components/brand-mark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { rootUser } from "@/data/users";
import { adminSidebarItems } from "@/navigation/sidebar/admin-sidebar-items";
import { type NavGroup, sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  readonly brandLabel?: string;
  /** Extra sidebar content shown below the main navigation. */
  readonly extra?: React.ReactNode;
  readonly header?: React.ReactNode;
  readonly homeUrl?: string;
  readonly items?: readonly NavGroup[];
  readonly sidebarMode?: "admin" | "default";
  readonly showQuickCreate?: boolean;
  readonly user?: {
    readonly avatar?: string;
    readonly email: string;
    readonly name: string;
  };
}

export function AppSidebar({
  brandLabel = APP_CONFIG.shortName,
  extra,
  header,
  homeUrl = "/dashboard/default",
  items: customItems,
  sidebarMode = "default",
  showQuickCreate = true,
  user = rootUser,
  ...props
}: AppSidebarProps) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;
  const items = customItems ?? (sidebarMode === "admin" ? adminSidebarItems : sidebarItems);

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        {header ?? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link prefetch={false} href={homeUrl}>
                  <BrandMark />
                  <span className="truncate font-semibold text-base">{brandLabel}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} showQuickCreate={showQuickCreate} />
        {extra}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ ...user, avatar: user.avatar ?? "" }} />
      </SidebarFooter>
    </Sidebar>
  );
}
