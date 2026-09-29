import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/lib/projects/project-data";

const statusClassNames: Record<ProjectStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  "Data Ready": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Researching: "bg-primary/10 text-primary",
  "Needs Review": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Archived: "bg-muted text-muted-foreground",
};

export function ProjectStatusBadge({ status }: { readonly status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", statusClassNames[status])}>
      {status}
    </Badge>
  );
}
