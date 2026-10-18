import { Database, FileText, LayoutDashboard, Plug, Settings, Users, Workflow } from "lucide-react";

import { ProjectRole } from "@/types/enums";

import type { NavGroup } from "./sidebar-items";

export function getProjectSidebarItems(projectId: string, role: ProjectRole | null): NavGroup[] {
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
        {
          id: "project-connections",
          title: "Data Connections",
          url: `${baseUrl}/connections`,
          icon: Plug,
          activeMatch: "prefix",
        },
        { id: "project-files", title: "Documents", url: `${baseUrl}/files`, icon: FileText },
      ],
    },
    {
      id: 4,
      label: "PROJECT",
      items: [
        ...(role === ProjectRole.ProjectManager
          ? [{ id: "project-settings", title: "Settings", url: `${baseUrl}/settings`, icon: Settings }]
          : [{ id: "project-members", title: "Members", url: `${baseUrl}/members`, icon: Users }]),
      ],
    },
  ];
}
