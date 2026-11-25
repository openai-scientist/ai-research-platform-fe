import { FolderKanban } from "lucide-react";

import { getAvatarTone } from "@/app/(main)/dashboard/users/_components/users-columns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProjectManagerRef, ProjectUsageItem } from "@/lib/api/services/fetch-admin";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { getInitials } from "@/lib/utils";

import { formatCompactTokens, formatJoinedDate, formatTokens } from "../../_components/admin-api-utils";
import { describeRuns } from "./run-breakdown";

/** Who runs the project: the first manager, and "+N" with the others in a tooltip. "No manager" when there is none. */
function Managers({ managers }: { managers?: ProjectManagerRef[] }) {
  const [first, ...others] = managers ?? [];
  if (!first) return <p className="h-6 text-muted-foreground text-sm leading-6">No manager</p>;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar size="sm" className={getAvatarTone(first.display_name)}>
        <AvatarImage src={resolveAvatarUrl(first.avatar_url)} alt="" crossOrigin="use-credentials" />
        <AvatarFallback>{getInitials(first.display_name)}</AvatarFallback>
      </Avatar>
      <p className="min-w-0 truncate font-medium text-sm" title={first.display_name}>
        {first.display_name}
      </p>
      {others.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`${others.length} more project ${others.length === 1 ? "manager" : "managers"}`}
              className="shrink-0 rounded-sm text-muted-foreground text-xs underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              +{others.length}
            </button>
          </TooltipTrigger>
          <TooltipContent>{others.map((manager) => manager.display_name).join(", ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/** One project as the platform sees it: usage metadata only, so the card is not a link and has no actions. */
export function ProjectCard({ project }: { project: ProjectUsageItem }) {
  const runs = `${project.run_count} ${project.run_count === 1 ? "run" : "runs"}`;
  const breakdown = describeRuns(project.runs_by_status);
  const used = formatCompactTokens(project.tokens_used);
  const tokens =
    project.token_budget > 0
      ? `${used} tokens used of ${formatCompactTokens(project.token_budget)}`
      : `${used} tokens used`;
  const exact =
    project.token_budget > 0
      ? `${formatTokens(project.tokens_used)} tokens used of ${formatTokens(project.token_budget)} budgeted`
      : `${formatTokens(project.tokens_used)} tokens used`;

  return (
    <Card size="sm">
      <CardContent>
        <div className="relative flex h-36 items-center justify-center rounded-lg bg-muted/50">
          <FolderKanban className="size-12 text-muted-foreground" aria-hidden="true" />
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 text-muted-foreground text-xs">
            <Badge variant={project.archived ? "outline" : "secondary"}>
              {project.archived ? "Archived" : "Active"}
            </Badge>
            {breakdown ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-sm underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {runs}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{breakdown}</TooltipContent>
              </Tooltip>
            ) : (
              <span>{runs}</span>
            )}
          </div>
        </div>
      </CardContent>
      <CardHeader>
        <CardTitle className="truncate" title={project.project_name}>
          {project.project_name}
        </CardTitle>
        <Managers managers={project.managers} />
        <CardDescription className="truncate">
          {project.last_run_at ? `Last run ${formatJoinedDate(project.last_run_at)}` : "No runs yet"}
        </CardDescription>
        <CardDescription className="truncate tabular-nums" title={exact}>
          {tokens}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function ProjectCardSkeleton() {
  return (
    <Card size="sm" aria-hidden="true">
      <CardContent>
        <Skeleton className="h-36 w-full rounded-lg" />
      </CardContent>
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-3/5" />
      </CardHeader>
    </Card>
  );
}
