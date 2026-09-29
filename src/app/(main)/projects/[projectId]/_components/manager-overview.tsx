import Link from "next/link";

import { MessageCircleQuestionMark, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WorkspaceProject } from "@/lib/projects/project-data";

import { ProjectStatusBadge } from "../../_components/project-status-badge";
import { BudgetUsageCard } from "./budget-usage-card";
import { ExperimentActivityCard } from "./experiment-activity-card";
import { getProjectDashboard } from "./project-dashboard-data";
import { ProjectKpiStrip } from "./project-kpi-strip";
import { RecentExperimentsCard, RecentFindingsCard, WarningsCard } from "./research-highlights";
import { ResearchLoopCard } from "./research-loop-card";

export function ManagerOverview({ project }: { readonly project: WorkspaceProject }) {
  const baseUrl = `/projects/${project.id}`;
  const dashboard = getProjectDashboard(project);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="line-clamp-1 max-w-3xl text-muted-foreground text-sm" title={dashboard.objective}>
            {dashboard.objective}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link prefetch={false} href={`${baseUrl}/datasets`}>
              <Upload data-icon="inline-start" />
              Upload dataset
            </Link>
          </Button>
          <Button asChild>
            <Link prefetch={false} href={`${baseUrl}/experiments`}>
              <MessageCircleQuestionMark data-icon="inline-start" />
              New research question
            </Link>
          </Button>
        </div>
      </div>

      <ProjectKpiStrip dashboard={dashboard} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ResearchLoopCard dashboard={dashboard} />
        </div>
        <WarningsCard baseUrl={baseUrl} warnings={dashboard.warnings} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ExperimentActivityCard activity={dashboard.experimentActivity} />
        </div>
        <BudgetUsageCard budgets={dashboard.budgets} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RecentExperimentsCard baseUrl={baseUrl} experiments={dashboard.recentExperiments} />
        <RecentFindingsCard baseUrl={baseUrl} findings={dashboard.recentFindings} />
      </div>
    </div>
  );
}
