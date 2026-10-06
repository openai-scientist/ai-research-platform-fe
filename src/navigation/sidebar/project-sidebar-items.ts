import { Database, LayoutDashboard, Lightbulb, Settings, Users, Workflow } from "lucide-react";

import type { UserRole } from "@/lib/auth/auth-config";

import type { NavGroup } from "./sidebar-items";

export function getProjectSidebarItems(projectId: string, role: UserRole): NavGroup[] {
  const baseUrl = `/projects/${projectId}`;

  return [
    {
      id: 1,
      items: [{ id: "project-overview", title: "Overview", url: baseUrl, icon: LayoutDashboard }],
    },
    {
      id: 2,
      label: "RESEARCH",
      items: [
        // The route keeps its old name so existing links still work.
        {
          id: "project-experiments",
          title: "Research flow",
          url: `${baseUrl}/experiments`,
          icon: Workflow,
          activeMatch: "prefix",
        },
      ],
    },
    {
      id: 3,
      label: "LIBRARY",
      items: [
        {
          id: "project-datasets",
          title: "Datasets",
          url: `${baseUrl}/datasets`,
          icon: Database,
          activeMatch: "prefix",
        },
        { id: "project-findings", title: "Findings", url: `${baseUrl}/findings`, icon: Lightbulb },
      ],
    },
    {
      id: 4,
      label: "PROJECT",
      items: [
        { id: "project-members", title: "Members", url: `${baseUrl}/members`, icon: Users },
        ...(role === "PROJECT_MANAGER" || role === "SYSTEM_ADMIN"
          ? [{ id: "project-settings", title: "Settings", url: `${baseUrl}/settings`, icon: Settings }]
          : []),
      ],
    },
  ];
}
