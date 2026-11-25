import { Activity, Cpu, FolderKanban, Gauge, LayoutDashboard, LibraryBig, ScrollText, Users } from "lucide-react";

import type { NavGroup } from "./sidebar-items";

export const adminSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "GENERAL",
    items: [
      {
        id: "admin-overview",
        title: "Overview",
        url: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 2,
    label: "MANAGEMENT",
    items: [
      {
        id: "admin-users",
        title: "Users",
        url: "/admin/users",
        icon: Users,
      },
      {
        id: "admin-projects",
        title: "Projects",
        url: "/admin/projects",
        icon: FolderKanban,
      },
    ],
  },
  {
    id: 3,
    label: "AI PLATFORM",
    items: [
      {
        id: "admin-providers",
        title: "Models & Providers",
        url: "/admin/providers",
        icon: Cpu,
      },
      {
        id: "admin-usage",
        title: "Usage & Cost",
        url: "/admin/usage",
        icon: Activity,
      },
    ],
  },
  {
    id: 6,
    label: "WRITING",
    items: [
      {
        id: "admin-writing-bank",
        title: "Writing Bank",
        url: "/admin/writing-bank",
        icon: LibraryBig,
        activeMatch: "prefix",
      },
    ],
  },
  {
    id: 4,
    label: "OPERATIONS",
    items: [
      {
        id: "admin-system",
        title: "System Health",
        url: "/admin/system",
        icon: Gauge,
      },
      {
        id: "admin-logs",
        title: "Audit Log",
        url: "/admin/logs",
        icon: ScrollText,
      },
    ],
  },
];
