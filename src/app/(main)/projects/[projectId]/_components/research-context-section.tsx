"use client";

import { useSearchParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useResearchContextQuery, useResearchContextVersionQuery } from "@/hooks/use-research-context-query";
import { ApiError } from "@/types/api";

import { ContextEditor } from "./context-editor";
import { ContextHistory, ContextSnapshot } from "./context-history";
import { ExperimentTabs } from "./experiment-tabs";
import { ListState, type WorkspaceProps } from "./workspace-ui";

export function ResearchContextSection({
  project,
  canWrite,
  section = "current",
  embedded = false,
}: WorkspaceProps & { section?: "current" | "history"; embedded?: boolean }) {
  const activeSection = embedded ? "current" : section;
  const context = useResearchContextQuery(project.id);
  const params = useSearchParams();
  const version = embedded ? 0 : Number(params.get("version"));
  const historical = useResearchContextVersionQuery(project.id, version, {
    enabled: Number.isInteger(version) && version > 0,
  });
  const viewingVersion = Number.isInteger(version) && version > 0;
  const query = viewingVersion ? historical : context;
  const missing = query.error instanceof ApiError && query.error.code === "RESEARCH_CONTEXT_NOT_FOUND";
  const base = `/projects/${project.id}/experiments/context`;
  const content =
    activeSection === "history" ? (
      <ContextHistory projectId={project.id} />
    ) : (
      <div className="flex flex-col gap-4">
        <ListState
          pending={query.isPending}
          failed={query.isError && !missing}
          empty={false}
          title="Research context"
          retry={query.refetch}
        />
        {viewingVersion
          ? query.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Saved research context</CardTitle>
                </CardHeader>
                <CardContent>
                  <ContextSnapshot context={query.data.data} />
                </CardContent>
              </Card>
            )
          : !context.isPending && (
              <ContextEditor
                key={`${project.id}:${canWrite}`}
                projectId={project.id}
                embedded={embedded}
                context={context.data?.data ?? null}
                canWrite={canWrite && (!context.isError || missing)}
                reload={async () => {
                  const result = await context.refetch();
                  if (result.error instanceof ApiError && result.error.code === "RESEARCH_CONTEXT_NOT_FOUND")
                    return null;
                  return result.isError ? undefined : (result.data?.data ?? null);
                }}
              />
            )}
      </div>
    );
  if (embedded) return <div className="min-h-0 min-w-0 overflow-y-auto p-1">{content}</div>;
  return (
    <ExperimentTabs
      value={section}
      items={[
        {
          value: "current",
          label: viewingVersion ? `Version ${version}` : "Current version",
          href: viewingVersion ? `${base}?version=${version}` : base,
        },
        { value: "history", label: "History", href: `${base}/history` },
      ]}
    >
      {content}
    </ExperimentTabs>
  );
}
