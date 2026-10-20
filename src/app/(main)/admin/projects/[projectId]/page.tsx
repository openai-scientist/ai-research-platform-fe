import Link from "next/link";

import { ArrowLeft, Database, FlaskConical, FolderKanban, Lightbulb, type LucideIcon, Users } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { projects } from "../../_components/admin-data";
import { AdminPageHeader, SectionCard } from "../../_components/admin-primitives";

export const metadata: Metadata = {
  title: "Project detail · OpenAI Scientist",
  description: "Review project activity, datasets, experiments, findings, and usage.",
};

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project =
    projects.find((item) => item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === projectId) ?? projects[0];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Management / Projects"
        title={project.name}
        description={`Owned by ${project.owner} · Last activity ${project.lastActivity}`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/projects">
              <ArrowLeft data-icon="inline-start" />
              Back to projects
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ProjectMetric icon={Users} label="Members" value={String(project.members)} />
        <ProjectMetric icon={Database} label="Datasets" value={String(project.datasets)} />
        <ProjectMetric icon={FlaskConical} label="Experiments" value={String(project.experiments)} />
        <ProjectMetric icon={Lightbulb} label="Findings" value={String(project.findings)} />
        <ProjectMetric icon={FolderKanban} label="Estimated cost" value={project.cost} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Overview" description="Project activity and lifecycle state.">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem label="Owner" value={project.owner} />
            <InfoItem label="Status" value={project.status} />
            <InfoItem label="Token usage" value={project.tokens} />
            <InfoItem label="Created" value="Aug 04, 2026" />
            <InfoItem label="Last activity" value={project.lastActivity} />
            <InfoItem label="Access policy" value="Project members" />
          </div>
        </SectionCard>
        <SectionCard title="Recent errors" description="Operational events associated with this project.">
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="font-medium text-sm">Provider latency exceeded threshold</p>
              <p className="mt-1 text-muted-foreground text-xs">OpenAI · 42 min ago · automatically retried</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium text-sm">No unresolved errors</p>
              <p className="mt-1 text-muted-foreground text-xs">
                The latest project executions completed successfully.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Project activity"
        description="Datasets, experiments, findings, and usage remain visible to administrators but scientific content is read-only."
      >
        <div className="-mx-4 -mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>4 min ago</TableCell>
                <TableCell className="font-medium">Experiment EXP-2048 completed</TableCell>
                <TableCell>{project.owner}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                    Completed
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>18 min ago</TableCell>
                <TableCell className="font-medium">Dataset clinical-trial-v4.csv uploaded</TableCell>
                <TableCell>Noah Williams</TableCell>
                <TableCell>
                  <Badge variant="outline">Processed</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>46 min ago</TableCell>
                <TableCell className="font-medium">Finding FND-881 generated</TableCell>
                <TableCell>Finding Agent</TableCell>
                <TableCell>
                  <Badge variant="outline">Reviewed</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

function ProjectMetric({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="mt-1 font-heading text-xl tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium text-sm">{value}</p>
    </div>
  );
}
