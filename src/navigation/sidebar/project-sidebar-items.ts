import { Database, FlaskConical, LayoutDashboard, Lightbulb, Settings, Users } from "lucide-react";

import type { UserRole } from "@/lib/auth/auth-config";

import type { NavGroup } from "./sidebar-items";

export function getProjectSidebarItems(projectId: string, role: UserRole): NavGroup[] {
  const baseUrl = `/projects/${projectId}`;

  return [
    {
      id: 1,
      label: "WORKSPACE",
      items: [
        { id: "project-overview", title: "Overview", url: baseUrl, icon: LayoutDashboard },
        { id: "project-datasets", title: "Datasets", url: `${baseUrl}/datasets`, icon: Database },
        { id: "project-experiments", title: "Experiments", url: `${baseUrl}/experiments`, icon: FlaskConical },
        { id: "project-findings", title: "Findings", url: `${baseUrl}/findings`, icon: Lightbulb },
      ],
    },
    {
      id: 2,
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
