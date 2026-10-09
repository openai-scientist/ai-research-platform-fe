import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { RunSection } from "@/lib/research-workspace";
import { getAuthenticatedUser } from "@/server/auth";
import { getWorkspaceProject } from "@/server/projects";

import { WorkspaceSection } from "./workspace-section";

export async function ExperimentPage({
  projectId,
  runId,
  section,
}: {
  projectId: string;
  runId: string;
  section?: RunSection;
}) {
  const user = await getAuthenticatedUser(projectId);
  if (!user) redirect("/auth/login");
  const project = await getWorkspaceProject(projectId);
  if (!project) notFound();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink asChild>
                <Link
                  prefetch={false}
                  href={`/projects/${projectId}`}
                  className="max-w-32 truncate py-1.5 sm:max-w-64"
                  title={project.name}
                >
                  {project.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link prefetch={false} href={`/projects/${projectId}/experiments`} className="py-1.5">
                  Research flow
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="break-words font-heading text-3xl tracking-tight">Run {runId.slice(0, 8)}</h1>
      </div>
      <WorkspaceSection project={project} section="run" userId={user.id} runId={runId} experimentSection={section} />
    </div>
  );
}
