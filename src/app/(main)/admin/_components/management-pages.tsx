import { MoreHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { projects } from "./admin-data";
import { AdminPageHeader, SectionCard, StatusBadge } from "./admin-primitives";

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function TableToolbar({ placeholder }: { readonly placeholder: string }) {
  return (
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder={placeholder} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline">
          Role: All
        </Button>
        <Button size="sm" variant="outline">
          Status: All
        </Button>
        <Button size="sm" variant="outline">
          Last active
        </Button>
      </div>
    </div>
  );
}

function SummaryStat({
  detail,
  label,
  value,
}: {
  readonly detail: string;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-2 font-heading text-2xl tabular-nums">{value}</p>
      <p className="mt-1 text-muted-foreground text-xs">{detail}</p>
    </div>
  );
}

export function AdminProjects() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Management"
        title="Projects"
        description="Review every research workspace, its activity, usage, and lifecycle status."
        actions={
          <Button size="sm">
            <Plus data-icon="inline-start" />
            Create project
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Total projects" value="126" detail="all workspaces" />
        <SummaryStat label="Active projects" value="94" detail="74.6% of total" />
        <SummaryStat label="Archived projects" value="32" detail="retained for audit" />
        <SummaryStat label="Created this month" value="18" detail="+12.5% vs August" />
      </div>

      <SectionCard
        title="Project directory"
        description="Admin oversight for project ownership, execution, findings, and cost."
      >
        <div className="-mx-4 -mt-4">
          <TableToolbar placeholder="Search projects..." />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Datasets</TableHead>
                <TableHead>Experiments</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.name}>
                  <TableCell className="font-medium">
                    <Link className="hover:underline" href={`/admin/projects/${toSlug(project.name)}`}>
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell>{project.owner}</TableCell>
                  <TableCell>{project.members}</TableCell>
                  <TableCell>{project.datasets}</TableCell>
                  <TableCell>{project.experiments}</TableCell>
                  <TableCell>{project.findings}</TableCell>
                  <TableCell className="tabular-nums">{project.tokens}</TableCell>
                  <TableCell className="tabular-nums">{project.cost}</TableCell>
                  <TableCell className="text-muted-foreground">{project.lastActivity}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        project.status === "Active"
                          ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }
                    >
                      {project.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <p className="text-muted-foreground text-xs">
        Scientific results, statistical results, finding content, and evidence decisions are read-only for
        administrators.
      </p>
    </div>
  );
}
