"use client";

import Link from "next/link";

import { ArrowRight, Database, FlaskConical, Lightbulb, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDatasetsQuery } from "@/hooks/use-datasets-query";
import { useMembersQuery } from "@/hooks/use-members-query";
import { useRunsQuery } from "@/hooks/use-runs-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { ProjectRole, ProjectStatus } from "@/types/enums";

import { MetricCard, SectionCard } from "../../../admin/_components/admin-primitives";
import { ProjectStatusBadge } from "../../_components/project-status-badge";

export function ProjectOverview({ project }: { readonly project: ProjectItem }) {
  const datasets = useDatasetsQuery(project.id, { limit: 1 });
  const runs = useRunsQuery(project.id, { limit: 1 });
  const members = useMembersQuery(project.id, { limit: 1 });
  const count = (query: typeof datasets | typeof runs | typeof members) =>
    query.data ? String(query.data.meta.pagination?.total ?? query.data.data.length) : "—";
  const baseUrl = `/projects/${project.id}`;
  const isEmpty = datasets.data?.meta.pagination?.total === 0 && runs.data?.meta.pagination?.total === 0;
  const canWrite = project.my_role !== ProjectRole.Reviewer && project.status !== ProjectStatus.Archived;
  const nextSteps = [
    {
      title: "Upload a dataset",
      description: "Bring the source data your experiments will run against.",
      href: `${baseUrl}/datasets`,
      icon: Database,
    },
    {
      title: "Run an experiment",
      description: "Configure an agent pipeline and compare model outputs.",
      href: `${baseUrl}/experiments`,
      icon: FlaskConical,
    },
    {
      title: "Invite collaborators",
      description: "Add researchers and reviewers to this workspace.",
      href: `${baseUrl}/members`,
      icon: Users,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">Project workspace</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="max-w-3xl text-muted-foreground text-sm">{project.description ?? "No description provided."}</p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link prefetch={false} href={`${baseUrl}/experiments`}>
              <FlaskConical data-icon="inline-start" />
              New experiment
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Database} label="Datasets" value={count(datasets)} detail="in this workspace" />
        <MetricCard icon={FlaskConical} label="Experiments" value={count(runs)} detail="all time" />
        <MetricCard icon={Lightbulb} label="Findings" value="—" detail="Not available yet" />
        <MetricCard icon={Users} label="Members" value={count(members)} detail="collaborators" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={isEmpty ? "Get started" : "Next steps"} description="Common actions for this workspace.">
          <ul className="flex flex-col gap-2">
            {nextSteps.map((step) => (
              <li key={step.title}>
                <Link
                  prefetch={false}
                  href={step.href}
                  className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="truncate text-muted-foreground text-xs">{step.description}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Recent activity" description="Latest events in this workspace.">
          <p className="py-6 text-center text-muted-foreground text-sm">Activity details are not available yet.</p>
        </SectionCard>
      </div>
    </div>
  );
}
