import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/project-status";
import { ProjectStatus } from "@/types/enums";

const statusClassNames: Record<ProjectStatus, string> = {
  [ProjectStatus.Draft]: "bg-muted text-muted-foreground",
  [ProjectStatus.DataReady]: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  [ProjectStatus.Researching]: "bg-primary/10 text-primary",
  [ProjectStatus.NeedsReview]: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  [ProjectStatus.Completed]: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  [ProjectStatus.Archived]: "bg-muted text-muted-foreground",
};

export function ProjectStatusBadge({ status }: { readonly status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", statusClassNames[status])}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
