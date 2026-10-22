"use client";

import { useState } from "react";

import Link from "next/link";

import { DataTable } from "@/components/data-table";
import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUserQuery } from "@/hooks/use-auth-query";
import { useReviewWorkspaceQuery } from "@/hooks/use-review-workspace-query";
import type { MembershipSummary } from "@/lib/auth/types";
import { researchRunUrl } from "@/lib/research-workspace";
import { ProjectRole, RunStatus } from "@/types/enums";

import { ListState } from "../../projects/[projectId]/_components/workspace-ui";

function ProjectReviews({ membership, from, to }: { membership: MembershipSummary; from: string; to: string }) {
  const query = useReviewWorkspaceQuery(membership.project_id);
  const [visible, setVisible] = useState(20);
  const artifacts = query.data?.artifacts ?? [];
  const rows = (query.data?.runs ?? [])
    .filter((run) => {
      if (run.status !== RunStatus.Completed && !artifacts.some((artifact) => artifact.run_id === run.id)) return false;
      if (!from && !to) return true;
      if (!run.finished_at) return false;
      const finished = new Date(run.finished_at).getTime();
      return (
        (!from || finished >= new Date(`${from}T00:00:00`).getTime()) &&
        (!to || finished <= new Date(`${to}T23:59:59.999`).getTime())
      );
    })
    .sort((a, b) => Date.parse(b.finished_at ?? b.updated_at) - Date.parse(a.finished_at ?? a.updated_at));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:grid">
        <CardTitle>
          <Link prefetch={false} href={`/projects/${membership.project_id}`}>
            {membership.project_name}
          </Link>
        </CardTitle>
        <CardDescription>
          {membership.archived ? "Archived project · " : ""}Completed runs and runs with available artifacts.
        </CardDescription>
        <CardAction>
          <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
            Refresh results
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListState
          pending={query.isPending}
          failed={query.isError}
          empty={!rows.length}
          title="Matching results"
          retry={query.refetch}
        />
        {!!rows.length && (
          <DataTable
            rows={rows.slice(0, visible)}
            getRowId={(run) => run.id}
            columns={[
              {
                id: "Run",
                label: "Run",
                hideable: false,
                cell: (run) => (
                  <Button asChild variant="link" className="px-0">
                    <Link
                      prefetch={false}
                      href={researchRunUrl(membership.project_id, run.id)}
                      title={run.id}
                      aria-label={`Open results for run ${run.id.slice(0, 8)}`}
                    >
                      {run.id.slice(0, 8)}
                    </Link>
                  </Button>
                ),
              },
              { id: "Status", label: "Status", cell: (run) => <ManagementStatusBadge status={run.status} /> },
              {
                id: "Completed",
                label: "Completed",
                cell: (run) => (run.finished_at ? new Date(run.finished_at).toLocaleString() : "Not finished"),
              },
              {
                id: "Artifacts",
                label: "Artifacts",
                cell: (run) => artifacts.filter((artifact) => artifact.run_id === run.id).length,
              },
              {
                id: "Actions",
                label: "Actions",
                cell: (run) => (
                  <Button asChild variant="outline">
                    <Link prefetch={false} href={researchRunUrl(membership.project_id, run.id)}>
                      Open results
                    </Link>
                  </Button>
                ),
              },
            ]}
          />
        )}
        {rows.length > visible && (
          <Button variant="outline" onClick={() => setVisible((value) => value + 20)}>
            Show more results
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ReviewQueue() {
  const user = useCurrentUserQuery();
  const memberships = user.data?.memberships.filter((membership) => membership.role === ProjectRole.Reviewer) ?? [];
  const [projectId, setProjectId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const selected = memberships.filter((membership) => projectId === "all" || membership.project_id === projectId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight">Review queue</h1>
        <p className="text-muted-foreground text-sm">Read results and share feedback across your reviewer projects.</p>
      </div>
      <FieldGroup className="lg:flex-row lg:items-end">
        <Field className="min-w-0">
          <FieldLabel htmlFor="review-project">Project</FieldLabel>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="review-project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All reviewer projects</SelectItem>
                {memberships.map((membership) => (
                  <SelectItem key={membership.project_id} value={membership.project_id}>
                    {membership.project_name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor="review-from">Completed from</FieldLabel>
          <Input
            id="review-from"
            type="date"
            max={to || undefined}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor="review-to">Completed through</FieldLabel>
          <Input
            id="review-to"
            type="date"
            min={from || undefined}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
        <Button
          variant="outline"
          onClick={() => {
            setProjectId("all");
            setFrom("");
            setTo("");
          }}
        >
          Clear filters
        </Button>
      </FieldGroup>
      <ListState
        pending={user.isPending}
        failed={user.isError}
        empty={!selected.length}
        title="Reviewer projects"
        retry={user.refetch}
      />
      {selected.map((membership) => (
        <ProjectReviews key={`${membership.project_id}:${from}:${to}`} membership={membership} from={from} to={to} />
      ))}
    </div>
  );
}
