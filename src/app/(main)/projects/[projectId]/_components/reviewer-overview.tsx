"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useReviewWorkspaceQuery } from "@/hooks/use-review-workspace-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { researchRunUrl } from "@/lib/research-workspace";
import { RunStatus } from "@/types/enums";

import { ListState } from "./workspace-ui";

export function ReviewerOverview({ project }: { project: ProjectItem }) {
  const query = useReviewWorkspaceQuery(project.id, true);
  const completed = query.data?.runs.filter((run) => run.status === RunStatus.Completed) ?? [];
  const artifacts = query.data?.artifacts.slice(0, 10) ?? [];
  const comments = query.data?.comments.filter((comment) => !comment.deleted).slice(0, 10) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="break-words font-heading text-3xl tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground text-sm">Read research results and discuss findings with the team.</p>
        <Button asChild variant="outline" className="self-start">
          <Link prefetch={false} href="/reviews">
            All review projects
          </Link>
        </Button>
        <Button
          variant="outline"
          className="self-start"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh overview
        </Button>
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Completed runs</CardTitle>
            <CardDescription>Research results ready to read.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ListState
              pending={query.isPending}
              failed={query.isError}
              empty={!completed.length}
              title="Completed runs"
              retry={query.refetch}
            />
            {completed.slice(0, 10).map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm">Run {run.id.slice(0, 8)}</p>
                  <p className="text-muted-foreground text-xs">
                    {run.finished_at ? new Date(run.finished_at).toLocaleString() : "Completion time unavailable"}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link prefetch={false} href={researchRunUrl(project.id, run.id, "artifacts")}>
                    Read results
                  </Link>
                </Button>
              </div>
            ))}
            {completed.length > 10 && (
              <Button asChild variant="outline">
                <Link prefetch={false} href="/reviews">
                  View all results
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest artifacts</CardTitle>
            <CardDescription>Recent reports, figures and result files.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ListState
              pending={query.isPending}
              failed={query.isError}
              empty={!artifacts.length}
              title="Artifacts"
              retry={query.refetch}
            />
            {artifacts.map((artifact) => (
              <Link
                key={artifact.id}
                className="break-words text-sm underline underline-offset-4"
                href={researchRunUrl(project.id, artifact.run_id, "artifacts")}
              >
                {artifact.filename}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent discussion</CardTitle>
          <CardDescription>The latest comments across this project.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListState
            pending={query.isPending}
            failed={query.isError}
            empty={!comments.length}
            title="Discussion"
            retry={query.refetch}
          />
          {comments.map((comment) => (
            <div key={comment.id} className="flex min-w-0 flex-col gap-1 border-b pb-3">
              <p className="text-muted-foreground text-xs">
                {comment.author_display_name || "Project member"} · {new Date(comment.created_at).toLocaleString()}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>
              <Link
                className="text-sm underline underline-offset-4"
                href={researchRunUrl(project.id, comment.run_id, "comments")}
              >
                Open discussion
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
