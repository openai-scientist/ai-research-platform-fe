import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ArrowLeft, Database, FlaskConical, Lightbulb, type LucideIcon, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { findProjectForUser } from "@/lib/projects/project-data";
import { getAuthenticatedUser } from "@/server/auth";

const sections: Record<string, { title: string; description: string; icon: LucideIcon; managerOnly?: boolean }> = {
  datasets: {
    title: "Datasets",
    description: "Upload, version, and preview the data used by this project's experiments.",
    icon: Database,
  },
  experiments: {
    title: "Experiments",
    description: "Configure agent pipelines, run them against datasets, and compare results.",
    icon: FlaskConical,
  },
  findings: {
    title: "Findings",
    description: "Review insights generated from experiments and send them for peer review.",
    icon: Lightbulb,
  },
  members: {
    title: "Members",
    description: "See who has access to this workspace and what role they play.",
    icon: Users,
  },
  settings: {
    title: "Settings",
    description: "Rename, archive, or configure budgets and providers for this project.",
    icon: Settings,
    managerOnly: true,
  },
};

export default async function Page({ params }: { params: Promise<{ projectId: string; section: string }> }) {
  const { projectId, section } = await params;
  const user = await getAuthenticatedUser(projectId);

  if (!user) {
    redirect("/auth/login");
  }

  const project = findProjectForUser(projectId, user.email);
  const config = Object.hasOwn(sections, section) ? sections[section] : undefined;

  if (!project || !config) {
    notFound();
  }

  if (config.managerOnly && user.role !== "PROJECT_MANAGER" && user.role !== "SYSTEM_ADMIN") {
    redirect(`/projects/${project.id}`);
  }

  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">{project.name}</p>
        <h1 className="font-heading text-3xl tracking-tight">{config.title}</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">{config.description}</p>
      </div>
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>{config.title} is coming soon</EmptyTitle>
          <EmptyDescription>This section of the workspace has not been built yet.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link prefetch={false} href={`/projects/${project.id}`}>
              <ArrowLeft data-icon="inline-start" />
              Back to overview
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
