"use client";

import Link from "next/link";

import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectDetailQuery } from "@/hooks/use-projects-query";
import { useRunsQuery } from "@/hooks/use-runs-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { blocksNewRun, isActiveRun, researchRunUrl } from "@/lib/research-workspace";
import { ProjectRole, ProjectStatus, RunStatus } from "@/types/enums";

import { ActionRow, ListState } from "./workspace-ui";

export function ResearcherOverview({ project: initial }: { project: ProjectItem }) {
  const detail = useProjectDetailQuery(initial.id, {
    refetchInterval: (query) => (query.state.error ? false : 15_000),
  });
  const project = detail.data?.data ?? initial;
  const runs = useRunsQuery(
    project.id,
    { limit: 5 },
    { refetchInterval: (query) => (query.state.error ? false : 15_000) },
  );
  const latest = runs.data?.data[0];
  const active = runs.data?.data.find((run) => isActiveRun(run.status));
  const current = active ?? latest;
  const canWrite = project.my_role === ProjectRole.Researcher && project.status !== ProjectStatus.Archived;
  const blocked = blocksNewRun(project.status) || Boolean(active) || !runs.isSuccess || detail.isError;
  const base = `/projects/${project.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="break-words font-heading text-3xl tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground text-sm">
          {project.description?.trim() ? project.description : "Your research workspace."}
        </p>
      </div>
      {active?.status === RunStatus.AwaitingReview && (
        <Card>
          <CardHeader>
            <CardTitle>Research is waiting for your frame review</CardTitle>
            <CardDescription>Review the proposed variables and decisions so this run can continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link prefetch={false} href={`${researchRunUrl(project.id, active.id, "frame-review")}#frame-review`}>
                Review frame
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{active ? "Current research run" : "Latest research run"}</CardTitle>
          <CardDescription>Track research progress and spending against the run budget.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListState
            pending={runs.isPending}
            failed={runs.isError}
            empty={!current}
            title="Research runs"
            retry={runs.refetch}
          />
          {current && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <ManagementStatusBadge status={current.status} />
                <span className="text-sm">
                  ${current.cost_usd} spent / ${current.budget_usd} budget
                </span>
                <span className="text-muted-foreground text-sm">Context v{current.research_context_version}</span>
              </div>
              <Button asChild variant="outline" className="self-start">
                <Link prefetch={false} href={researchRunUrl(project.id, current.id)}>
                  Open run {current.id.slice(0, 8)}
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Research actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ActionRow>
              {blocked ? (
                <Button disabled>Start a new run</Button>
              ) : (
                <Button asChild>
                  <Link prefetch={false} href={`${base}/experiments#start-run`}>
                    Start a new run
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link prefetch={false} href={`${base}/experiments/context#research-context`}>
                  Update research question
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link prefetch={false} href={`${base}/datasets#upload-dataset`}>
                  Upload dataset
                </Link>
              </Button>
            </ActionRow>
            {active && (
              <p className="text-muted-foreground text-sm">
                Wait for the active run to finish before starting another.
              </p>
            )}
            {project.status === ProjectStatus.Completed && (
              <p className="text-muted-foreground text-sm">
                A project manager must reopen this project before a new run can start.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
