"use client";

import Link from "next/link";

import { MessageCircleQuestionMark, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useManagerResearchQuery } from "@/hooks/use-manager-query";
import { useProjectDetailQuery } from "@/hooks/use-projects-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { getProjectAccess } from "@/lib/auth/project-access";

import { ProjectStatusBadge } from "../../_components/project-status-badge";
import { BudgetUsageCard } from "./budget-usage-card";
import { ExperimentActivityCard } from "./experiment-activity-card";
import { toManagerDashboard } from "./manager-dashboard-data";
import { ProjectKpiStrip } from "./project-kpi-strip";
import { RecentExperimentsCard, RecentFindingsCard, WarningsCard } from "./research-highlights";
import { ResearchLoopCard } from "./research-loop-card";
import { ResearchPreviewDialog } from "./research-preview";
import { useProjectPreview } from "./use-project-preview";

export function ProjectOverview({ project: initialProject }: { readonly project: ProjectItem }) {
  const projectQuery = useProjectDetailQuery(initialProject.id);
  const research = useManagerResearchQuery(initialProject.id);
  const preview = useProjectPreview(initialProject.id);
  const project = projectQuery.data?.data ?? initialProject;
  const access = getProjectAccess(project.my_role, project.status);
  const baseUrl = `/projects/${project.id}`;
  if (!access.canRead) return null;
  if (research.isPending) return <Skeleton className="h-96 w-full" aria-label="Loading project overview" />;
  if (!research.data) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Project overview</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => void research.refetch()} disabled={research.isFetching}>
            Reload overview
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  const dashboard = toManagerDashboard(project, research.data, preview.data);
  const canWrite = !projectQuery.isError && access.canWrite;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
            <Badge variant="outline">Sample insights</Badge>
          </div>
          <p className="line-clamp-1 max-w-3xl text-muted-foreground text-sm" title={dashboard.objective}>
            {dashboard.objective}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ResearchPreviewDialog projectId={project.id} canEdit={canWrite} />
          {canWrite && (
            <>
              <Button asChild variant="outline">
                <Link prefetch={false} href={`${baseUrl}/datasets#upload-dataset`}>
                  <Upload data-icon="inline-start" />
                  Upload dataset
                </Link>
              </Button>
              <Button asChild>
                <Link prefetch={false} href={`${baseUrl}/experiments/context#research-context`}>
                  <MessageCircleQuestionMark data-icon="inline-start" />
                  New research question
                </Link>
              </Button>
            </>
          )}
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
        <BudgetUsageCard budgets={dashboard.budgets} live />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RecentExperimentsCard baseUrl={baseUrl} experiments={dashboard.recentExperiments} />
        <RecentFindingsCard baseUrl={baseUrl} findings={dashboard.recentFindings} />
      </div>
    </div>
  );
}
